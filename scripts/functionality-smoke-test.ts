import fs from 'fs';
import path from 'path';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface CheckResult {
  name: string;
  method: Method;
  path: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  httpStatus?: number;
  durationMs?: number;
  reason?: string;
}

interface RequestConfig {
  method: Method;
  path: string;
  body?: unknown;
}

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || '12000');
const SESSION_COOKIE = process.env.SESSION_COOKIE || '';
const RUN_MUTATION_TESTS = process.env.RUN_MUTATION_TESTS === 'true';

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

function cookieHeaderValue(rawValue: string): string {
  if (!rawValue) return '';
  return rawValue.includes('=') ? rawValue : `session=${rawValue}`;
}

function missingEnv(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]);
}

async function requestJson(config: RequestConfig): Promise<{ status: number; body: any; durationMs: number }> {
  const headers: Record<string, string> = {};
  const cookie = cookieHeaderValue(SESSION_COOKIE);

  if (cookie) {
    headers.Cookie = cookie;
  }

  if (config.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${BASE_URL}${config.path}`, {
      method: config.method,
      headers,
      body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
      signal: controller.signal,
      redirect: 'manual',
    });

    let body: any = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    return {
      status: response.status,
      body,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

function passIfNotServerError(httpStatus: number): boolean {
  return httpStatus < 500;
}

async function runReadChecks(): Promise<CheckResult[]> {
  const checks: Array<{ name: string; path: string; envRequired?: string[] }> = [
    { name: 'Auth session check', path: '/api/auth/me' },
    { name: 'Dashboard summary', path: '/api/dashboard' },
    { name: 'Dashboard cards', path: '/api/dashboard/summary' },
    { name: 'Products listing', path: '/api/products?limit=10' },
    { name: 'Warehouses listing', path: '/api/warehouses' },
    { name: 'Locations listing', path: '/api/locations' },
    { name: 'Requisitions listing', path: '/api/requisitions' },
    { name: 'Transfers listing', path: '/api/transfers' },
    { name: 'Receipts listing', path: '/api/receipts' },
    { name: 'Deliveries listing', path: '/api/deliveries' },
    { name: 'Ledger listing', path: '/api/ledger?limit=20' },
    { name: 'Analytics dashboard', path: '/api/analytics/dashboard' },
    { name: 'Analytics low stock', path: '/api/analytics/low-stock' },
    { name: 'Analytics slow stock', path: '/api/analytics/slow-stock' },
    { name: 'Analytics best source', path: '/api/analytics/best-source' },
    { name: 'Analytics stock health', path: '/api/analytics/stock-health' },
    { name: 'Analytics stockouts', path: '/api/analytics/stockouts' },
    {
      name: 'Stock by product/warehouse',
      path: `/api/stock?productId=${process.env.STOCK_PRODUCT_ID || ''}&warehouseId=${process.env.STOCK_WAREHOUSE_ID || ''}`,
      envRequired: ['STOCK_PRODUCT_ID', 'STOCK_WAREHOUSE_ID'],
    },
  ];

  const results: CheckResult[] = [];

  for (const check of checks) {
    if (check.envRequired) {
      const missing = missingEnv(check.envRequired);
      if (missing.length > 0) {
        results.push({
          name: check.name,
          method: 'GET',
          path: check.path,
          status: 'SKIP',
          reason: `Missing env: ${missing.join(', ')}`,
        });
        continue;
      }
    }

    try {
      const response = await requestJson({ method: 'GET', path: check.path });
      results.push({
        name: check.name,
        method: 'GET',
        path: check.path,
        status: passIfNotServerError(response.status) ? 'PASS' : 'FAIL',
        httpStatus: response.status,
        durationMs: response.durationMs,
        reason: response.status >= 500 ? 'Server returned 5xx' : undefined,
      });
    } catch (error: any) {
      results.push({
        name: check.name,
        method: 'GET',
        path: check.path,
        status: 'FAIL',
        reason: error?.name === 'AbortError' ? `Timeout after ${REQUEST_TIMEOUT_MS}ms` : formatFetchError(error),
      });
    }
  }

  return results;
}

async function runProductMutationWorkflow(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  if (!RUN_MUTATION_TESTS) {
    results.push({
      name: 'Product CRUD workflow',
      method: 'POST',
      path: '/api/products',
      status: 'SKIP',
      reason: 'Set RUN_MUTATION_TESTS=true to enable mutation workflow',
    });
    return results;
  }

  if (!SESSION_COOKIE) {
    results.push({
      name: 'Product CRUD workflow',
      method: 'POST',
      path: '/api/products',
      status: 'SKIP',
      reason: 'SESSION_COOKIE is required for mutation workflow',
    });
    return results;
  }

  const suffix = `${Date.now()}`;
  const sku = `SMOKE-${suffix.slice(-8)}`;
  const productPayload = {
    name: `Smoke Product ${suffix}`,
    sku,
    category: 'SMOKE-TEST',
    unit: 'pcs',
    price: 1,
    reorderLevel: 1,
    abcClass: 'C',
    description: 'Temporary product from functionality smoke test',
    isActive: true,
  };

  let productId = '';

  try {
    const created = await requestJson({
      method: 'POST',
      path: '/api/products',
      body: productPayload,
    });

    if (created.status === 401 || created.status === 403) {
      results.push({
        name: 'Create product',
        method: 'POST',
        path: '/api/products',
        status: 'SKIP',
        httpStatus: created.status,
        durationMs: created.durationMs,
        reason: 'Authenticated user does not have permission for product mutations',
      });
      return results;
    }

    productId = created.body?.id || created.body?._id || '';

    results.push({
      name: 'Create product',
      method: 'POST',
      path: '/api/products',
      status: created.status === 201 && Boolean(productId) ? 'PASS' : 'FAIL',
      httpStatus: created.status,
      durationMs: created.durationMs,
      reason: created.status !== 201 ? 'Expected HTTP 201' : !productId ? 'Response missing product id' : undefined,
    });

    if (!productId) {
      return results;
    }

    const read = await requestJson({ method: 'GET', path: `/api/products/${productId}` });
    results.push({
      name: 'Read created product',
      method: 'GET',
      path: `/api/products/${productId}`,
      status: read.status === 200 ? 'PASS' : 'FAIL',
      httpStatus: read.status,
      durationMs: read.durationMs,
      reason: read.status !== 200 ? 'Expected HTTP 200' : undefined,
    });

    const updated = await requestJson({
      method: 'PUT',
      path: `/api/products/${productId}`,
      body: {
        description: `Updated by smoke test at ${new Date().toISOString()}`,
        price: 2,
      },
    });

    results.push({
      name: 'Update created product',
      method: 'PUT',
      path: `/api/products/${productId}`,
      status: updated.status === 200 ? 'PASS' : 'FAIL',
      httpStatus: updated.status,
      durationMs: updated.durationMs,
      reason: updated.status !== 200 ? 'Expected HTTP 200' : undefined,
    });

    const removed = await requestJson({
      method: 'DELETE',
      path: `/api/products/${productId}`,
    });

    results.push({
      name: 'Deactivate created product',
      method: 'DELETE',
      path: `/api/products/${productId}`,
      status: removed.status === 200 ? 'PASS' : 'FAIL',
      httpStatus: removed.status,
      durationMs: removed.durationMs,
      reason: removed.status !== 200 ? 'Expected HTTP 200' : undefined,
    });
  } catch (error: any) {
    results.push({
      name: 'Product CRUD workflow',
      method: 'POST',
      path: '/api/products',
      status: 'FAIL',
      reason: formatFetchError(error),
    });
  }

  return results;
}

async function main() {
  await assertBaseUrlReachable();
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Mutation workflow: ${RUN_MUTATION_TESTS ? 'enabled' : 'disabled'}`);
  console.log('');

  const readResults = await runReadChecks();
  const mutationResults = await runProductMutationWorkflow();
  const results = [...readResults, ...mutationResults];

  for (const result of results) {
    const marker = result.status === 'PASS' ? 'PASS' : result.status === 'FAIL' ? 'FAIL' : 'SKIP';
    const statusPart = result.httpStatus ? ` (${result.httpStatus})` : '';
    const reasonPart = result.reason ? ` - ${result.reason}` : '';
    console.log(`[${marker}] ${result.name}${statusPart}${reasonPart}`);
  }

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === 'PASS').length,
    fail: results.filter((r) => r.status === 'FAIL').length,
    skip: results.filter((r) => r.status === 'SKIP').length,
  };

  const reportDir = path.resolve(process.cwd(), 'scripts', 'reports');
  const reportPath = path.join(reportDir, 'functionality-smoke-report.json');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        options: {
          runMutationTests: RUN_MUTATION_TESTS,
          timeoutMs: REQUEST_TIMEOUT_MS,
        },
        summary,
        results,
      },
      null,
      2
    )
  );

  console.log('');
  console.log(`Summary: ${summary.pass} pass, ${summary.fail} fail, ${summary.skip} skip, ${summary.total} total`);
  console.log(`Report: ${path.relative(process.cwd(), reportPath).split(path.sep).join('/')}`);

  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Functionality smoke test crashed:', error);
  process.exit(1);
});
