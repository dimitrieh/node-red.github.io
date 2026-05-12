/* eslint-disable no-console */
/**
 * Broken-image check over a sample of 10 blog posts (Phase 4).
 * Fetches each blog post HTML, extracts <img src> values, and HEADs
 * each src against the dev server. Writes results to docs/audit-qa-images.json.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE = process.env.AUDIT_BASE_URL ?? 'http://localhost:4321';
const URLS = '/tmp/old-urls.txt';
const OUT = resolve(process.cwd(), 'docs/audit-qa-images.json');

function extractImgs(html: string): string[] {
  const re = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  return [...html.matchAll(re)]
    .map((m) => m[1])
    .filter((s): s is string => typeof s === 'string');
}

async function head(url: string): Promise<{ status: number; note: string }> {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    if (r.status === 405 || r.status === 501) {
      const g = await fetch(url, { method: 'GET' });
      return { status: g.status, note: 'GET fallback' };
    }
    return { status: r.status, note: '' };
  } catch (e: unknown) {
    return { status: 0, note: (e as Error).message };
  }
}

async function main() {
  const all = readFileSync(URLS, 'utf-8')
    .split('\n')
    .filter((l) => l.startsWith('/blog/') && l !== '/blog/' && l !== '/blog/rss/');
  const sample: string[] = [];
  const step = Math.max(1, Math.floor(all.length / 10));
  for (let i = 0; sample.length < 10 && i < all.length; i += step) {
    const item = all[i];
    if (item !== undefined) sample.push(item);
  }

  const perPage: Array<{
    url: string;
    pageStatus: number;
    images: Array<{ src: string; status: number; note: string }>;
  }> = [];
  let broken = 0;
  let total = 0;

  for (const u of sample) {
    const res = await fetch(`${BASE}${u}`);
    const pageStatus = res.status;
    const body = pageStatus < 400 ? await res.text() : '';
    const imgs = extractImgs(body);
    const results: Array<{ src: string; status: number; note: string }> = [];
    for (const src of imgs) {
      if (src.startsWith('data:')) continue;
      total++;
      const full = src.startsWith('http') ? src : `${BASE}${src.startsWith('/') ? src : '/' + src}`;
      const r = await head(full);
      if (r.status !== 200) broken++;
      results.push({ src, status: r.status, note: r.note });
    }
    perPage.push({ url: u, pageStatus, images: results });
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ sample, totalImages: total, brokenImages: broken, perPage }, null, 2));
  console.log(`Sampled ${sample.length} blog posts; total imgs ${total}; broken ${broken}`);
  console.log(`Report: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
