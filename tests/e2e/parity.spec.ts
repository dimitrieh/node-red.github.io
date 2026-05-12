import { test, expect, request as pwRequest } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

/**
 * URL parity sanity check. Reads /tmp/old-urls.txt (produced by
 * scripts/audit-urls.ts) and fetches each URL through Playwright's
 * APIRequestContext. Fails ONLY when the broken-URL count exceeds a
 * known-acceptable threshold (the old JSDoc /docs/api/modules/v/* tree
 * which is intentionally retired).
 */

const OLD_URLS_FILE = '/tmp/old-urls.txt';

test.skip(!existsSync(OLD_URLS_FILE), `Missing ${OLD_URLS_FILE} — run scripts/audit-urls.ts first.`);

test('URL parity against pre-refactor Jekyll source', async () => {
  const urls = readFileSync(OLD_URLS_FILE, 'utf-8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const ctx = await pwRequest.newContext({ baseURL: 'http://localhost:4321' });
  const broken: string[] = [];
  const empty: string[] = [];
  const knownRetired = (u: string) => u.startsWith('/docs/api/modules/v/');

  const CONCURRENCY = 10;
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= urls.length) return;
      const url = urls[idx];
      const resp = await ctx.get(url);
      if (resp.status() === 404) {
        if (!knownRetired(url)) broken.push(url);
      } else if (resp.status() < 400) {
        const body = await resp.text();
        const hasContent = /<main[\s>]/i.test(body) || /<article[\s>]/i.test(body) || /<\?xml/.test(body);
        if (!hasContent && body.length < 1000) empty.push(`${url} (${body.length}b)`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await ctx.dispose();

  // Hard fail only on UNEXPECTED 404s. The JSDoc modules tree is excluded.
  expect(broken, `Unexpected 404s vs old Jekyll source: ${broken.join('\n')}`).toEqual([]);
  // Soft warn for empties (printed but does not fail the suite)
  if (empty.length) console.log('EMPTY pages flagged:', empty);
});

test('intentionally-retired URLs (modules JSDoc tree) all 404', async () => {
  const ctx = await pwRequest.newContext({ baseURL: 'http://localhost:4321' });
  const samples = [
    '/docs/api/modules/v/0.20.0-beta.2/',
    '/docs/api/modules/v/0.20.0-beta.2/@node-red_runtime.html',
    '/docs/api/modules/v/1.3/',
    '/docs/api/modules/v/1.3/node-red.html',
  ];
  for (const u of samples) {
    const r = await ctx.get(u);
    expect(r.status(), `${u} expected 404`).toBe(404);
  }
  await ctx.dispose();
});
