import { writeFileSync, readdirSync, readFileSync, statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';
const CONFIG_FILE = './astro.config.mjs';

interface VerificationResult {
  category: string;
  total: number;
  found: number;
  missing: string[];
}

interface RedirectResult {
  source: string;
  target: string;
  problem: string | null;
}

interface MigrationStatus {
  lastRun: string;
  summary: {
    totalPages: number;
    pagesComplete: number;
    pagesFailed: number;
    percentComplete: number;
  };
  docs: VerificationResult;
  blog: VerificationResult;
  about: VerificationResult;
  redirects: RedirectResult[];
}

function countHtmlFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    if (!existsSync(currentDir)) return;
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.html')) {
        // Convert file path to URL
        let url = fullPath.replace(DIST_DIR, '').replace('/index.html', '/');
        if (!url.endsWith('/')) url += '/';
        files.push(url);
      }
    }
  }

  walk(dir);
  return files;
}

function verifySection(name: string, dir: string, expectedMin: number): VerificationResult {
  const files = countHtmlFiles(dir);
  return {
    category: name,
    total: expectedMin,
    found: files.length,
    missing:
      files.length < expectedMin ? [`Expected at least ${expectedMin}, found ${files.length}`] : [],
  };
}

// ---------------------------------------------------------------------------
// Legacy-URL redirects
//
// The site is hosted on GitHub Pages, which honours no redirect configuration
// of its own, so the `redirects:` block in astro.config.mjs is the only thing
// standing between an old inbound link and a 404. It is also now the single
// source of truth: the Netlify-syntax `public/_redirects` mirror that used to
// duplicate it has been retired, because on Pages it was copied into dist/ as
// an inert text file that redirected nothing while looking authoritative.
//
// This check reads the block straight out of the config and confirms the build
// actually emitted the stub each entry promises, rather than comparing two
// hand-maintained lists against each other (which is what the old mirror did,
// and it drifted anyway). The parse is textual on purpose: importing the config
// would pull in Starlight, UnoCSS and the whole integration chain just to read
// an object literal.
// ---------------------------------------------------------------------------

function parseConfiguredRedirects(): { source: string; target: string }[] {
  if (!existsSync(CONFIG_FILE)) return [];
  const config = readFileSync(CONFIG_FILE, 'utf-8');
  const start = config.indexOf('\n  redirects: {');
  if (start === -1) return [];
  // The block is indented two spaces inside defineConfig({...}), so its closing
  // brace is the first `\n  },` after the opening one.
  const end = config.indexOf('\n  },', start);
  const block = config.slice(start, end === -1 ? undefined : end);

  const pairs: { source: string; target: string }[] = [];
  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\/\/.*$/, '');
    const match = /'([^']+)'\s*:\s*'([^']+)'/.exec(line);
    if (!match) continue;
    const [, source, target] = match;
    if (source === undefined || target === undefined) continue;
    pairs.push({ source, target });
  }
  return pairs;
}

