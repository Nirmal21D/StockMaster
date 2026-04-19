import fs from 'fs';
import path from 'path';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface PageRouteEntry {
  type: 'page';
  path: string;
  file: string;
  dynamic: boolean;
}

export interface ApiRouteEntry {
  type: 'api';
  path: string;
  file: string;
  dynamic: boolean;
  methods: HttpMethod[];
}

export interface RouteManifest {
  generatedAt: string;
  source: string;
  totals: {
    pages: number;
    apis: number;
  };
  pageRoutes: PageRouteEntry[];
  apiRoutes: ApiRouteEntry[];
}

const METHOD_ORDER: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

function walkDir(dirPath: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

function normalizeSegment(segment: string): string {
  if (!segment) return '';

  if (segment.startsWith('(') && segment.endsWith(')')) {
    return '';
  }

  const optionalCatchAll = segment.match(/^\[\[\.\.\.(.+)\]\]$/);
  if (optionalCatchAll) {
    return `:${optionalCatchAll[1]}*`;
  }

  const catchAll = segment.match(/^\[\.\.\.(.+)\]$/);
  if (catchAll) {
    return `:${catchAll[1]}*`;
  }

  const dynamic = segment.match(/^\[(.+)\]$/);
  if (dynamic) {
    return `:${dynamic[1]}`;
  }

  return segment;
}

function fileToRoutePath(appDir: string, filePath: string): string {
  const relativeDir = path.dirname(path.relative(appDir, filePath));
  const rawSegments = relativeDir === '.' ? [] : relativeDir.split(path.sep);
  const segments = rawSegments
    .map(normalizeSegment)
    .filter(Boolean);

  const routePath = `/${segments.join('/')}`.replace(/\/+/g, '/');
  return routePath === '/' ? '/' : routePath.replace(/\/$/, '');
}

function toWorkspaceRelative(filePath: string): string {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

function isDynamic(pathname: string): boolean {
  return pathname.includes(':');
}

function extractMethods(filePath: string): HttpMethod[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g;
  const found = new Set<HttpMethod>();

  for (const match of content.matchAll(regex)) {
    found.add(match[1] as HttpMethod);
  }

  return METHOD_ORDER.filter((method) => found.has(method));
}

export function discoverRoutes(appDir = path.resolve(process.cwd(), 'app')): RouteManifest {
  const files = walkDir(appDir);

  const pageRoutes: PageRouteEntry[] = [];
  const apiRoutes: ApiRouteEntry[] = [];

  for (const filePath of files) {
    const baseName = path.basename(filePath);

    if (baseName === 'page.tsx') {
      const routePath = fileToRoutePath(appDir, filePath);
      pageRoutes.push({
        type: 'page',
        path: routePath,
        file: toWorkspaceRelative(filePath),
        dynamic: isDynamic(routePath),
      });
    }

    if (baseName === 'route.ts') {
      const routePath = fileToRoutePath(appDir, filePath);
      apiRoutes.push({
        type: 'api',
        path: routePath,
        file: toWorkspaceRelative(filePath),
        dynamic: isDynamic(routePath),
        methods: extractMethods(filePath),
      });
    }
  }

  pageRoutes.sort((a, b) => a.path.localeCompare(b.path));
  apiRoutes.sort((a, b) => a.path.localeCompare(b.path));

  return {
    generatedAt: new Date().toISOString(),
    source: 'scripts/utils/route-manifest.ts',
    totals: {
      pages: pageRoutes.length,
      apis: apiRoutes.length,
    },
    pageRoutes,
    apiRoutes,
  };
}

export function writeManifest(manifest: RouteManifest, outputPath: string): void {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
}

export function resolveDynamicPath(routePath: string, values: Record<string, string> = {}): string {
  return routePath.replace(/:([a-zA-Z0-9_]+)\*?/g, (_full, name: string) => {
    const value = values[name] || `test-${name}`;
    return encodeURIComponent(value);
  });
}
