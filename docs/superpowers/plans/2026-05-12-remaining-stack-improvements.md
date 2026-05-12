# Remaining Stack Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ESLint + Prettier, Lighthouse CI, Pagefind verification, upstream content-sync script, and evaluate/remove vite-plus — the remaining "later" improvements from the migration research.

**Architecture:** Five independent improvements, each with its own commit. ESLint uses the new flat config format (`eslint.config.js`) with `@unocss/eslint-config` for utility class linting. Lighthouse CI uses `@lhci/cli` with a perf budget config. The content-sync script is a standalone TypeScript script in `scripts/`. Pagefind is verified via the existing build output test suite.

**Tech Stack:** ESLint 9 (flat config), Prettier 3, @unocss/eslint-config, @lhci/cli, TypeScript, Vitest, Astro 6 / Starlight 0.39

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `eslint.config.js` | Flat ESLint config with TypeScript, Astro, UnoCSS rules |
| Create | `.prettierrc` | Prettier config (singleQuote, printWidth, trailingComma) |
| Create | `.prettierignore` | Ignore dist, node_modules, package-lock |
| Modify | `package.json` | Add lint/format scripts, new devDependencies |
| Create | `lighthouserc.json` | LHCI config with perf budgets |
| Modify | `tests/integration/build.test.ts` | Add Pagefind output assertions |
| Create | `scripts/sync-upstream.ts` | Content-sync mapper script |

---

### Task 1: ESLint + Prettier Setup

**Files:**
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: `package.json` (add deps + scripts)

- [ ] **Step 1: Install dependencies**

```bash
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-astro eslint-config-prettier prettier @unocss/eslint-config
```

- [ ] **Step 2: Create `.prettierrc`**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Match the existing code style: `astro.config.mjs` uses single quotes, trailing commas.

- [ ] **Step 3: Create `.prettierignore`**

```
dist
node_modules
package-lock.json
.astro
```

- [ ] **Step 4: Create `eslint.config.js`**

```js
// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import eslintConfigPrettier from 'eslint-config-prettier';
import unocss from '@unocss/eslint-config/flat';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  unocss,
  eslintConfigPrettier,
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  },
);
```

- [ ] **Step 5: Add scripts to `package.json`**

Add to `"scripts"`:
```json
"lint": "eslint . && prettier --check .",
"lint:fix": "eslint --fix . && prettier --write ."
```

- [ ] **Step 6: Run lint to see baseline**

```bash
npm run lint 2>&1 | head -50
```

Expected: some warnings/errors from existing code. This is fine — we're establishing the tooling, not fixing every violation in this task.

- [ ] **Step 7: Fix any blocking errors only**

If ESLint errors on config parsing or crashes, fix the config. Do NOT fix linting violations in existing code — that's a separate chore.

- [ ] **Step 8: Commit**

```bash
git add eslint.config.js .prettierrc .prettierignore package.json package-lock.json
git commit -m "chore: add ESLint 9 + Prettier with UnoCSS and Astro plugins"
```

---

### Task 2: Evaluate and Remove vite-plus

**Files:**
- Modify: `package.json` (remove vite-plus)

- [ ] **Step 1: Verify vite-plus is not imported anywhere**

```bash
grep -r "vite-plus" --include="*.ts" --include="*.mjs" --include="*.js" .
```

Expected: no matches outside `package.json` and `package-lock.json`. Already confirmed during exploration — `vite-plus` is a VoidZero drop-in Vite enhancer. The project doesn't explicitly reference it and pins `vite` via `overrides` anyway.

- [ ] **Step 2: Remove vite-plus**

```bash
npm uninstall vite-plus
```

- [ ] **Step 3: Verify build still works**

```bash
npm run build
```

Expected: clean build, no errors. `astro check` (part of build) should also pass.

