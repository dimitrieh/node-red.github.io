# Multi-Agent Migration Audit — Summary

Five-agent team audit of the Node-RED website migration from Jekyll (`master`)
to Astro 6 + Starlight (`sbxa/20260512-144723`). Two rounds, then orchestrator
integration. End state is targeted at PR-review-ready.

## End state

| Check | Result |
|---|---|
| `npx astro check` | **0 errors / 0 warnings** / 18 deprecation hints |
| `DISABLE_PAGEFIND=1 npx astro build` | **211 pages**, sitemap-index.xml + sitemap-0.xml (210 URLs), ~15s |
| `npx vitest --run` | **12 passed / 2 skipped** (skips are Pagefind assertions, expected under `DISABLE_PAGEFIND=1`) |
| `DISABLE_PAGEFIND=1 npm run test:e2e` | **122/122 GREEN** (was 47 pre-session) |
| `npm audit --production` | **0 vulnerabilities** |
| URL parity vs Jekyll source | **206 OK / 94 expected-404 / 0 EMPTY** (the 94 are the retired `/docs/api/modules/v/*` JSDoc tree) |
| Image parity vs new build | 0 broken images, 266 generated |
| Axe-core a11y in chrome we own | 0 violations both themes on `/docs/getting-started/`, sidebar contrast 4.5:1+ both themes, skip-link keyboard-reachable, prefers-reduced-motion honoured |
| Live preview verified at 3 viewports + 2 themes | yes (Playwright MCP, 25+ screenshots in `research/ux-audit/` + `research/round2-ux/`) |

## What the team shipped

67 commits since `master`. Reports under `docs/audit-ux/team/`:

- `architecture-report.md` (round 1 + 2)
- `ux-report.md` (round 1 + 2)
- `a11y-report.md` (round 1 + 2)
- `parity-report.md` (round 1 + 2)
- `devils-advocate.md` (round 1 + 2, 60 KB of constructive critique)
- `TEAM-LOG.md` (full activity stream)
- `TEAM-PROTOCOL.md` (the file-ownership matrix the five agents used to avoid stepping on each other)

