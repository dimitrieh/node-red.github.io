#!/usr/bin/env node
/**
 * Moves the built site under a sub-path, for a GitHub Pages *project* deploy.
 *
 * WHY THIS EXISTS
 *
 * nodered.org is served from the root of its own domain, so every link in this
 * repository is written root-absolute: `](/docs/user-guide/)` in markdown,
 * `href="/about/"` in components, `src="/images/..."` in migrated doc prose.
 * That is correct for production and nothing here changes it.
 *
 * A preview of the site on a fork is served from
 * https://<user>.github.io/<repo>/ instead. Astro's `base` option handles
 * everything Astro itself emits under such a prefix: page routes, the bundled
 * `_astro/` assets, Starlight's navigation, the Pagefind index path. It does
 * not, and cannot, handle the links above. To the compiler `/docs/user-guide/`
 * inside a markdown file is an opaque string, not a route reference, so those
 * roughly five hundred links keep pointing at the domain root and 404.
 *
 * Rewriting them in the source tree would touch over a hundred files and make
 * this branch a divergent fork rather than a thin overlay. So the rewrite
 * happens here, once, against dist/ after the build. Source stays byte-identical
 * to the branch this one sits on.
 *
 * WHAT IT TOUCHES
 *
 * HTML and CSS only, and inside those only the attributes and functions that
 * actually carry a URL. It deliberately does not sweep `_astro/*.js`: Astro
 * already resolves the base in the code it generates, and a blind rewrite of
 * every string literal that starts with a slash would corrupt regexes and
 * unrelated data.
 *
 * A URL is rewritten when it starts with a single `/`. Protocol-relative
 * `//cdn.example` is left alone, so is anything already under the base, which
 * makes the pass idempotent.
 *
 * Usage: SITE_BASE=/<repo>/ node scripts/rebase-dist-urls.mjs
 * With no SITE_BASE, or SITE_BASE=/, it exits without reading anything.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const segments = (process.env.SITE_BASE || '/').split('/').filter(Boolean);
const BASE = segments.length ? `/${segments.join('/')}/` : '/';
const DIST = process.env.DIST_DIR || 'dist';

if (BASE === '/') {
  console.log('rebase-dist-urls: no SITE_BASE, nothing to do.');
  process.exit(0);
}

/** Prefix one URL, unless it is protocol-relative or already based. */
const rebase = (url) => {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  if (url === BASE.slice(0, -1) || url.startsWith(BASE)) return url;
  return BASE + url.slice(1);
};

// Single-URL attributes. `content` is absent on purpose: it is nearly always
// prose or an absolute og: URL, and its one URL-bearing form (a meta refresh)
// is handled separately below.
const SINGLE = /\b(href|src|poster|action|formaction|data-src|data-href|data-url)=("|')(\/[^"']*)\2/g;
// srcset and imagesrcset hold `url descriptor, url descriptor` lists.
const SET = /\b(srcset|imagesrcset)=("|')([^"']+)\2/g;
// <meta http-equiv="refresh" content="0;url=/somewhere/">, which is how
// astro.config.mjs's `redirects` block is published on a static host.
const REFRESH = /(content=("|')\s*\d+\s*;\s*url=)(\/[^"']*)\2/gi;
// url(...) in stylesheets and in inline <style> blocks.
const CSS_URL = /url\(\s*("|'|)(\/[^)"']*)\1\s*\)/g;

let rewrites = 0;
const count = (before, after) => {
  if (before !== after) rewrites += 1;
  return after;
};

const rewriteHtml = (text) =>
  text
    .replace(SINGLE, (m, attr, q, url) => count(m, `${attr}=${q}${rebase(url)}${q}`))
    .replace(SET, (m, attr, q, list) => {
      const next = list
        .split(',')
        .map((candidate) => {
          const [, lead, url, tail] = candidate.match(/^(\s*)(\S+)(.*)$/s) ?? [];
          return url === undefined ? candidate : `${lead}${rebase(url)}${tail}`;
        })
        .join(',');
      return count(m, `${attr}=${q}${next}${q}`);
    })
    .replace(REFRESH, (m, lead, q, url) => count(m, `${lead}${rebase(url)}${q}`))
    .replace(CSS_URL, (m, q, url) => count(m, `url(${q}${rebase(url)}${q})`));

const rewriteCss = (text) => text.replace(CSS_URL, (m, q, url) => count(m, `url(${q}${rebase(url)}${q})`));

const walk = async function* (dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
};

let files = 0;
for await (const path of walk(DIST)) {
  const ext = extname(path);
  if (ext !== '.html' && ext !== '.css') continue;
  const before = await readFile(path, 'utf8');
  const after = ext === '.html' ? rewriteHtml(before) : rewriteCss(before);
  if (after !== before) {
    await writeFile(path, after);
    files += 1;
  }
}

// A preview of a site that is published for real somewhere else should not
// compete with it in search results, and the shipped robots.txt advertises
// production's sitemap. Replace it wholesale rather than rewriting it.
await writeFile(
  join(DIST, 'robots.txt'),
  ['# Preview deployment. Not the canonical site: see https://nodered.org', 'User-agent: *', 'Disallow: /', ''].join(
    '\n',
  ),
);

console.log(`rebase-dist-urls: base ${BASE}, ${rewrites} URLs rewritten across ${files} files.`);

// Guard. If a root-absolute URL survives in an attribute the pass claims to
// cover, the deploy would publish links that 404, so fail here instead.
const leaks = [];
for await (const path of walk(DIST)) {
  if (extname(path) !== '.html') continue;
  const text = await readFile(path, 'utf8');
  for (const [match, , , url] of text.matchAll(SINGLE)) {
    if (!url.startsWith('//') && !url.startsWith(BASE)) leaks.push(`${path}: ${match}`);
  }
}
if (leaks.length) {
  console.error(`rebase-dist-urls: ${leaks.length} root-absolute URLs left behind:`);
  for (const leak of leaks.slice(0, 20)) console.error(`  ${leak}`);
  process.exit(1);
}