- [ ] **Step 4: Verify unit tests still pass**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused vite-plus dependency"
```

---

### Task 3: Pagefind Verification in Build Tests

**Files:**
- Modify: `tests/integration/build.test.ts`

Starlight ships Pagefind by default. The build test already checks `dist/` contents but doesn't verify Pagefind assets exist. We need to confirm the search index is generated.

- [ ] **Step 1: Run a build to confirm Pagefind output**

```bash
npm run build && ls dist/pagefind/
```

Expected: `pagefind.js`, `pagefind-ui.js`, `pagefind-ui.css`, and index fragment files. If this directory doesn't exist, Starlight's Pagefind integration may be misconfigured — investigate before proceeding.

- [ ] **Step 2: Add Pagefind assertions to build test**

Add to `tests/integration/build.test.ts`, inside the existing `describe('Build Output', ...)` block:

```ts
it('should have Pagefind search index', () => {
  expect(existsSync(join(DIST_DIR, 'pagefind', 'pagefind.js'))).toBe(true);
});

it('should have Pagefind UI assets', () => {
  expect(existsSync(join(DIST_DIR, 'pagefind', 'pagefind-ui.js'))).toBe(true);
  expect(existsSync(join(DIST_DIR, 'pagefind', 'pagefind-ui.css'))).toBe(true);
});
```

- [ ] **Step 3: Run tests to verify**

```bash
npm test -- --run
```

Expected: all tests pass including the two new ones.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/build.test.ts
git commit -m "test: verify Pagefind search index is generated in build output"
```

---

### Task 4: Lighthouse CI Configuration

**Files:**
- Create: `lighthouserc.json`
- Modify: `package.json` (add lhci script + devDep)

This sets up the config and a convenience script. Actual CI integration (GitHub Actions) is out of scope since there's no `.github/workflows/` directory yet — this provides the local-runnable foundation.

- [ ] **Step 1: Install @lhci/cli**

```bash
npm install -D @lhci/cli
```

- [ ] **Step 2: Create `lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:4321/",
        "http://localhost:4321/docs/",
        "http://localhost:4321/blog/",
        "http://localhost:4321/about/"
      ],
      "startServerCommand": "npm run preview",
      "startServerReadyPattern": "Local",
      "numberOfRuns": 1,
      "settings": {
        "preset": "desktop"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

Performance at `warn` 0.8 (not error) because Google Sans Flex is heavy and we don't want to block deploys on font load speed. Accessibility at `error` 0.9 because the project already has axe checks and should stay high.

- [ ] **Step 3: Add lhci script to `package.json`**

Add to `"scripts"`:
```json
"lighthouse": "lhci autorun"
```

- [ ] **Step 4: Verify it runs**

This requires a build first:
```bash
npm run build && npx lhci autorun 2>&1 | tail -20
```

Expected: Lighthouse runs against the 4 URLs, reports scores. Some may warn (performance with Google Fonts is expected) — that's fine. The config is established.

- [ ] **Step 5: Commit**

```bash
git add lighthouserc.json package.json package-lock.json
git commit -m "chore: add Lighthouse CI config with perf and a11y budgets"
```

---

### Task 5: Upstream Content-Sync Script

**Files:**
- Create: `scripts/sync-upstream.ts`
- Modify: `package.json` (add sync script)

This script adds the upstream remote, fetches it, then for each file changed since the fork point, maps the Jekyll path to the Astro path and shows the diff. It's a review tool, not an auto-merger. Uses `execFileSync` (not `execSync`) to avoid shell injection surface.

- [ ] **Step 1: Create `scripts/sync-upstream.ts`**

```ts
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
  // Site chrome (_includes, _layouts, root html) — skip
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

    // Strip frontmatter for comparison (Astro may have different frontmatter)
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
    // Show a simple line-count delta since we can't shell out to diff easily
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
```

- [ ] **Step 2: Add sync script to `package.json`**

Add to `"scripts"`:
```json
"sync:upstream": "npx tsx scripts/sync-upstream.ts"
```

- [ ] **Step 3: Test the script**

```bash
npm run sync:upstream 2>&1 | head -30
```

Expected: adds the upstream remote (or notes it exists), fetches, then lists changed files with diffs. If upstream fetch fails due to network restrictions in the sandbox, that's expected — the script structure is correct and will work when run locally.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-upstream.ts package.json
git commit -m "feat: add upstream content-sync script for tracking Jekyll doc changes"
```
