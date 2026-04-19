import fs from 'fs';
import path from 'path';
import {
  discoverRoutes,
  HttpMethod,
  resolveDynamicPath,
} from './utils/route-manifest';

interface TestResult {
  kind: 'page' | 'api';
  method: HttpMethod | 'GET';
  route: string;
  url: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  httpStatus?: number;
  durationMs?: number;
  reason?: string;
}

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const INCLUDE_DYNAMIC = process.env.INCLUDE_DYNAMIC !== 'false';
const RUN_MUTATION_TESTS = process.env.RUN_MUTATION_TESTS === 'true';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || '12000');
const REQUEST_RETRIES = Math.max(0, Number(process.env.REQUEST_RETRIES || '1'));
const SESSION_COOKIE = process.env.SESSION_COOKIE || '';

const SAFE_METHODS = new Set<HttpMethod>(['GET', 'HEAD', 'OPTIONS']);
const METHODS_THAT_NEED_BODY = new Set<HttpMethod>(['POST', 'PUT', 'PATCH']);

function formatFetchError(error: any): string {
  const baseMessage = String(error?.message || error || 'Unknown error');
  const cause = error?.cause;

  if (!cause) {
    return baseMessage;
  }

  const parts = [
    cause?.code,
    cause?.errno,
    cause?.syscall,
    cause?.address && cause?.port ? `${cause.address}:${cause.port}` : cause?.address,
    cause?.message,
  ].filter(Boolean);

  if (parts.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} (${parts.join(' | ')})`;
}

async function assertBaseUrlReachable(): Promise<void> {
  const controller = new AbortController();
  const preflightTimeoutMs = Math.min(REQUEST_TIMEOUT_MS, 5000);
  const timer = setTimeout(() => controller.abort(), preflightTimeoutMs);

  try {
    const response = await fetch(`${BASE_URL}/`, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'manual',
    });

    console.log(`Preflight: ${BASE_URL}/ -> ${response.status}`);
  } catch (error: any) {
    console.error(`Cannot reach BASE_URL: ${BASE_URL}`);
    console.error(`Reason: ${formatFetchError(error)}`);
    console.error('Start Next.js in another terminal with "npm run dev", or set BASE_URL to an active environment.');
    process.exit(2);
  } finally {
    clearTimeout(timer);
  }
}

function parseRouteParams(input?: string): Record<string, string> {
  if (!input) return {};

  const pairs = input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const result: Record<string, string> = {};
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  }

  return result;
}

function buildCookieHeader(rawValue: string): string {
  if (!rawValue) return '';
  return rawValue.includes('=') ? rawValue : `session=${rawValue}`;
}

function getRequestBody(route: string, method: HttpMethod): string | undefined {
  if (!METHODS_THAT_NEED_BODY.has(method)) return undefined;

  // Send a minimal payload for endpoint reachability checks.
  return JSON.stringify({
    _routeSmokeTest: true,
    route,
    timestamp: new Date().toISOString(),
  });
}

async function runRequest(url: string, method: HttpMethod | 'GET', route: string, kind: 'page' | 'api'): Promise<TestResult> {
  const headers: HeadersInit = {};
  const cookieValue = buildCookieHeader(SESSION_COOKIE);

  if (cookieValue) {
    headers.Cookie = cookieValue;
  }

  if (METHODS_THAT_NEED_BODY.has(method as HttpMethod)) {
    headers['Content-Type'] = 'application/json';
  }

  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: getRequestBody(route, method as HttpMethod),
        signal: controller.signal,
        redirect: 'manual',
      });

      const durationMs = Date.now() - startedAt;
      const isPass = response.status < 500;

      return {
        kind,
        method,
        route,
        url,
        status: isPass ? 'PASS' : 'FAIL',
        httpStatus: response.status,
        durationMs,
        reason: isPass ? undefined : 'Received server error response',
      };
    } catch (error: any) {
      const durationMs = Date.now() - startedAt;
      const isTransient = error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('fetch failed');

      if (isTransient && attempt < REQUEST_RETRIES) {
        continue;
      }

      const attempts = attempt + 1;
      return {
        kind,
        method,
        route,
        url,
        status: 'FAIL',
        durationMs,
        reason:
          error?.name === 'AbortError'
            ? `Timeout after ${REQUEST_TIMEOUT_MS}ms (${attempts} attempt${attempts > 1 ? 's' : ''})`
            : `${formatFetchError(error)} (${attempts} attempt${attempts > 1 ? 's' : ''})`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    kind,
    method,
    route,
    url,
    status: 'FAIL',
    reason: 'Unknown request failure',
  };
}

function shouldSkipMutatingRoute(route: string, method: HttpMethod): string | null {
  if (!METHODS_THAT_NEED_BODY.has(method) && method !== 'DELETE') {
    return null;
  }

  if (!RUN_MUTATION_TESTS) {
    return 'Mutating method skipped (set RUN_MUTATION_TESTS=true to enable)';
  }

  if (route === '/api/auth/session' && method === 'DELETE') {
    return 'Skipped to avoid invalidating active session cookie during test run';
  }

  return null;
}

async function main() {
  const routeParams = parseRouteParams(process.env.ROUTE_PARAMS);
  await assertBaseUrlReachable();
  const manifest = discoverRoutes();
  const results: TestResult[] = [];

  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Total page routes: ${manifest.pageRoutes.length}`);
  console.log(`Total API routes: ${manifest.apiRoutes.length}`);
  console.log(`Dynamic routes: ${INCLUDE_DYNAMIC ? 'included' : 'skipped'}`);
  console.log(`Mutation routes: ${RUN_MUTATION_TESTS ? 'enabled' : 'skipped'}`);
  console.log(`Retries for transient failures: ${REQUEST_RETRIES}`);
  console.log('');

  for (const pageRoute of manifest.pageRoutes) {
    if (pageRoute.dynamic && !INCLUDE_DYNAMIC) {
      results.push({
        kind: 'page',
        method: 'GET',
        route: pageRoute.path,
        url: `${BASE_URL}${pageRoute.path}`,
        status: 'SKIP',
        reason: 'Dynamic page route skipped',
      });
      continue;
    }

    const resolvedPath = resolveDynamicPath(pageRoute.path, routeParams);
    const url = `${BASE_URL}${resolvedPath}`;
    results.push(await runRequest(url, 'GET', pageRoute.path, 'page'));
  }

  for (const apiRoute of manifest.apiRoutes) {
    if (apiRoute.dynamic && !INCLUDE_DYNAMIC) {
      results.push({
        kind: 'api',
        method: 'GET',
        route: apiRoute.path,
        url: `${BASE_URL}${apiRoute.path}`,
        status: 'SKIP',
        reason: 'Dynamic API route skipped',
      });
      continue;
    }

    const methods = apiRoute.methods.length > 0 ? apiRoute.methods : ['GET'];

    for (const method of methods) {
      const httpMethod = method as HttpMethod;
      if (!SAFE_METHODS.has(httpMethod)) {
        const reason = shouldSkipMutatingRoute(apiRoute.path, httpMethod);
        if (reason) {
          results.push({
            kind: 'api',
            method: httpMethod,
            route: apiRoute.path,
            url: `${BASE_URL}${apiRoute.path}`,
            status: 'SKIP',
            reason,
          });
          continue;
        }
      }

      const resolvedPath = resolveDynamicPath(apiRoute.path, routeParams);
      const url = `${BASE_URL}${resolvedPath}`;
      results.push(await runRequest(url, httpMethod, apiRoute.path, 'api'));
    }
  }

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === 'PASS').length,
    fail: results.filter((r) => r.status === 'FAIL').length,
    skip: results.filter((r) => r.status === 'SKIP').length,
  };

  const reportDir = path.resolve(process.cwd(), 'scripts', 'reports');
  const reportPath = path.join(reportDir, 'route-smoke-report.json');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        options: {
          includeDynamic: INCLUDE_DYNAMIC,
          runMutationTests: RUN_MUTATION_TESTS,
          timeoutMs: REQUEST_TIMEOUT_MS,
          retries: REQUEST_RETRIES,
          routeParams,
        },
        summary,
        results,
      },
      null,
      2
    )
  );

  for (const result of results) {
    const marker = result.status === 'PASS' ? 'PASS' : result.status === 'FAIL' ? 'FAIL' : 'SKIP';
    const statusPart = result.httpStatus ? ` (${result.httpStatus})` : '';
    const reasonPart = result.reason ? ` - ${result.reason}` : '';
    console.log(`[${marker}] ${result.method} ${result.route}${statusPart}${reasonPart}`);
  }

  console.log('');
  console.log(`Summary: ${summary.pass} pass, ${summary.fail} fail, ${summary.skip} skip, ${summary.total} total`);
  console.log(`Report: ${path.relative(process.cwd(), reportPath).split(path.sep).join('/')}`);

  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Route smoke test failed to run:', error);
  process.exit(1);
});
