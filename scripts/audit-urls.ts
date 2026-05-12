/* eslint-disable no-console */
/**
 * URL parity audit. Reads old Jekyll source file list, derives the
 * published URL for each via Jekyll's conventions, fetches each against
 * the local Astro preview, and writes a CSV result to docs/audit-qa-urls.csv.
 *
 * Jekyll rules used:
 *   _posts/YYYY-MM-DD-slug.md  -> /blog/YYYY/MM/DD/slug/
 *   {folder}/index.{md,html}   -> /{folder}/
 *   {folder}/file.md           -> /{folder}/file/
 *   index.html (root)          -> /
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = process.env.AUDIT_BASE_URL ?? 'http://localhost:4321';
const OLD_FILES = process.env.OLD_FILES ?? '/tmp/old-files.txt';
const OUT_URLS = process.env.OUT_URLS ?? '/tmp/old-urls.txt';
const OUT_CSV =
  process.env.OUT_CSV ??
  resolve(
    new URL('.', import.meta.url).pathname,
    '..',
    'docs/audit-qa-urls.csv'
  );

function deriveUrl(file: string): string | null {
  // Root index file
  if (file === 'index.html' || file === 'index.md') return '/';

  // Blog posts
  if (file.startsWith('_posts/')) {
    const base = file.replace(/^_posts\//, '').replace(/\.(md|html)$/, '');
    const m = base.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
    if (!m) return null;
    // jekyll permalink: /blog/:year/:month/:day/:title (no trailing slash on live)
    return `/blog/${m[1]}/${m[2]}/${m[3]}/${m[4]}/`;
  }

  // Markdown -> pretty URL (folder/index style is implicit via Jekyll)
  if (file.endsWith('.md')) {
    const noExt = file.replace(/\.md$/, '');
    if (noExt.endsWith('/index')) {
      return '/' + noExt.replace(/\/index$/, '') + '/';
    }
    return '/' + noExt + '/';
  }

  // .html files: Jekyll preserves the path as-is, EXCEPT that
  // path/index.html -> /path/
  if (file.endsWith('/index.html')) {
    return '/' + file.replace(/\/index\.html$/, '') + '/';
  }
  // Other .html — keep as a real .html file URL (JSDoc trees etc.)
  return '/' + file;
}

async function fetchWithTimeout(url: string, ms = 10000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { redirect: 'manual', signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

function hasContent(html: string): {
  hasMain: boolean;
  hasH1: boolean;
  hasArticle: boolean;
} {
  const hasMain = /<main[\s>][\s\S]*?<\/main>/i.test(html);
  const hasH1 = /<h1[\s>][\s\S]*?<\/h1>/i.test(html);
  const hasArticle = /<article[\s>][\s\S]*?<\/article>/i.test(html);
  return { hasMain, hasH1, hasArticle };
}

interface Row {
  source: string;
  url: string;
  status: number | string;
  finalUrl: string;
  bytes: number;
  hasMain: boolean;
  hasH1: boolean;
  hasArticle: boolean;
  verdict: 'OK' | '404' | 'REDIRECTED' | 'EMPTY' | 'ERROR' | 'OTHER';
  note: string;
}

function csvEscape(v: unknown): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function main() {
  const sourceFiles = readFileSync(OLD_FILES, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const urlMap = new Map<string, string>(); // url -> source file
  for (const f of sourceFiles) {
    const u = deriveUrl(f);
    if (!u) continue;
    if (!urlMap.has(u)) urlMap.set(u, f);
  }
  const urls = [...urlMap.keys()].sort();
  writeFileSync(OUT_URLS, urls.join('\n') + '\n');
  console.log(`Derived ${urls.length} unique URLs from ${sourceFiles.length} files.`);

  const rows: Row[] = [];
  const CONCURRENCY = 12;
  let idx = 0;
  let okCount = 0;
  let notFound = 0;
  let redirected = 0;
  let empty = 0;
  let other = 0;
  let err = 0;

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= urls.length) break;
      const url = urls[i];
      if (url === undefined) continue;
      const source = urlMap.get(url) ?? url;
      const full = `${BASE}${url}`;
      try {
        const res = await fetchWithTimeout(full);
        const status = res.status;
        let finalUrl = full;
        let bytes = 0;
        let hasMain = false;
        let hasH1 = false;
        let hasArticle = false;
        let verdict: Row['verdict'] = 'OTHER';
        let note = '';

        if (status >= 300 && status < 400) {
          const loc = res.headers.get('location') ?? '';
          finalUrl = loc;
          verdict = 'REDIRECTED';
          // Follow once to see final body
          try {
            const followUrl = loc.startsWith('http')
              ? loc
              : `${BASE}${loc.startsWith('/') ? loc : '/' + loc}`;
            const r2 = await fetchWithTimeout(followUrl);
            const body = await r2.text();
            bytes = body.length;
            const c = hasContent(body);
            hasMain = c.hasMain;
            hasH1 = c.hasH1;
            hasArticle = c.hasArticle;
            if (r2.status === 404) {
              verdict = '404';
              notFound++;
            } else {
              redirected++;
            }
            note = `redirect->${followUrl} (status ${r2.status})`;
          } catch (e: unknown) {
            redirected++;
            note = `redirect target unreachable: ${(e as Error).message}`;
          }
        } else if (status === 404) {
          verdict = '404';
          notFound++;
          const body = await res.text();
          bytes = body.length;
        } else if (status >= 200 && status < 300) {
          const body = await res.text();
          bytes = body.length;
          // Detect Astro static-build redirect stubs (meta-refresh tag);
          // they return 200 with a tiny body. Count as REDIRECTED, not EMPTY.
          const refreshMatch = /<meta[^>]+http-equiv="refresh"[^>]*url=([^"'\s>]+)/i.exec(body);
          if (refreshMatch) {
            verdict = 'REDIRECTED';
            redirected++;
            finalUrl = refreshMatch[1];
            note = `meta-refresh -> ${refreshMatch[1]} (${bytes}b)`;
          } else {
            const c = hasContent(body);
            hasMain = c.hasMain;
            hasH1 = c.hasH1;
            hasArticle = c.hasArticle;
            if (!(hasMain || hasArticle) || !hasH1 || bytes < 1500) {
              verdict = 'EMPTY';
              empty++;
              note = `bytes=${bytes} main=${hasMain} h1=${hasH1} article=${hasArticle}`;
            } else {
              verdict = 'OK';
              okCount++;
            }
          }
        } else {
          verdict = 'OTHER';
          other++;
          note = `unexpected status ${status}`;
        }

        rows.push({
          source,
          url,
          status,
          finalUrl,
          bytes,
          hasMain,
          hasH1,
          hasArticle,
          verdict,
          note,
        });
      } catch (e: unknown) {
        err++;
        rows.push({
          source,
          url,
          status: 'ERR',
          finalUrl: full,
          bytes: 0,
          hasMain: false,
          hasH1: false,
          hasArticle: false,
          verdict: 'ERROR',
          note: (e as Error).message,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  rows.sort((a, b) => a.url.localeCompare(b.url));

  const header = [
    'source_file',
    'url',
    'status',
    'final_url',
    'bytes',
    'has_main',
    'has_h1',
    'has_article',
    'verdict',
    'note',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.source,
        r.url,
        r.status,
        r.finalUrl,
        r.bytes,
        r.hasMain,
        r.hasH1,
        r.hasArticle,
        r.verdict,
        r.note,
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  writeFileSync(OUT_CSV, lines.join('\n') + '\n');

  console.log(`\nResults written to ${OUT_CSV}`);
  console.log(`OK:         ${okCount}`);
  console.log(`404:        ${notFound}`);
  console.log(`REDIRECTED: ${redirected}`);
  console.log(`EMPTY:      ${empty}`);
  console.log(`OTHER:      ${other}`);
  console.log(`ERROR:      ${err}`);
  console.log(`TOTAL:      ${rows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