function checkRedirectStub(source: string, target: string): string | null {
  // `build.format` is at its 'directory' default, so every redirect entry is
  // written as <source>/index.html whether or not the source in the config
  // carries a trailing slash.
  const relative = source.replace(/^\//, '').replace(/\/$/, '');
  if (relative === '') return 'source is the site root, which cannot be a redirect';
  const stub = join(DIST_DIR, relative, 'index.html');
  if (!existsSync(stub)) return `no page built at ${stub}`;

  const html = readFileSync(stub, 'utf-8');
  const refresh = /<meta[^>]+http-equiv=["']refresh["'][^>]*>/i.exec(html);
  if (refresh === null) {
    return `built page at ${stub} is not a meta-refresh stub, so a real page is shadowing it`;
  }
  if (!refresh[0].includes(target)) {
    return `stub refreshes to something other than ${target}: ${refresh[0]}`;
  }
  return null;
}

const configuredRedirects = parseConfiguredRedirects();
const redirectResults: RedirectResult[] = configuredRedirects.map(({ source, target }) => ({
  source,
  target,
  problem: checkRedirectStub(source, target),
}));
const brokenRedirects = redirectResults.filter((r) => r.problem !== null);

// A config whose redirect block cannot be found parses to nothing, and a check
// over nothing passes. Treat that as a failure rather than let the whole legacy
// URL surface stop being verified the moment someone reformats the config.
const redirectsUnreadable = configuredRedirects.length === 0;

// The retired mirror must stay retired. Re-adding it on GitHub Pages ships a
// file that redirects nothing and immediately starts drifting from the config.
// The reasoning is recorded in full above the `redirects:` block.
const revivedManifests = ['public/_redirects', '_redirects'].filter((p) => existsSync(p));

// Verify all sections
const docsResult = verifySection('docs', join(DIST_DIR, 'docs'), 138);
const blogResult = verifySection('blog', join(DIST_DIR, 'blog'), 52);
const aboutResult = verifySection('about', join(DIST_DIR, 'about'), 11);

// Case-sensitive paths that must match live nodered.org exactly.
// GitHub Pages / most static hosts are case-sensitive, so the file system
// path is the URL. Lowercased variants would 404 against external links.
const caseSensitivePaths = [
  'docs/api/ui/autoComplete/index.html',
  'docs/api/ui/editableList/index.html',
  'docs/api/ui/searchBox/index.html',
  'docs/api/ui/treeList/index.html',
  'docs/api/ui/typedInput/index.html',
  'blog/rss/index.html',
];

const missingCaseSensitive = caseSensitivePaths.filter((p) => !existsSync(join(DIST_DIR, p)));
if (missingCaseSensitive.length > 0) {
  console.error('\n✗ Missing case-sensitive paths (URL parity with nodered.org broken):');
  for (const p of missingCaseSensitive) console.error(`  - /${p.replace(/\/index\.html$/, '/')}`);
}

const totalPages = docsResult.found + blogResult.found + aboutResult.found;
const expectedTotal = 138 + 52 + 11;

const status: MigrationStatus = {
  lastRun: new Date().toISOString(),
  summary: {
    totalPages: expectedTotal,
    pagesComplete: totalPages,
    pagesFailed: Math.max(0, expectedTotal - totalPages),
    percentComplete: Math.round((totalPages / expectedTotal) * 1000) / 10,
  },
  docs: docsResult,
  blog: blogResult,
  about: aboutResult,
  redirects: redirectResults,
};

// Into the gitignored reports/ directory, like the other audit outputs. It used
// to land at the repo root and was committed from there, which meant a stale
// snapshot travelled in the tree and every CI run that calls this script dirtied
// the working copy.
mkdirSync('reports', { recursive: true });
writeFileSync('reports/migration-status.json', JSON.stringify(status, null, 2));

console.log('=== MIGRATION STATUS ===');
console.log(
  `Docs Pages:   ${docsResult.found}/${docsResult.total} (${Math.round((docsResult.found / docsResult.total) * 100)}%)`,
);
console.log(
  `Blog Posts:   ${blogResult.found}/${blogResult.total} (${Math.round((blogResult.found / blogResult.total) * 100)}%)`,
);
console.log(
  `About Pages:  ${aboutResult.found}/${aboutResult.total} (${Math.round((aboutResult.found / aboutResult.total) * 100)}%)`,
);
console.log('─────────────────────────');
console.log(`OVERALL:      ${totalPages}/${expectedTotal} (${status.summary.percentComplete}%)`);

console.log('\n=== LEGACY REDIRECTS (astro.config.mjs -> built stubs) ===');
if (redirectsUnreadable) {
  console.error(
    `✗ No redirect entries could be read from ${CONFIG_FILE}. Either the block was ` +
      'removed or its formatting changed and this check is now blind. Fix the parser ' +
      'in scripts/verify-urls.ts before shipping.',
  );
} else {
  console.log(
    `Declared: ${configuredRedirects.length}, stubs verified: ${configuredRedirects.length - brokenRedirects.length}`,
  );
  for (const r of brokenRedirects) {
    console.error(`✗ ${r.source} -> ${r.target}: ${r.problem}`);
  }
}

if (revivedManifests.length > 0) {
  console.error(
    '\n✗ A host-specific redirect manifest is back in the tree: ' +
      `${revivedManifests.join(', ')}. GitHub Pages ignores it, so it redirects nothing ` +
      'while looking authoritative. See the comment above `redirects:` in astro.config.mjs.',
  );
}

const passed =
  status.summary.percentComplete >= 100 &&
  missingCaseSensitive.length === 0 &&
  !redirectsUnreadable &&
  brokenRedirects.length === 0 &&
  revivedManifests.length === 0;

if (passed) {
  console.log('\n✓ Migration verification PASSED!');
  process.exit(0);
} else {
  console.log('\n✗ Migration verification FAILED');
  process.exit(1);
}
