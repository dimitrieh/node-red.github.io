/**
 * Upstream content sync tool.
 *
 * Adds the upstream Node-RED website remote, fetches it, and diffs
 * content files changed since the fork point against their Astro equivalents.
 *
 * Usage: npx tsx scripts/sync-upstream.ts [--since <commit>]
 */
import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const UPSTREAM_URL = 'https://github.com/node-red/node-red.github.io.git';
const UPSTREAM_REMOTE = 'upstream';
const FORK_BASE = '5c0309b'; // Feb 10, 2026 — when the Astro fork diverged

/** Map a Jekyll source path to its Astro equivalent. */
function mapPath(jekyllPath: string): string | null {
  if (jekyllPath.startsWith('docs/')) {
    return `src/content/docs/${jekyllPath}`;
  }
  if (jekyllPath.startsWith('_posts/')) {
    return `src/content/blog/${jekyllPath.replace('_posts/', '')}`;
  }
  if (jekyllPath.startsWith('about/')) {
    return `src/content/about/${jekyllPath}`;
  }
  return null;
}

function run(cmd: string, args: string[], opts?: { silent?: boolean }): string {
  return execFileSync(cmd, args, {
    encoding: 'utf-8',
    stdio: opts?.silent ? ['pipe', 'pipe', 'pipe'] : undefined,
  }).trim();
}

function ensureRemote(): void {
  try {
    run('git', ['remote', 'get-url', UPSTREAM_REMOTE], { silent: true });
    console.log(`Remote '${UPSTREAM_REMOTE}' already exists.`);
  } catch {
    console.log(`Adding remote '${UPSTREAM_REMOTE}' -> ${UPSTREAM_URL}`);
    run('git', ['remote', 'add', UPSTREAM_REMOTE, UPSTREAM_URL]);
  }
  console.log('Fetching upstream...');
  execFileSync('git', ['fetch', UPSTREAM_REMOTE, 'master'], { stdio: 'inherit' });
}

function getChangedFiles(since: string): string[] {
  const output = run('git', [
    'diff', '--name-only', `${since}..${UPSTREAM_REMOTE}/master`,
    '--', 'docs/', '_posts/', 'about/',
  ], { silent: true });
  return output.split('\n').filter((f) => f.length > 0);
}

function getUpstreamContent(path: string): string | null {
  try {
    return run('git', ['show', `${UPSTREAM_REMOTE}/master:${path}`], { silent: true });
  } catch {
    return null;
  }
}

function main(): void {
  const sinceArg = process.argv.indexOf('--since');
  const since = sinceArg !== -1 && process.argv[sinceArg + 1]
    ? process.argv[sinceArg + 1]
    : FORK_BASE;

  ensureRemote();

  const changed = getChangedFiles(since);
  console.log(`\n${changed.length} content files changed upstream since ${since}:\n`);

  let hasDiffs = 0;
  let skipped = 0;
  let upToDate = 0;
  let missing = 0;

  for (const jekyllPath of changed) {
    const astroPath = mapPath(jekyllPath);
    if (!astroPath) {
      skipped++;
      continue;
    }

    const resolved = resolve(astroPath);
    if (!existsSync(resolved)) {
      missing++;
      console.log(`  MISSING: ${astroPath} (upstream: ${jekyllPath})`);
      continue;
    }

    const upstream = getUpstreamContent(jekyllPath);
    if (!upstream) {
      skipped++;
      continue;
    }

    const local = readFileSync(resolved, 'utf-8');

    const stripFrontmatter = (s: string) => s.replace(/^---[\s\S]*?---\n?/, '').trim();
    if (stripFrontmatter(upstream) === stripFrontmatter(local)) {
      upToDate++;
      continue;
    }

    hasDiffs++;
    console.log(`\n${'='.repeat(72)}`);
    console.log(`UPSTREAM CHANGED: ${jekyllPath}`);
    console.log(`LOCAL EQUIVALENT: ${astroPath}`);
    console.log('='.repeat(72));
    const upLines = upstream.split('\n').length;
    const localLines = local.split('\n').length;
    console.log(`  Upstream: ${upLines} lines | Local: ${localLines} lines | Delta: ${upLines - localLines}`);
    console.log(`  Run to see full diff:`);
    console.log(`    git diff --no-index ${astroPath} <(git show upstream/master:${jekyllPath})`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Changed upstream : ${changed.length}`);
  console.log(`With local diffs : ${hasDiffs}`);
  console.log(`Already up-to-date: ${upToDate}`);
  console.log(`Missing locally  : ${missing}`);
  console.log(`Skipped (chrome) : ${skipped}`);

  if (hasDiffs > 0) {
    console.log(`\nReview the diffs above and manually apply relevant changes.`);
  } else if (missing === 0) {
    console.log(`\nAll content is up to date with upstream!`);
  }
}

main();
