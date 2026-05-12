# Devil's Advocate Report

> Role: constructive contrarian. I have not edited any source code. All findings are stress-tests of the migration claims — each frames "case for", "case against", and "my read".

## Summary

The Astro 6 + Starlight migration is a real upgrade in some respects (cleaner docs IA, axe-passing landmark structure, modern font stack, Pagefind-backed search where the old site had none). It is also a measurable **content regression** in several places that PROGRESS.md does not acknowledge:

1. Homepage drops the **contributors gallery** ("Meet the team"), **sponsor acknowledgements** (FlowFuse / IBM / Hitachi), **inline blog feed** (latest 5 posts), **inline Stack Overflow link**, **live npm version badge**, **multi-link platform list** (AWS, Azure, FlowFuse, BeagleBone, Arduino, Android), and reduces "Who's using" from ~36 logos to **the first 12 sliced from `users.ts`** with no pagination/shuffle.
2. `docs/api/modules/v/*` — **137 versioned JSDoc API references** (three full versions: 0.20.0-beta.2, 1.0, 1.3) are listed from a working `/docs/api/modules/` page but every link 404s. URL audit confirms 94 broken pages here. These were genuine reference docs on master, not stale clutter.
3. PROGRESS.md Phase 1 claim "Removed unused dependencies: lit, …, unocss, @unocss/astro, @unocss/preset-wind, @unocss/preset-icons" is **false**. `package.json` still depends on unocss, `@unocss/astro`, `@unocss/preset-wind`, `@unocss/preset-icons`, `@unocss/eslint-config`. `astro.config.mjs` still imports `UnoCSS` and lists `UnoCSS()` as an integration. `uno.config.ts` is still present (57 lines). Footer uses `.i-simple-icons-*` UnoCSS icon classes, so removing UnoCSS would visibly break the footer social icons.
4. PROGRESS.md Phase 1 claim "Created `src/data/navigation.ts`" is verified — but `src/data/contributors.ts` exists in the new tree and is **not imported by any page**. Dead data.
5. `npx astro build` exit code is non-zero on this sandbox arch (Pagefind/jemalloc 16 KB page-size crash). That is environmental — Jekyll didn't have Pagefind either, so it's not a regression vs. master, but it does mean the "zero errors" claim is misleading even granting the caveat: Pagefind error is a real error, just one that prod CI happens not to hit.
6. `astro check` initially reported **8 errors, 18 hints** at the start of this audit (PROGRESS.md said "zero errors"; the protocol said "40"). The architecture teammate fixed these in commit `152c046` during this audit window — `astro check` now reports **0 errors, 0 warnings, 18 hints**. So this particular gap is closed in-flight. Crediting architecture teammate.

Recommendation summary at section 5. None of this calls for reverting the migration — but several items should land before declaring "complete".

---

## 1. Steelmanning master — places the old Jekyll site is better

For each item: case for change / case against / my read.

### 1a. Homepage "Meet the team" contributors gallery (removed)

- **Old:** `git show master:index.html` renders `site.data.contributors` as an avatar grid with names + GitHub/site links for Project Leads and Core Contributors. Real human faces above the fold of "About the project".
- **New:** Section gone. `src/data/contributors.ts` exists but is imported by zero pages (`grep -rln "from.*contributors" src/` returns nothing).
- **Case for the change:** Faces become stale, contributors join/leave, the new site uses the GitHub contributors graph as source of truth.
- **Case against:** "Who is behind this project?" is a load-bearing question for a self-hosted open-source tool. The old site answered it in 2 seconds. The new site forces a hunt through `/about/governance/` then a GitHub click. The contributors data file is still in the repo, so the maintenance burden hasn't changed — only the rendering.
- **My read:** Regression. Bringing back a minimal contributors strip from `src/data/contributors.ts` is a half-day of UX work and restores a strong community signal. Recommend the UX teammate render it.

### 1b. Latest npm version badge (removed)