### Architecture
- **40 TS errors cleared** — every file the Jekyll-era code had drift in `exactOptionalPropertyTypes` is now strict.
- **Pagefind env-gated** (`DISABLE_PAGEFIND=1`) — local builds on ARM64 16 KB-page sandboxes complete cleanly; prod CI on 4 KB hosts gets full Pagefind unchanged.
- **`robots.txt`** added pointing at `sitemap-index.xml`.
- **`PROGRESS.md` + `README.md`** rewritten from scratch to reflect post-migration reality (the old PROGRESS.md was claiming completion against numbers that hadn't been true for weeks).
- **`build:sandbox` / `test:sandbox` / `test:e2e:sandbox`** script aliases so devs don't have to remember the env var.

### UX
- **Dark-mode tokens** introduced via `:root[data-theme='dark']` overrides — marketing pages now honour the Starlight theme toggle end-to-end (previously, the toggle only affected `/docs/*`).
- **Mobile menu polish**: closes on Escape, on resize past the 1024 px breakpoint, on link click; hamburger gets a visible border + active state.
- **Tablet 2-col layouts** (768–1023 px) — was collapsing to 1-col.
- **Blog cards** now have an overline date + bold "Read post →" CTA + animated red accent strip.
- **Trusted-by wall**: 12 → **47 logos** with seeded build-time shuffle, restored the "Want to feature here?" + permission disclaimer block.
- **"On the blog" mini-feed**: 5 latest posts on the homepage with "All posts →" link.
- **Platforms link** under Get Started: "Also runs on Docker, AWS, Azure, Android, BeagleBone, Arduino — see all platforms →".
- **Per-post `og:image`** plumbed all the way from blog frontmatter → BaseLayout, with `summary_large_image` Twitter card when an image is present.
- **8 new E2E specs** (`tests/e2e/ux-homepage-content.spec.ts`) locking these in as the source-of-truth count.

### Accessibility (WCAG 2.2 AA)
- **Biggest find**: a stray `:root { --sl-color-black: #1A1A1A }` was shadowing Starlight's own `[data-theme='light']` reset and forcing every docs page into a dark palette in "light" mode — sidebar text was rendering at 2.22:1 on 50+ docs pages. Split into proper light/dark token blocks.
- **Theme-aware link tokens**: `--nr-text-link` is `#8B2E2E` light / `#E87070` dark. Brighter `--nr-red` reserved for icons, chrome, CTAs. Closes ~120 axe color-contrast + link-in-text-block violations across `/`, `/blog/`, `/about/`.
- **Footer legal links**, **breadcrumb-bar**, **ThemeSelect**, **markdown link colour**, **`<kbd>` styling** — all individually contrast-fixed.
- **Skip link** now moves focus into `<main tabindex="-1">` on activation (previously dropped back to `<body>`).
- **`aria-controls="mobile-nav"`** on the mobile toggle button.
- **Marketing axe tests** exclude `iframe` scope (YouTube's player markup is outside our control).
- **Promoted `a11y.spec.ts`** from report-only to asserting mode with a documented `KNOWN_OPEN` allowlist — the old behaviour collected violations into a JSON report but never asserted, which is how the dark-palette regression slipped past green E2E.
- **9 new asserting specs** in `tests/e2e/a11y-themes.spec.ts` (light + dark contrast, skip-link Tab+Enter+Tab flow, 320px no-h-scroll, every `<nav>` named, single `<main>`, reduced motion, sidebar contrast).

### URL / content parity
- **28 missing Jekyll redirect_from aliases restored** to `astro.config.mjs` + `public/_redirects` (e.g. `/community/`, `/conduct/`, `/2019survey`, `/docs/security`, `/docs/getting-started/installation`, `/docs/platforms/{aws,azure,android,bluemix,flowforge,windows}`, `/docs/hardware/arduino`, etc.).
- **5 inverted UI redirects removed** — they were pointing at non-existent lowercase targets that shadowed real Starlight-served camelCase pages.
- **`/slack`** target fixed (was pointing back at `https://nodered.org/slack`, an external loop).
- **`/slack/` invite form** converted from broken jQuery `$.ajax` to vanilla `fetch` — works again on the new stack.
- **`/feed.xml`** now serves RSS XML directly (not a meta-refresh stub), matching old Jekyll behaviour; many RSS readers do not follow meta-refresh. Byte-identical content to `/blog/rss/`, top 8 entries match the live old feed.
- **Alt text on 9 platform icons** in `getting-started/index.md`.
- **`/about/` h1** added (was missing).
- **About-page heading order** normalised (`### → ##`) to avoid skipping levels under the new `<h1>`.
- **Anchor parity** spot-checked on top 10 docs pages: 9/10 exact match; the one drift is upstream content (`#node-defaults` not in master either) and tracked for content-sync.
- **`scripts/audit-urls.ts`** taught to classify Astro static redirect stubs as REDIRECTED (not EMPTY) and XML endpoints as OK (was flagging the RSS feed as EMPTY).
- **Drift guard test** (`tests/e2e/parity-redirects.spec.ts`) asserts every redirect in `astro.config.mjs` has a matching `public/_redirects` line + every alias resolves to a 200 page.

### Devil's advocate (read-only critic)
- Caught the **137 retired `/docs/api/modules/v/*`** drop — intentional retirement, but the index page still linked to them. Now scrubbed with pointers to current API tree + GitHub tag for historical snapshots.
- Caught **`PROGRESS.md` claiming UnoCSS was removed** — it was not. Architecture took the keep-and-own decision and documented it.
- Caught the **`/slack` form jQuery dependency** that broke silently on migration.
- Caught the **`og:image` for every page being the small 480×480 icon** — now per-post images thread through for blog posts.
- Caught the **Starlight social GitHub link mismatch** (was `node-red/node-red`, main nav was `node-red`).
- Final verdict: "**merge-with-conditions**" before final integration; after the integration commit `05d0f8c` the conditions are all closed.

## Files of interest for PR review

Highest-signal commits:
- `434edf0` — original Jekyll → Astro migration (already in master..HEAD before this session)
- `152c046` — 40 TS errors cleared
- `69a538b` — Pagefind env-gate
- `cc70fec` — dark-mode tokens
- `5d8e4d2` — Starlight light-mode token regression fix (biggest single a11y win)
- `c3d1026` — 28 redirect_from aliases restored
- `446d0ef` + `bfae64f` — orchestrator integration of round-1 orphan patches (also fixed 4 Playwright failures to get to 114/114)
- `88c27c2` — homepage content density restored (the largest visible UX change)
- `b45dd15` — per-post `og:image`
- `fbd1475` — PROGRESS.md + README rewrite
- `7f2a691` — markdown-link contrast + always-on underline in docs
- `c3fcdb8` — `a11y.spec.ts` promoted to asserting mode
- `05d0f8c` — round-2 final orchestrator integration (theme-aware link tokens, slack form de-jQueryed, dead /v/* links scrubbed, Starlight social GitHub link fixed)

## What's intentionally NOT in this PR

These were considered and explicitly deferred — all documented in the round-2 reports:

- **Contributors gallery** and **sponsor block** restoration on the homepage. Devil flagged both in round 1; round-2 UX scoped them to the next shift because they need real data sources (avatars list, sponsor logos), not just a layout change.
- **Lighthouse CI scores**. Config exists at `lighthouserc.json` and the CLI runs, but spinning up a Chrome binary in this sandbox is non-trivial (no system chromium, Playwright's bundled chromium gives `NO_FCP`). Confirm on GitHub Actions before merge.
- **9 dev-only `npm audit` findings** — all transitive through `@lhci/cli` (low) and `@astrojs/check` (moderate via `yaml`). Auto-fix would force semver-major regressions. Recommend ignore until upstream patches.
- **`#node-defaults` anchor** on `/docs/user-guide/runtime/configuration` — upstream content drift in master, not migration loss. Tracked for content-sync run.
- **Squash strategy**. 67 commits since master. Either squash by role (`ux:`, `arch:`, `a11y:`, `parity:`, `devil:`, `integrate:`) or use this `SUMMARY.md` as the PR description and merge with merge-commit. Reviewable as a series.

## Environment caveats for the reviewer

- This branch was developed in an ARM64 sandbox with a 16 KB system page size. Pagefind 1.5.2's bundled jemalloc only supports 4 KB pages and crashes during `astro:build:done`. **Production CI on a 4 KB host is unaffected** and gets the full Pagefind index — verify by running `npm run build` (not `:sandbox`) in CI and inspecting `dist/pagefind/`.
- 47 git commits used role prefixes (`ux:`, `arch:`, `a11y:`, `parity:`, `devil:`) so the series tells a coherent story. 4 `integrate:`-prefixed commits are orchestrator integration of orphan cross-team patches.
