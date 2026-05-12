# Multi-Agent Team Protocol

You are one of **5 teammates** working in parallel on the Node-RED website migration from Jekyll (`master` branch) to Astro 6 + Starlight (current `sbxa/*` branch). Read this entire document before doing anything. Coordination depends on every teammate following the rules below.

## Branch & worktree

- Working directory: this worktree, branch `sbxa/20260512-144723`.
- Old Jekyll source: `git show master:<path>` (e.g. `git show master:_includes/header.html`, `git show master:_config.yml`, `git show master:_posts/2024-…md`).
- Live old site reference: `https://nodered.org/` (WebFetch / Playwright).
- Do NOT push to remote. Commits stay local on this branch.

## Roles & file ownership

You may **read** the entire codebase. You may only **edit** files listed in your ownership column below. If you need to change a file you don't own, write your proposed patch into your report (with the full diff) and stop — do not touch the file.

| Role | Owns (writable) | Forbidden |
|---|---|---|
| **ux** | `src/components/**` (except `src/components/starlight/**`), `src/layouts/**`, `src/styles/design-tokens.css`, `src/pages/index.astro`, `src/pages/about/**`, `src/pages/blog/**`, `tests/e2e/ux-*.spec.ts` (new files only) | starlight overrides, `astro.config.mjs`, scripts, content |
| **architecture** | `astro.config.mjs` *(every section except `redirects:`)*, `src/content.config.ts`, `src/data/**`, `src/utils/**`, `scripts/migrate-*.ts`, `scripts/sync-upstream.ts`, `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `lighthouserc.json`, `tests/integration/**` | components, layouts, styles, content, parity scripts |
| **a11y** | `src/components/starlight/**`, `src/styles/starlight-custom.css`, `tests/e2e/a11y.spec.ts`, `tests/e2e/a11y-*.spec.ts` (new) | UX components, content, redirects |
| **parity** | `redirects:` section of `astro.config.mjs` only, `scripts/verify-urls.ts`, `scripts/verify-images.ts`, `scripts/audit-urls.ts`, `scripts/audit-images.ts`, `tests/e2e/parity.spec.ts`, `tests/e2e/parity-*.spec.ts` (new), `public/_redirects`, `src/content/**` (content fixes only — typos, missing frontmatter, broken inline links) | components, styles, layouts, astro.config.mjs (outside redirects) |
| **devils-advocate** | **READ-ONLY.** Only writes `docs/audit-ux/team/devils-advocate.md` and may append to `docs/audit-ux/team/TEAM-LOG.md`. No code edits. | everything else |

**Shared files** — coordinate via report:
- `astro.config.mjs` is split: architecture owns most, parity owns `redirects:`. If you need to add a redirect, parity does it. If you need to change a Starlight setting, architecture does it.
- `src/components/Footer.astro`, `src/components/Header.astro`, `BaseLayout.astro` — UX edits visuals; a11y only edits ARIA/semantic-HTML attributes. If both need to edit, UX commits first; a11y rebases (`git pull --rebase` is not needed — same branch, just re-edit on top).

## Commit conventions

- Commit small, often. Use a **role prefix**:
  - `ux: tighten hero spacing on mobile`
  - `arch: fix astro check errors in BlogPostLayout`
  - `a11y: add aria-current on Starlight sidebar links`
  - `parity: add /docs/legacy/foo → /docs/foo redirect`
  - `devil: append critique of dark-mode toggle UX`
- Before each commit: `npx astro build` MUST succeed (no errors). It is fine if `astro check` still has errors that are not yours to fix — focus on a build that produces pages. Do not run `npm run build` (that bundles check and may block your commits on unrelated check errors).
- One concern per commit. If you fix two unrelated things, split them.
- Do not amend commits.
- Do not include "Generated with Claude" or "Co-Authored-By: Claude" — the PreToolUse hook blocks these.

## Environment quirk: Pagefind on this sandbox

This ARM64 sandbox has a 16KB system page size. Pagefind's bundled Rust binary uses jemalloc compiled for 4KB pages and crashes during the search-index step with:

```
<jemalloc>: Unsupported system page size
memory allocation of 16 bytes failed
[build] Waiting for integration "@astrojs/starlight", hook "astro:build:done"...
```

This is environmental, not a bug in this repo. Pages are generated successfully before the crash — `dist/` contains 216 index.html files. Treat "completed page generation" as a green build for your purposes. The architecture teammate may investigate upstream workarounds (e.g. PAGEFIND_BINARY env override, vendoring a different binary) but should NOT block on fully solving it.

Implication: `npx astro preview --host 0.0.0.0 --port <yourport>` works — preview reads existing dist/. Site search will be broken (no pagefind index) — this is expected; flag it as an "out-of-sandbox" CI concern, not as a code defect to fix here.

## Build & test commands

- Fast build (no check): `npx astro build` — should produce ~216 pages and emit "[build] ✓ Completed". Will then crash at Pagefind. Pages are still in dist/. Treat as green.
- Strict build: `npm run build` — currently has 40 TS errors. Architecture owns fixing these.
- Unit tests: `npm test -- --run`
- E2E tests: `npm run test:e2e` (Playwright spins up its own preview server on port 4321).
- A11y subset: `npm run test:e2e -- a11y`
- Parity subset: `npm run test:e2e -- parity`
- URL audit: `npm run verify:urls` (writes/reads `docs/audit-qa-urls.csv`).
- Image audit: `npm run verify:images` (writes `docs/audit-qa-images.json`).
- Lighthouse: `npm run lighthouse` (uses `lighthouserc.json`).

## How to reach the OLD Jekyll site

- Source on `master`: `git show master:_layouts/default.html`, `git show master:_includes/header.html`, `git show master:_config.yml`, `git show master:index.html`, `git show master:about/index.md`, etc.
- List old paths: `git ls-tree -r master --name-only`.
- Live render: `WebFetch` against `https://nodered.org/...` or use Playwright (MCP browser tools available; navigate to `https://nodered.org/`).

## Conflict-avoidance rules

1. **Before editing**, run `git status` — if there are uncommitted changes outside your owned files, another teammate is mid-edit. Read the diff, decide if it conflicts with your plan, and if so wait or write a note.
2. **Pull no rebases** — same branch, no fetches. Just keep your commits small so the worktree state stays close to HEAD.
3. **If you discover** that a file you need is owned by another teammate, write the patch into your report and STOP. Do not edit it.
4. **TEAM-LOG.md**: append a one-line entry at every commit and at every major decision — `<timestamp> <role>: <message>`. This is the shared activity stream.

## Deliverable: your report

Write your findings to `docs/audit-ux/team/<role>-report.md`. Required sections:

```markdown
# <Role> Report
## Summary
3-5 sentences: what you assessed, what you fixed, what remains.

## Method
How you tested (Playwright, axe-core, URL audit, manual inspection, master diff, live nodered.org…).

## Findings — fixed in this branch
- One bullet per fix, with commit hash and file:line.

## Findings — flagged, not fixed
- One bullet per issue you found but didn't fix (because out of scope, too risky, or owned by another teammate).

## Patches for other teammates
- Diffs you want another role to apply. Include role, file, full diff block.

## Verification
Commands run, results, screenshots saved (path).

## Recommendations
Prioritized list of follow-ups.
```

## When you finish

- Commit your final state.
- Mark your task in the task list as `completed`.
- Append a final entry to `TEAM-LOG.md` summarising your shift.
- The orchestrator (the parent agent) will read your report and integrate.

## Anti-patterns

- Don't try to do everyone's job. Stay in your lane.
- Don't refactor outside your scope "while you're here."
- Don't ship a change you haven't built. `npx astro build` after every meaningful edit.
- Don't claim "the site works" without Playwright evidence.
- Don't trust `PROGRESS.md` — verify the current state yourself.