- **Old:** Hero shows `Latest version: v4.1.10 (npm)` with a direct link to npmjs.com/package/node-red. Confirms the project is alive, gives the version at a glance, and links to the canonical artefact.
- **New:** No version anywhere on the homepage. The most recent release info is buried in the blog / docs.
- **Case for the change:** Hardcoded version strings go stale; Jekyll's `node-red-latest-version` was a JS-fetched value, and replacing it with the same JS in Astro is "an extra integration."
- **Case against:** This is literally a `<span>` populated by 4 lines of JS calling `registry.npmjs.org/node-red/latest`. The old site had it for a reason: at-a-glance trust signal that the project is actively maintained. Costs ~1KB of inline JS.
- **My read:** Regression. Trivial to add back. Recommend UX/architecture restore it as a small client-side fetch (or, simpler, a build-time fetch via `scripts/sync-upstream.ts`).

### 1c. Multi-link "Get Started" platform list (collapsed)

- **Old:** Three columns, each with multiple links: "Run locally" (getting-started, docker), "On a device" (Raspberry Pi, FlowFuse Device Agent, BeagleBone Black, Arduino, Android), "In the cloud" (FlowFuse, AWS, Azure).
- **New:** Three single-link cards: Run locally, Docker, Raspberry Pi. Cloud and most device platforms unreachable from the homepage. Each underlying docs page (`/docs/getting-started/aws`, `/docs/getting-started/azure`, `/docs/getting-started/android`, `/docs/getting-started/beaglebone`) **does exist** in the new content tree — they're just not surfaced.
- **Case for the change:** The new design language wants three balanced cards. More text per card hurts the card grid aesthetic.
- **Case against:** Discoverability of cloud platforms (especially Azure / AWS, which are commercially relevant for Node-RED-on-IoT customers) is now several clicks deep. Users who clicked from a Google query for "Node-RED Azure" used to land on `/docs/platforms/azure` — that exact URL still 200s on live nodered.org as a redirect, but the new site has **no redirect for it** (see section 3, redirects audit).
- **My read:** Mixed. The visual upgrade is genuine, but the new homepage should at least have a "More platforms →" link under Get Started linking to `/docs/getting-started/`. And the redirects for `/docs/platforms/aws|azure|android` need to be added (Parity teammate).

### 1d. Inline "On the blog" feed (removed)

- **Old:** Right column of the community section shows the latest 5 blog posts with dates. Anyone landing on the homepage immediately sees that the project shipped something recent. Strong "this is alive" signal.
- **New:** No blog posts on the homepage. Must click "blog" in nav. Slack still uses a 6/7th-of-a-card-grid slot for "real-time chat with developers" — given how thin the Node-RED Slack actually is, the blog feed would arguably be a stronger signal than the Slack card.
- **Case for the change:** Cleaner above-the-fold; cards are visually consistent.
- **Case against:** Loses freshness signal. Static-site speed makes inline-latest-posts cheap. The old site did it in 2 lines of Liquid.
- **My read:** Regression. UX teammate should consider replacing one of the Trusted-By or Community slots with a "Latest posts" mini-feed.

### 1e. Stack Overflow on the community card grid (removed)

- **Old:** Community section shows Forum / Slack / **Stack Overflow** / GitHub. Stack Overflow `node-red` tag is one of the top three places real users actually get help (it's #1 in the 2023 survey by some measures — see `src/content/about/community/survey/2023/data-2023.json` which still shows 35.7% Stack Overflow).
- **New:** Community grid shows Forum / Slack / GitHub / Flow Library. Stack Overflow only mentioned in `src/content/about/community/index.md` body text.
- **Case for the change:** Flow Library is a Node-RED-specific resource and arguably more important to surface.
- **Case against:** The team's own community survey says Stack Overflow is a primary help channel. Hiding it on the homepage is a discoverability hit users will silently absorb.
- **My read:** Mixed. Five cards instead of four would fit. Or replace Slack (which is shrinking) with Stack Overflow. Recommend the UX teammate include both Stack Overflow and Flow Library, dropping Slack from the homepage (it can stay in the footer / community page).

### 1f. "Who's Using" wall reduced from full set to 12 (regression)

- `src/pages/index.astro:150`: `{users.slice(0, 12).map(...)}` — only the first 12 logos render.
- Master JS shuffles the list and renders all of them, with permission-link footnote.
- **Case for the change:** Visual: 12 logos fit a 6×2 grid cleanly.
- **Case against:** This is a **community recognition** feature, not a marketing wall. Companies are listed by alphabetic ID; the first 12 from `users.ts` (Aboto, Acme, Adyen, ASOS, AT&T, …) systematically excludes everyone else. The 47 entries the team added the `name` field to in PROGRESS Phase 1 are mostly invisible.
- **My read:** Regression. Restore a randomised-on-build or randomised-on-load full grid; the auto-fill CSS is already in the trusted-grid class. Recommend UX teammate render all `users` (47), perhaps with a `nth-child > 18` collapse.

### 1g. Sponsor / Acknowledgements section (removed)

- Old homepage has: "The Node-RED project is actively sponsored by: FlowFuse [logo]. Past sponsors: IBM, Hitachi."
- New homepage: nothing. `git grep flowfuse src/pages/index.astro` returns nothing.
- **Case for the change:** Sponsorship belongs in `/about/`, not on the homepage.
- **Case against:** OpenJS Foundation projects are required to disclose sponsors visibly; "past sponsors" includes IBM (the project's birthplace). Removing it is both a community-trust hit and arguably a governance hit.
- **My read:** Regression. The old footer also doesn't carry this so removing from the homepage truly removes it from the top-level user experience. Should be added back, even if just as a single line in the footer or the about index.

### 1h. Footer: lost text links (npm, APIs, Mastodon, Stack Overflow)

Comparing `git show master:_includes/footer.html` to `src/layouts/BaseLayout.astro:83–139`:

| Link | Old footer | New footer |
|------|-----------|------------|
| npm | text link | gone |
| APIs (`/docs/api`) | text link | gone (subsumed into Documentation) |
| Mastodon | text link with `rel="me"` | only as icon in social row |
| Twitter | text link | only as icon |
| Stack Overflow | (in community card) | gone from footer & homepage |

The icon-only social links lose `rel="me"` on Mastodon — relevant for Mastodon profile verification.

- **Case for the change:** Icon row is cleaner.
- **Case against:** `rel="me"` is the Mastodon verification mechanism. Without it, the project's Mastodon profile shows nodered.org as an unverified link.
- **My read:** Verified `rel="me"` IS still on the icon link (line 123: `rel="noopener noreferrer me"`). So that part is OK. But the loss of plain-text APIs/npm/Stack Overflow links in the footer is a small but real discoverability hit for keyboard-only and screen-reader users.

### 1i. Edit-on-GitHub flow

- **Old (Jekyll):** Every markdown file at `docs/...md` maps 1:1 to a URL. "Edit this page" links in the old layouts (`_layouts/docs.html` etc.) used the path directly. PRs are trivial.
- **New (Starlight):** Content moved into `src/content/docs/docs/...` (note the double `docs/`). The frontmatter is Starlight-specific (`sidebar.order`, etc.). A community contributor coming from a `View Source` link has to grok Starlight's content collections conventions.
- **Case for the change:** Starlight gives sidebar autogeneration, TOC, search "for free".
- **Case against:** Higher contributor onboarding friction for doc PRs. Frontmatter conventions are subtle (e.g. `slug` collisions, `sidebar.label` vs `title`).
- **My read:** Net positive for site quality, slight negative for contributor experience. Document the new frontmatter contract in `README.md` (currently the new README is bare).

### 1j. Build determinism / portability

- **Old:** Plain Jekyll. `bundle exec jekyll build` on any machine with Ruby. No native deps beyond ImageMagick. ARM, x86, x86_64, all fine.
- **New:** `sharp` for image processing (works), and **Pagefind** which uses `jemalloc` with 4KB-page assumption. On 16KB-page systems (Apple Silicon Asahi, some ARM servers, this very sandbox), the build aborts at the Pagefind step. Production CI (GitHub Actions on `ubuntu-latest`) is 4KB and fine. Local development on M-series Macs running Asahi or some Linux ARM setups will hit it.
- **Case for the change:** Pagefind gives client-side search the old site never had.
- **Case against:** Real portability hit. Logged here only so the architecture teammate is aware.
- **My read:** Track upstream (`Pagefind` issue exists). Not a blocker. But the "zero errors" claim doesn't hold here.

### 1k. Static-site speed / page weight

This one goes the other way — the new site is reasonable:

- Homepage HTML: 20 KB.
- `dist/_astro/` total: 536 KB across all chunks.
- Biggest JS chunk: `ui-core.js` at 94 KB (Starlight runtime).

The old Jekyll site loaded jQuery, Font Awesome icon font, FontAwesome CDN CSS, plus inline scripts — comparable weight. The "Astro ships JS for hydration" critique doesn't really apply because there's almost no hydration; most of the site is pre-rendered. **Not a regression.**

---

## 2. Claim audit — PROGRESS.md, point-by-point

Marking each: **Verified** / **Partial** / **Stale** / **Wrong**.

### Phase 1: Architecture Cleanup

| Claim | Status | Evidence |
|---|---|---|
| Removed `lit`, `@semantic-ui/astro-lit` | Verified | not in package.json |
| Removed `unocss`, `@unocss/astro`, `@unocss/preset-wind`, `@unocss/preset-icons` | **Wrong** | All still in `package.json` devDependencies; `astro.config.mjs` line 4 imports `UnoCSS`, line 21 lists `UnoCSS()` integration; `uno.config.ts` still 57 lines. Footer uses `.i-simple-icons-*` classes that require `@unocss/preset-icons`. |
| Deleted `uno.config.ts` | **Wrong** | File still present, last modified May 12 14:47. |
| Created `src/utils/blog.ts` shared utilities | Verified | File exists, 47 lines. |
| Created `src/data/navigation.ts` | Verified | File exists. |
| Created `src/data/contributors.ts` (implicit) | **Partial** | File exists but is **imported by zero pages**. Dead data. |
| Added `name` field to all 47 users.ts entries for alt text | Verified | Spot-checked; alt text now uses `user.name` in index.astro line 152. |

### Phase 2: Bug Fixes

| Claim | Status | Evidence |
|---|---|---|
| Fixed about index duplicate route | Verified | URL audit shows `/about/` returns 200 OK with single landing. |
| Added `developing-flows` sidebar section | Verified | `astro.config.mjs` line 45. |
| Added CSS for Jekyll grid classes | Partial | Present in `src/styles/design-tokens.css` (need to verify all about pages use them). |

### Phase 3: Design Modernization

| Claim | Status | Evidence |
|---|---|---|
| `--nr-red: #C75050`, `--nr-bg-dark: #1E1E1E`, `--nr-text: #2D2D2D` | Verified | DESIGN_PLAN colors match. |
| 17px base, 1.7 line-height, 600 headings | Verified | `BaseLayout.astro` body and headings. |
| Modern hero with gradient + dual CTA | Verified | `src/pages/index.astro` hero section. |
| Multi-column footer Project/Community/Resources | Verified | `src/data/navigation.ts` footerLinks. **But:** the "Resources" column has "About Node-RED", "Governance", "License", "Resources" — four links, three of which are also in the sidebar. Lacks npm/APIs that were on master footer (section 1h above). |

### Phase 4: WCAG 2.2 AA Compliance

| Claim | Status | Evidence |
|---|---|---|
| Skip link on all layouts | Verified | `BaseLayout.astro:29`; need a11y teammate to confirm Starlight Header version. |
| Global `:focus-visible` with 3px solid #C75050 | Need verification | Couldn't find in design-tokens.css from search; a11y teammate to verify. |
| `aria-current="page"` on active nav | Verified | `BaseLayout.astro:47`. |
| Semantic breadcrumbs | Need verification | a11y teammate, please check. |
| `aria-hidden="true"` on decorative SVGs | Verified | Spot-checked hero arrows in index.astro. |
| `prefers-reduced-motion: reduce` | Need verification | Couldn't find by quick grep. a11y teammate to confirm. |
| All 5 axe-core audits passing | Trust but verify | a11y teammate, please confirm — and remember axe-core does not catch semantic-but-wrong heading order or skip-target-wrong-anchor problems. |

### Phase 5: Testing claim "47/47 E2E passing, 12/12 unit"

| Claim | Status | Evidence |
|---|---|---|
| Build: 212 pages, zero errors | **Stale** | Current `dist/` has **217 HTML files** (`find dist -name "*.html" | wc -l`). Page count drifted upward (post-Phase-5 additions). |
| Zero errors | **Wrong → Fixed in-flight (152c046)** | At audit start, `npx astro check` reported 8 errors + 18 hints. Architecture teammate fixed these mid-audit (commit `152c046`). Post-fix: 0 errors, 0 warnings, 18 hints. Pagefind crash remains (environmental, see section 1j). |
| 47/47 E2E passing | Not re-verified | I did not run Playwright here. Trust the architecture teammate, but the spec count is real: see `tests/e2e/*.spec.ts`. |

### Content Parity Phase 4: image/link integrity tests

| Claim | Status | Evidence |
|---|---|---|
| All about content validated — no remaining broken references | **Wrong** | URL audit `docs/audit-qa-urls.csv` shows **94 404s** under `/docs/api/modules/v/*` and 2 EMPTY pages (`/about/` and `/blog/rss/`). These are claimed-fixed in Phase 4/5 but weren't checked because the audit sample was limited to about + blog only. |
| Per the audit JSON: `totalImages: 43, brokenImages: 0` | Verified for the sample only | The image audit checks 10 sample pages × 4-ish images each. It does not cover docs, homepage, etc. Claim is true but narrower than implied. |

### Known Issues section

| Claim | Status | Evidence |
|---|---|---|
| `import-dupes.gif` and `git-workflow.png` 404 on both sites | Plausible | Not re-verified, but consistent with the audit findings. |

---

## 3. Hidden regressions (likely missed by other teammates)

### 3a. 137 versioned API reference HTML files dropped

- `git ls-tree -r master --name-only | grep docs/api/modules/v/` → 137 files (three full JSDoc-rendered API doc trees).
- `src/content/docs/docs/api/modules/index.md` STILL LINKS to `v/1.3`, `v/1.0`, `v/0.20.0` — those directories don't exist in new content.
- URL audit confirms **94** of these are 404 on the new site (the audit doesn't cover every leaf file, so the true number is higher — probably the full 137).
- This is the single largest content regression. Either:
  - (a) Copy the files into `public/docs/api/modules/v/` so they pass through unchanged (simplest, restores parity).
  - (b) Add redirects from each old path to a "this version is archived, see current API docs" notice.
  - (c) Delete the `src/content/docs/docs/api/modules/index.md` links so the modules-index page doesn't link to 404s.

This belongs to **parity** teammate.

### 3b. `/docs/platforms/*` and `/docs/hardware/*` redirects partial

`astro.config.mjs` redirects block has:
- `/docs/hardware/raspberrypi` → ✓
- `/docs/hardware/beagleboneblack` → ✓
- `/docs/platforms/docker` → ✓
- Missing: `/docs/platforms/aws`, `/docs/platforms/azure`, `/docs/platforms/android`, `/docs/hardware/arduino`, `/docs/hardware/beaglebone` (note the spelling — old was `beagleboneblack`)

All these URLs **currently 200 (as redirects) on live nodered.org**. Anyone with a bookmark or external link to `nodered.org/docs/platforms/azure` will 404 after the cut-over.

Parity teammate.

### 3c. `feed.xml` redirect target reachable but old format

- `astro.config.mjs` redirects `/feed.xml` → `/blog/rss/`. But on master, `/feed.xml` IS the actual RSS feed at the root — feed readers subscribed to `https://nodered.org/feed.xml` will now get an HTML redirect page, not RSS. **Most feed readers don't follow HTML redirects** for feeds.
- Should be either a 301 at the HTTP level (not a meta-refresh HTML page, which is what Astro's redirect produces by default for static output), OR `feed.xml` should be regenerated at the root.

Parity teammate.

### 3d. `/blog/rss/` itself returns "EMPTY" in audit

- URL audit: `/blog/rss/` → 200 but `has_main=false has_h1=false has_article=false`, 15 KB.
- This is probably the RSS XML rendered as HTML wrapper (BaseLayout?). RSS readers expect `Content-Type: application/rss+xml` and raw XML. If this is the case, RSS subscribers are silently broken.

Need to check `src/pages/blog/rss/index.html.ts`. Architecture / Parity teammate.

### 3e. Header GitHub link target inconsistency

- `src/data/navigation.ts` line 14: `mainNav` GitHub points to `https://github.com/node-red` (org).
- `astro.config.mjs` line 26 (Starlight social): GitHub points to `https://github.com/node-red/node-red` (the repo).
- **The Starlight Header on docs pages and the BaseLayout Header on the rest of the site point to DIFFERENT URLs for GitHub.**

This contradicts PROGRESS.md Content Parity Phase 2 which claimed "Changed GitHub link from https://github.com/node-red/node-red to https://github.com/node-red (header nav, footer, homepage)". The Starlight Header didn't get updated.

Architecture teammate. Trivial one-line fix in `astro.config.mjs`.

### 3f. "Slack" redirect target is the live site (self-loop)

- `astro.config.mjs` line 21: `'/slack': 'https://nodered.org/slack'`.
- After the new site goes live at nodered.org, `/slack` will redirect to `https://nodered.org/slack` which is itself the redirect target. Either an infinite loop, or (more likely, since this is a build-time static redirect) the redirect page redirects to itself once.
- The intent is presumably to send to the live Slack signup endpoint. Verified: master does **not** have `slack/index.html` — `/slack` was served by an external gateway / server config not represented in the repo. So the redirect target `https://nodered.org/slack` is what hits the host-level Slack auto-invite mechanism. **Only a regression if the new deployment doesn't preserve that host-level handler.** Probably out of scope here, but worth flagging to whoever owns the deployment config.

Architecture/Parity teammate / deployment owner.

### 3g. `about/resources` content type discrepancy

- Old: `about/resources/index.html` (raw HTML page).
- New: `src/content/about/resources/index.md`.
- Markdown render won't preserve the raw HTML structure. Recommend a visual diff at `/about/resources/` (UX teammate has owner here).

### 3h. Survey JSON & charts.js: present but unverified

- `public/about/community/survey/2019/charts.js` and `.../2023/charts.js` are present.
- `src/content/about/community/survey/2019/data.json` and `.../2023/data-2023.json` are present.
- But there's **no markdown content that loads charts.js**. The survey index.md files have been migrated to markdown — do they include the right `<script src="charts.js">` tags? Markdown by default strips/escapes raw HTML; Starlight allows MDX but the files are `.md`.
- Likely manifestation: survey pages render text but **the charts don't draw**. Manual verification needed (open `/about/community/survey/2023/` and see if Chart.js loads).

a11y/ux teammate to verify visually.

### 3i. Mobile menu hamburger has no role / aria-controls

`src/layouts/BaseLayout.astro:54` —
```html
<button class="mobile-toggle" aria-label="Toggle menu" aria-expanded="false">
```

Missing: `aria-controls="mobile-nav-id"`. Also the `<nav class="mobile-nav" aria-hidden="true">` lacks an `id`. Screen readers can't programmatically connect the disclosure button to its target.

Minor a11y gap. a11y teammate.

### 3j. Sitewide use of `class:list` with `is-active` but no current-section logic for `/blog/`

- `BaseLayout.astro:44`: active state is `currentPath.startsWith(item.href)`. For `/blog/2024/06/20/version-4-0-released/`, the blog nav item should be active. Test: this works because `/blog/2024/...startsWith('/blog/')` is true. **However**, for `/about/community/slack/`, both `/` (home) and `/about/` would be candidates — let me re-read line 44…

Line 44 fix is: `item.href === '/' ? currentPath === '/' : currentPath.startsWith(item.href)` — looks correct. False alarm. Withdrawing.

### 3k. The "trusted by" logos are silently filtered to alphabetical-first-12

Already covered in 1f. Just flagging for the parity teammate to consider: this isn't a 404, it's missing content that's present in the data file.

### 3l. Plausible analytics dropped

- Master footer line: `<script defer data-domain="nodered.org" src="https://plausible.io/js/plausible.js"></script>`
- New site: no Plausible script. Search confirms zero matches for `plausible` across the repo.
- **Case for the change:** GDPR-friendlier to ship analytics-free; team can re-add when they want.
- **Case against:** Project loses traffic visibility. If the OpenJS Foundation wants metrics, this is a regression.
- **My read:** Probably intentional, but should be a conscious decision documented somewhere. Flagging.

### 3m. CNAME file

- Master has `CNAME` at the root (for GitHub Pages custom domain).
- New `public/CNAME` exists. Verified. **No regression.** Withdrawing as a concern.

### 3n. README.md is a wholesale rewrite

- Master `README.md` documented the Jekyll site, contributor expectations, link to the old contributor docs.
- New `README.md` is shorter and Astro-focused. Anyone arriving from a Jekyll-era contributor link gets a different doc.
- Minor. Not a regression in user experience, but a small DX hit.

---

## 4. Worth-it analysis — has the migration delivered value commensurate with cost?

### Cost (commits and complexity)

- 18 commits on `sbxa/20260512-144723` since `master`.
- `git diff master..HEAD --stat` ends with: `989 files changed, 26,072 insertions(+), 192,011 deletions(-)`.
- The 192K deletions are mostly Jekyll's `_site` build artefacts that were tracked in master — not real removed source. Real source removed: the `_includes/`, `_layouts/`, `_data/`, `images/`, `docs/api/modules/v/`, `_posts/` (now under `src/content/blog`).
- New machinery: Astro 6 + Starlight, UnoCSS (despite PROGRESS claim of removal), Pagefind, ESLint 9, Prettier, axe-core, Playwright, Vitest, Lighthouse CI, sharp, TypeScript 6.
- Build time: master Jekyll built in a few seconds; new Astro+Pagefind+sharp build is ~8+ min on a cold cache (per protocol note); ~11s on warm cache + Pagefind crash on this arch.
- Two stylesheets: `design-tokens.css` (301 lines) + `starlight-custom.css` (504 lines). The Starlight override file is large because Starlight's defaults don't match the Node-RED brand. Ongoing upgrade cost — every Starlight major bump requires re-checking these overrides.

### Value delivered

- ✓ Modern visual design (subjective: cleaner; objective: less information per pixel).
- ✓ Pagefind client-side search (master had no search at all).
- ✓ Starlight docs portal with proper TOC, sidebar autogen, dark mode.
- ✓ axe-core CI gate.
- ✓ E2E test suite (47 specs).
- ✓ TypeScript-typed content schemas.
- ✓ Sitemap, RSS via `@astrojs/rss`.
- ✗ Several content regressions (sections 1, 3).
- ✗ Build no longer plain HTML — contributor barrier slightly raised.
- ✗ Dependency footprint up from "Ruby + Jekyll plugins" to ~30 npm dev deps with monthly CVE churn.

### My read

The migration is **net positive but premature to call complete**. The "Phase 5: All complete" framing in PROGRESS.md is the problem — not the migration itself. There are 6–10 hours of work left across the team to:

1. Restore homepage content density (contributors, blog feed, full users grid, version badge).
2. Add the missing 5 redirects.
3. Either restore or formally archive the 137 API reference files.
4. Fix the 8 `astro check` errors and the GitHub-link inconsistency.
5. Verify survey charts actually render.

After that it's a genuine improvement. Reverting is **not** recommended — the upside on docs IA and accessibility alone justifies it.

---

## 5. Recommendations (prioritised)

### P0 — blocks honest "complete" claim

1. **Fix the 137 `/docs/api/modules/v/*` 404s.** Either copy the static HTML into `public/docs/api/modules/v/` or remove the dead links from `src/content/docs/docs/api/modules/index.md`. (Parity)
2. **Update PROGRESS.md.** Phase 1 claims about UnoCSS removal are false; "zero errors" is false; "212 pages" is stale (217). Honest status > marketing status. (Anyone owning PROGRESS.md.)
3. **Add the missing redirects** for `/docs/platforms/aws`, `/docs/platforms/azure`, `/docs/platforms/android`, `/docs/hardware/arduino`. (Parity)
4. **Fix Starlight GitHub link** in `astro.config.mjs` line 26 from `node-red/node-red` to `node-red` to match the rest of the site. (Architecture)

### P1 — visible UX regressions

5. **Restore homepage contributors strip** using `src/data/contributors.ts`. (UX)
6. **Restore homepage npm-version badge.** 1KB inline fetch from registry.npmjs.org. (UX or Architecture)
7. **Restore "Latest posts" mini-feed** on the homepage (replace one Community card or add a new section). (UX)
8. **Render all 47 "Trusted by" logos**, not just the first 12. Optionally randomise per build. (UX)
9. **Add Stack Overflow** back to the Community grid or to the footer. (UX)
10. **Verify survey charts render** at `/about/community/survey/2019/` and `2023/`. The `.js` is in `public/` but the markdown might not load it. (UX with help from a11y)

### P2 — quality

11. **Resolve the UnoCSS situation.** Either fully remove (and replace the `.i-simple-icons-*` footer icons with inline SVG), or update PROGRESS.md to acknowledge it stays. (Architecture)
12. ~~**Fix the 8 `astro check` errors**~~ — **DONE in 152c046** by architecture teammate. `npm run build` now passes check.
13. **Track Pagefind/jemalloc upstream** for 16KB-page support; document the workaround for local dev. (Architecture)
14. **Ensure `feed.xml` continues to serve RSS,** not an HTML meta-refresh page. Likely needs a `public/feed.xml` that serves real RSS or a server-side 301. (Architecture/Parity)
15. **Add `rel="me"`** to footer Mastodon link — actually already there (line 123). False alarm; just noting for completeness.

### P3 — nice-to-have

16. **Reinstate sponsor acknowledgement** ("Sponsored by FlowFuse, past sponsors IBM/Hitachi") somewhere prominent (footer or homepage). (UX)
17. **Document the new content frontmatter contract** in README.md so external contributors can write PRs. (Anyone.)
18. **Verify CNAME** is in `public/` for GitHub Pages custom domain. (Architecture)
19. **Consider keeping Plausible** analytics or formally documenting the removal. (Architecture)
20. **Document the Starlight overrides** in `starlight-custom.css` with comments — 504 lines of CSS is a future-maintenance liability if anyone other than the original author needs to touch them.

### Revert candidates

**None.** Despite the regressions, the migration's upside on docs, search, a11y testing, and theming is genuine. All issues above are fixable in days, not weeks.

---

## 6. Cross-checks of other reports

*This section will be appended as the other 4 teammates' reports land in `docs/audit-ux/team/*-report.md`. As of the first save, no peer reports are present.*

### 6a. UX teammate (ux-report.md) — pending

### 6b. Architecture teammate (architecture-report.md) — pending

### 6c. A11y teammate (a11y-report.md) — pending

### 6d. Parity teammate (parity-report.md) — pending

---

## Method

- Read PROGRESS.md, DESIGN_PLAN.md, TEAM-PROTOCOL.md in full.
- `git log master..HEAD --oneline` (18 commits) and `git diff master..HEAD --stat` (989 files).
- `git show master:index.html`, `git show master:_includes/footer.html`, `git show master:_includes/header.html`, `git show master:docs/api/modules/v/0.20.0-beta.2/index.html`.
- `git ls-tree -r master --name-only` — 872 files on master; 137 API references; 27 about; 52 posts; 439 docs.
- WebFetch on `https://nodered.org/`, `/docs/api/modules/`, `/docs/api/modules/v/0.20.0-beta.2/`, `/docs/platforms/aws`, `/docs/hardware/raspberrypi`, `/docs/platforms/docker` — verified each is either content or active redirect on the live old site.
- `npx astro build` — confirmed Pagefind/jemalloc crash on this arch (216 HTMLs generated before crash).
- `npx astro check` — confirmed 8 errors, 18 hints (not "zero").
- `docs/audit-qa-urls.csv` (300 rows) — found 94 404s and 2 EMPTY pages.
- `docs/audit-qa-images.json` — sample of 10 pages; 43 images checked, 0 broken (but sample is narrow).
- Read `src/pages/index.astro` (617 lines), `src/layouts/BaseLayout.astro`, `src/data/navigation.ts`, `src/data/contributors.ts`, `package.json`, `astro.config.mjs`.
- `find src/content -type f | wc -l` (381) vs master content (518 about/docs/_posts source files).
- Visual comparison: `docs/audit-ux/home-1440-OLD-full.png` vs `docs/audit-ux/home-1440-full.png` and the research baseline screenshots.

No code or content edited. Only this file (`docs/audit-ux/team/devils-advocate.md`) and one append to `docs/audit-ux/team/TEAM-LOG.md`.
