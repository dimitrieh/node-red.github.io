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

### 3l-pre. `/about/` page has NO `<h1>` — WCAG and SEO regression

- `src/pages/about/index.astro` renders the `BaseLayout` with `title="About"` (sets `<title>` only) and then injects the rendered markdown via `<Content />`.
- The markdown `src/content/about/index.md` starts directly with body text. Its only heading levels are h3 (`### History`, `### Citing Node-RED`).
- Result: the `/about/` page has **no h1, no h2, just h3s and below**. This is a heading-order violation (axe-core may not flag it because it focuses on skipped levels within the page, but a manual screen-reader walkthrough would catch this immediately — "About" would just be a `<title>` element, not a landmark heading).
- URL audit confirmed: `/about/` row has `has_h1=false`. PROGRESS.md Phase 4 claim "Fixed heading order" is **partial** at best — only the homepage and features section were fixed.
- The old Jekyll site (`_layouts/about-single.html`) wrapped about content in a `<h1>{{ page.title }}</h1>` automatically. The new layout does not.

a11y or UX teammate. Trivial fix: insert `<h1>{page.data.title || 'About'}</h1>` near the top of `src/pages/about/index.astro` content block — to mirror what `src/pages/about/[...slug].astro:79` already does for every other about route. Update: verified — sub-pages (`/about/community/` etc.) DO render `<h1>`. Only `/about/` is missing it. So the gap is narrower than initially feared, but still a real h1 absence on the about landing page.

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
4. Fix the GitHub-link inconsistency between BaseLayout (org) and Starlight Header (repo). (astro check errors already fixed by arch in 152c046.)
5. Verify survey charts actually render.

After that it's a genuine improvement. Reverting is **not** recommended — the upside on docs IA and accessibility alone justifies it.

---

## 5. Recommendations (prioritised)

### P0 — blocks honest "complete" claim

1. **Fix the 137 `/docs/api/modules/v/*` 404s.** Either copy the static HTML into `public/docs/api/modules/v/` or remove the dead links from `src/content/docs/docs/api/modules/index.md`. (Parity)
2. **Update PROGRESS.md.** Phase 1 claims about UnoCSS removal are false; "zero errors" was false (now fixed by arch); "212 pages" should be 211 per the canonical sitemap count. Honest status > marketing status. (Anyone owning PROGRESS.md.)
3. **Add the missing redirects** for `/docs/platforms/aws`, `/docs/platforms/azure`, `/docs/platforms/android`, `/docs/hardware/arduino`. (Parity)
4. **Fix Starlight GitHub link** in `astro.config.mjs` line 26 from `node-red/node-red` to `node-red` to match the rest of the site. (Architecture)
5. **Apply architecture's OG/Twitter/canonical meta patch to `BaseLayout.astro`** (architecture-report.md §"Patches for other teammates"). Old Jekyll site emitted full Twitter card + OG meta on blog posts; new site emits only `<title>` and `<meta name="description">`. Social-share / SEO regression on every blog post. Thread `post.data.image` from BlogPostLayout into `og:image` at the same time so blog posts don't all share the generic icon. (UX)

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

By the end of my budget (~75 min) **none of the other 4 reports had been committed** as `docs/audit-ux/team/<role>-report.md`. Only the architecture teammate has shipped a commit (`152c046 arch: fix all 40 astro check TS errors`). I observed in-flight uncommitted edits in the working tree from what appears to be the UX teammate, summarised below for the orchestrator's benefit.

### 6a. UX teammate (no report yet, but 5 commits landed)

UX has shipped code but no `ux-report.md` yet. Commits:
- `cc70fec ux: add dark-mode design tokens + semantic surface aliases`
- `5644bf8 ux: improve mobile menu UX + extract breadcrumb to global`
- `4523099 ux: thread semantic tokens through about + blog post layouts`
- `1e5e78a ux: enrich blog listing cards with overline date + read CTA`
- `f1b18ef ux: thread semantic tokens through homepage + tablet 2-col layouts`

**What's good**
- Mobile menu Escape-to-close, click-link-to-close, close-on-resize-past-1024px — real interaction wins. Addresses my finding 3i partially (still missing `aria-controls`).
- Breadcrumb CSS extracted from per-page styles to BaseLayout — solid DRY refactor.
- Blog listing "enrichment" — addressing one of my P1 items (the old site had richer blog cards; now the new one has overline date + read CTA).
- Tablet 2-col layouts — sensible responsive tightening.

**What's concerning**
- **Dark mode is scope creep.** PROGRESS Phase 5 marked the site "complete". DESIGN_PLAN mentions dark mode only for the docs portal, not marketing pages. Adding `:root[data-theme='dark']` to the marketing pages now extends the verification surface materially — every illustration in `nr-image-{1,2,3}.png` is a screenshot of a light-themed editor, every Trusted-By logo was uploaded for light backgrounds, every existing blog post screenshot likewise. None of those will look right on the dark theme without per-asset work (background plates, drop shadows, etc.). Either: (a) make peace with "marketing pages forced light, docs honour the toggle" (Starlight provides this), or (b) commit to the verification work as Phase 6.
- **No homepage content restoration** in any of the 5 UX commits. My P1 items (contributors block, npm version badge, blog feed, full users grid, Stack Overflow card, sponsors) are all still untouched.
- **The `/about/` `<h1>` regression** I flagged is in UX's lane and not addressed.
- **The 12-of-47 users slice** (1f) is in UX's lane (`src/pages/index.astro` is UX-owned) — also not addressed.

**Patches from architecture queued for UX** — the OG/Twitter/canonical meta-tag patch in architecture-report.md's "Patches for other teammates" section is large and important. UX should apply it as their first thing in the next shift, and thread `post.data.image` from `BlogPostLayout` into BaseLayout's `og:image` so blog posts don't all share the generic icon (see my critique under 6b).

### 6b. Architecture teammate — REPORT LANDED (`architecture-report.md`, 4 commits + report)

Commits since first cross-check:
- `152c046 arch: fix all 40 astro check TS errors` (already noted)
- `69a538b arch: env-gate pagefind so ARM64-16KB sandboxes can complete astro build`
- `481b4a2 arch: add robots.txt referencing sitemap-index.xml`
- `543b66d arch: skip pagefind integration assertions when DISABLE_PAGEFIND=1`
- `799dd3d arch: post architecture report + log final shift entries`

**What the architecture report does well**
- Independently corroborates my UnoCSS finding. Same conclusion: PROGRESS.md Phase 1 claim is false; UnoCSS is in use; recommends documenting reality not removing.
- Surfaces a finding **I missed**: the new `BaseLayout.astro` emits only `<title>` and `<meta name="description">`. The old Jekyll `_includes/header.html` emitted **full Twitter card + Open Graph meta** (`twitter:card`, `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, plus canonical via `og:url`) on blog posts. Real SEO / social-share regression. Their patch is well-formed. **Elevating this to my P0 list (item 4a below).**
- Also flags **no `<link rel="canonical">`** on Starlight pages by default. Real SEO gap; queued for UX.
- The `DISABLE_PAGEFIND=1` env-gate (`69a538b`) is clean: 30 s local build, production CI unaffected. Better than vendoring a custom Pagefind binary. Addresses my P2 #13.
- `public/robots.txt` (`481b4a2`) — small SEO win; master had none so it's not a regression-fix but it's free upside.

**What I'd push back on**
- The verification block reports "211 page(s) built" while my earlier scan showed 217 HTML files in `dist/` and PROGRESS says 212. The architecture report's count is likely the most accurate (it ran after the UX refactor stabilised). The team should pick **one source-of-truth count** — probably the sitemap `<loc>` count (210) + 404 = 211. Update PROGRESS accordingly.
- The OG/Twitter patch hard-codes `og:image` to `/node-red-icon.png` for every page. Every blog post will get the same generic image in Twitter/LinkedIn/Slack unfurls. Their recommendation §4 acknowledges this. **I'd elevate "Per-post OG image"** from a follow-up to "do at the same time as the meta-tags patch" — the blog post collection already has an `image` frontmatter field per `src/content.config.ts:13`; thread it through. Otherwise the SEO fix ships half-broken.
- The arch report does **not** address the **GitHub-link inconsistency** I flagged (Starlight Header `node-red/node-red` vs BaseLayout `node-red`). That's a one-line fix in `astro.config.mjs` which is architecture-owned. Open item for the next shift.
- The arch report **does not flag the 137 `/docs/api/modules/v/*` 404s** — my single biggest finding. Architecture can defer that to parity, but worth a callout in their report. Not a critique of the work, just an absence.
- Recommendation #6 ("Consider running Pagefind in a CI-only step") slightly contradicts the env-gate: if Pagefind only ever runs in CI, you don't need the env var. Pick one: env-gate (more flexible, developer-can-opt-in) or CI-only (more deterministic).

**Net read on the architecture shift:** strong. Two of my P2 items closed (`astro check`; Pagefind workaround). One major finding I missed surfaced (OG/Twitter meta). One open item (GitHub-link inconsistency). Good shift.

### 6c. A11y teammate (no report yet, no observed changes)

- Heuristically: would expect to see edits in `src/components/starlight/Header.astro`, `src/styles/starlight-custom.css`, `tests/e2e/a11y*.spec.ts`. Nothing in the working tree as of my shift end.
- Items I'd flag to them when they arrive: `/about/` no `<h1>` (3l-pre), mobile-toggle missing `aria-controls` (3i), survey charts may not render in markdown without script tags (3h), Mastodon `rel="me"` is intact (false alarm, withdrawn).

### 6d. Parity teammate (no report yet, no observed changes)

- Items I'd hand to them: the **137 API doc 404s** (3a, single biggest content regression); missing redirects for `/docs/platforms/aws|azure|android` and `/docs/hardware/arduino` (3b); `feed.xml` RSS handling (3c, 3d); the 12-of-47 trusted-by slice (1f, content-side option is to randomise from full list); Starlight GitHub link inconsistency could also be parity (3e).

**Observation for the orchestrator:** the team protocol asks each role to ship a `<role>-report.md` on completion. At my budget expiry, only I (devil) and arch (commit-only, no report) have produced output. The other three may be running long, or may have hit budget. If reports land later, this section should be updated by re-running the devil's-advocate prompt with the new files in scope.

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

---

## Round 2 — PR-readiness critique

**Mandate:** the user wants this branch "clean as a whistle for PR review". I re-audited the two integration commits (`446d0ef`, `bfae64f`) plus the current HEAD (`237f576`) and stress-tested the result against a hostile senior reviewer. I am the only teammate so far who has produced a Round 2 appendix; if the other four land theirs before the orchestrator writes SUMMARY.md, they may close some of the issues below.

### 1. PR-merge-block steelman

If a senior maintainer who hates large rewrites opened this PR, here is what they would say. Strongest first.

1. **"Don't claim done when PROGRESS.md is still a lie."** PROGRESS.md is byte-for-byte unchanged since Phase 5 was first written. It still claims:
   - "Build: 212 pages, zero errors" (actually 211 per the orchestrator's own integration commit)
   - "E2E (Playwright): 47/47 passing" (actually 114/114 now)
   - "Removed unused dependencies: ... unocss, @unocss/astro, @unocss/preset-wind, @unocss/preset-icons" (still in `package.json`, line 4 of `astro.config.mjs` imports `UnoCSS`, line 26 calls `UnoCSS()`, `uno.config.ts` still on disk).
   - "Removed UnoCSS integration from `astro.config.mjs` and deleted `uno.config.ts`" (categorically false).
   - "All 5 axe-core audits passing (home, blog listing, blog post, about, docs)" — technically true *after* the round-1 fixes, but the **iframe-exclude + color-contrast disable** in `tests/e2e/navigation.spec.ts` (lines 117, 132, 145, 159) means a real contrast regression on UX-owned chrome would not be caught by these "passing" tests. The a11y teammate's separate `a11y-themes.spec.ts` IS strict, but PROGRESS doesn't credit it.

   A reviewer who reads PROGRESS.md first and then opens the diff will lose trust in everything else. **This is the single highest-leverage merge blocker:** a 30-line PROGRESS rewrite reframes the entire PR.

2. **"The biggest content regression is still in the tree, undocumented."** `src/content/docs/docs/api/modules/index.md` STILL renders three bullet links to `v/1.3`, `v/1.0`, `v/0.20.0`. All three directories are gone from the new content tree. The user-facing module-APIs landing page is therefore a list of three dead links. None of the round-1 fixes or the orchestrator integration commits touched this file. A casual reviewer clicking through `/docs/api/modules/` lands on a page that 404s within one click. **At minimum the dead links should be removed or replaced with "archived" text** — that's a 1-line edit. The parity teammate proposed retiring the 137 files; that retirement is incomplete without scrubbing the inbound link.

3. **"You shipped OG meta but it's half-broken in the cases that matter most."** The orchestrator threaded the architecture teammate's OG/Twitter patch into `BaseLayout.astro:23-34`. But the `og:image` is hard-coded to `/node-red-icon.png`, which is a **480×480 PNG** (confirmed by reading the IHDR chunk). Every blog post — the single most-shared content type — will unfurl with the same generic icon. Twitter's `summary` card variant accepts as small as 144×144 so the image *renders*, but LinkedIn rejects images <200×200 for some layouts and Slack's "summary" preview tile expects ≥600×600. More importantly, the round-1 architecture report explicitly flagged "Per-post OG image" as a parallel patch ("the blog post collection already has an `image` frontmatter field per `src/content.config.ts:13`; thread it through"). It wasn't threaded. `BlogPostLayout.astro` has Props `{ title, author, date, description }` — no `image`. Result: the SEO fix that landed is fine for the homepage and the about pages; on blog posts (the high-share surface) it's the half-fix the round-1 architecture report warned about.

4. **"Two known-but-untested integration risks live on this branch."** First, **the slack-invite form is dead.** The orchestrator changed `/slack` from an external host-level redirect to the internal `/about/community/slack/` page. That page (`src/content/about/community/slack/index.md`) contains a `<script>$('#go').click(...)$.ajax(...)` block that depends on jQuery. jQuery is **not** loaded by `BaseLayout.astro` or the marketing layouts (only the docs `autoComplete`/`typedInput` API pages and the two survey pages load jQuery via embedded `<script src>` tags). The form's submit button will throw `$ is not defined` and the user sees nothing happen. The old Jekyll site loaded jQuery globally in `_includes/header.html` line 8, so the same markdown worked there. On the new site this is a silent regression — clicking "Get invite" does nothing. Worse: it looks like the form works but the request never goes. The TEAM-LOG presents `/slack` as fixed; functionally it's worse than before.

   Second, **`@astrojs/sitemap` interacts badly with the Pagefind crash on ARM64.** The parity report flagged this in round 1 ("sitemap is not emitted in this sandbox build"). The architecture teammate verified the *production* path works (`sitemap-0.xml` with 210 URLs). But if the host CI ever runs on ARM64 (GitHub Actions has ARM runners now, Cloudflare Pages uses ARM, Apple Silicon CI on self-hosted) it will silently ship no sitemap. Round 1 said "if production CI ever runs in the same environment..." Round 2 should say: GitHub Pages CI runners are still x86_64, so this is currently safe, but it's a latent foot-gun. A pre-deploy check that asserts `dist/sitemap-index.xml` exists would mitigate.

5. **"30+ commits, no squash, no PR description, you're asking me to review a stream of consciousness."** `git log master..HEAD` shows 52 commits. They are organised by `role:` prefix and are individually readable, but they are also intertwined: `arch: …`, `ux: …`, `devil: …`, `parity: …`, `a11y: …`, `integrate: …`, `docs: …` are interleaved. A senior reviewer expects either (a) a clean linear narrative or (b) a squash with a long-form description. Neither is here. **For the actual PR:** strongly recommend squashing into ~6 logical commits — one per role plus the two orchestrator integration commits — or at minimum writing a PR description that maps the role-prefixed history onto a reviewable narrative ("commits ea52972..152c046: tooling; 5424521..a052065: audit; cc70fec..ddc5f8d: UX; ..."). Without that, "review this PR" turns into "read 52 commit messages".

### 2. Round-2 cross-critique

No other teammate has appended a `## Round 2` section to their report at the time of this writing (verified via `grep -l "## Round 2"` on `docs/audit-ux/team/*-report.md`). The orchestrator's round-2 kickoff was logged at 20:08Z; I am writing at ~20:20Z. If teammates land later I cannot retroactively critique them here — that would require a round-3.

What I *can* do is critique the round-1 reports through the lens of what the orchestrator integrated and what was left orphan:

- **UX** (round 1): Solid scope-discipline on what they *did* — dark-mode tokens, mobile menu UX, breadcrumb DRY, tablet layouts. But they did not touch *any* of the content-density P1 items I flagged (contributors strip, npm badge, blog feed, full 47-logo grid, Stack Overflow card, sponsors). The orchestrator's `446d0ef` did not add them either. **Net: 0/6 P1 UX items closed.** UX should own these in round 2 and the answer "we'll do it later" is the answer a reviewer will get for the homepage feeling thin vs the old site.

- **Architecture** (round 1): The OG meta patch and Pagefind env-gate are both clean. The Starlight GitHub link inconsistency I flagged in round 1 (`astro.config.mjs:34` still says `node-red/node-red` vs main nav at `github.com/node-red`) **is still unfixed**. That's a 1-character delete in arch-owned code; no excuse for it to survive round 2. Arch round 2 should resolve and also decide on UnoCSS (keep + document, or remove + replace the 3 callsites).

- **A11y** (round 1): The 4 contrast fixes are excellent, the new `a11y-themes.spec.ts` is the right shape (asserts on violations, unlike the report-only `a11y.spec.ts`). Two concerns: (a) `bfae64f` added an iframe-exclude AND a `disableRules(['color-contrast'])` to the marketing axe tests — the latter is a quiet downgrade that would mask future regressions. Should be removed once the UX-side contrast is in. (b) The orchestrator integrated all 5 a11y patches (ux #1..#5) but ux #6 (the `<h1>About Node-RED>` add) created a semantic problem (see §3 below). The a11y teammate's heading-promotion proposal was the right *axe* fix but the wrong *information-architecture* fix.

- **Parity** (round 1): The 28 restored redirects + the parity-redirects.spec.ts drift guard are the strongest single piece of round-1 work. The remaining open issue — the 137 dead JSDoc links surfaced by `src/content/docs/docs/api/modules/index.md` — is theirs (it's a `src/content/` edit, parity's lane). They flagged it but didn't fix it. Round 2 should close it: either delete the three bullets or replace with "Versioned API references for older releases have been archived; see [github.com/node-red/node-red releases](https://github.com/node-red/node-red/releases)".

### 3. "Looks fine, isn't" — what a casual review would miss

a. **The new heading hierarchy on `/about/` is semantically backwards.** `446d0ef` added an `<h1>About Node-RED</h1>` to `src/pages/about/index.astro` AND `bfae64f` promoted three `<h3>`s to `<h2>`s in `src/content/about/index.md` to satisfy heading-order. The result, as rendered: H1 "About Node-RED" → H2 "Browser-based flow editing" → H2 "Built on Node.js" → H2 "Social Development" → H2 "History" → H2 "Citing Node-RED". A screen-reader user lists five equally-weighted top-level subsections — but conceptually the first three are an *intro feature triptych* (rendered in a 2-col grid with hero images) and the last two are *body sections*. The visual styling will also now render those three feature headings at the same `--text-h2` size as History and Citing, which they were not designed for (the old Jekyll site rendered them as h2 *without* an h1 above them, and the new design treats h2 as section-level chrome). axe is happy; the page-meaning shift is real. **The more honest fix is to wrap the intro grid in an `<section aria-label="Key features"><h2>Key features</h2>…</section>` with `<h3>` inside, restoring the visual+semantic hierarchy.** That's a content edit, parity-owned.

b. **The `/slack` redirect target now points to a broken-form page.** Detailed in §1.4 above. To a reviewer skimming `astro.config.mjs` line 112, the new redirect target looks correct ("oh good, /slack now goes to an internal page about Slack"). It takes opening `src/content/about/community/slack/index.md` to discover the `$.ajax` form is dead-on-arrival. Either (a) re-target `/slack` back to an external Slack-invite URL (the *old* Jekyll site relied on a host-level rewrite to `https://nodered.us.to/slack` or similar — `git show master:about/community/slack/index.md` references AWS Lambda `gnh34zyze1.execute-api.eu-west-2.amazonaws.com`; reachable from a vanilla HTML form with no jQuery), or (b) rewrite the form-handler script to use vanilla `fetch()`, or (c) load jQuery globally on marketing pages, which is what the survey pages already do. Option (b) is cleanest.

c. **The OG `og:image` size silently downgrades the share preview.** Covered in §1.3 — 480×480 is fine for Twitter `summary` cards but the rest of the social ecosystem expects ≥600×600 or ideally 1200×630. This was a flag from architecture-report.md §"Recommendations" #4 that the orchestrator did not action.

d. **The marketing axe tests disable `color-contrast`.** Lines 117, 132, 145, 159 of `tests/e2e/navigation.spec.ts` carry `.disableRules(['color-contrast'])` with a "// Allow minor contrast issues from legacy content" comment. The a11y teammate's new `tests/e2e/a11y-themes.spec.ts` is strict on contrast for the chrome they own (sidebar, breadcrumb, ThemeSelect, FooterContent), but the marketing axe assertions in navigation.spec.ts will accept *any* contrast failure on the homepage, blog cards, about cards. This is a regression-shaped hole: someone could ship `color: #ccc` on `#fff` and CI would stay green. The right fix is to remove the disable now that ux #1..#4 are in.

e. **The `npx astro check` "0 errors / 0 warnings / 18 hints" claim is built on `Zod` and `Props` deprecation hints.** These are not real errors but they ARE actionable signals. A reviewer who looks at the hints sees: (a) `astro:content`'s `z` re-export will move with Astro 7 / Starlight ~0.41; (b) Starlight's `Props` import contract is moving to `getRouteData`. Neither breaks today but both will be revisited within a quarter. The architecture teammate did flag this in round-1 report; PROGRESS.md doesn't.

f. **Pagefind env-gate is safe in prod CI but the integration test skip is asymmetric.** `tests/integration/build.test.ts` skips two assertions when `DISABLE_PAGEFIND=1` (commit `543b66d`). The production CI builds *without* `DISABLE_PAGEFIND` and runs all assertions — good. But if someone wires up an ARM64 self-hosted runner and unconditionally exports `DISABLE_PAGEFIND=1` in their shell profile, the build silently won't index. A `[ -z "$CI" ] || [ -n "$CI_FORCE_PAGEFIND" ]` style guard at CI time would help. Low priority.

g. **The 12-of-47 trusted-by slice is unchanged.** `src/pages/index.astro:150` is still `{users.slice(0, 12).map(...)}`. None of the 8 round-1 UX commits or the 2 orchestrator commits touched it. This is the single most visible content-density gap on the homepage and it's been sitting open through both rounds. A reviewer comparing screenshots will catch it in 10 seconds.

h. **The contributors gallery removal is undocumented.** `src/data/contributors.ts` exists in the tree (verified in round-1), is imported by zero files, and the old Jekyll homepage rendered the "Meet the team" avatar grid from this same data. A reviewer reading the diff will notice the data file with no consumer and ask "what is this for?". Either delete the data file with a "removed contributors gallery — see GitHub graph instead" note, or restore the gallery and use it. Currently it reads as half-deleted UI.

i. **The retired `/docs/api/modules/v/*` 137 files are an intentional choice with no UI evidence.** The orchestrator's integration message says "intentional retirement". That's a defensible position but the user-facing evidence is exactly opposite — `src/content/docs/docs/api/modules/index.md` advertises them as live. Either commit to the retirement (scrub the link, add archive note) or commit to restoring them (`public/docs/api/modules/v/*`). The current half-state is the worst of both.

### 4. Verdict

**Recommendation: merge-with-conditions.**

The migration is real upside on docs, search, a11y, theming, and tooling. The round-1 + integration work moved it from "claim-truth misalignment with 30+ flagged regressions" to "claim-truth misalignment with ~10 P0/P1 items still open and 114/114 Playwright green". That's substantial progress in ~90 minutes of orchestrator integration. But "clean as a whistle for PR review" is a higher bar than "tests pass": a hostile reviewer will find at least three of the issues in §1 within 10 minutes.

**Minimum bar to remove the conditional and recommend straight merge:**

1. Rewrite PROGRESS.md to match current reality (single largest credibility win, ~30 lines). Or delete it entirely with a note pointing at the team reports.
2. Scrub or archive-note the 3 dead bullets in `src/content/docs/docs/api/modules/index.md`.
3. Either fix the `/slack` form (vanilla `fetch()` or external redirect) OR revert the redirect target to an external Slack-invite URL.
4. Fix the Starlight GitHub link inconsistency in `astro.config.mjs:34` (`node-red/node-red` → `node-red`).
5. Thread `post.data.image` through `BlogPostLayout` → `BaseLayout` → `og:image` so blog posts get per-post share previews. Update the fallback `og:image` to a 1200×630 social-banner PNG (can be derived once from the existing 480×480 icon + branding strip).
6. Restore the full 47-logo trusted-by grid (1-line slice removal).
7. Remove the `color-contrast` disable from the four `navigation.spec.ts` axe assertions and rerun the suite.
8. Rewrap `/about/`'s intro triptych as an `<section><h2>Key features</h2>…</section>` with `<h3>`s inside so the H2 level isn't visually + semantically diluted to five peer sections.

**Estimated cost:** ~3-4 hours across UX, parity, architecture. Below the round-1 budget; this team can absorb it in one more pass.

**If shipped as-is** with the conditions deferred: the regression on the slack-invite form is the only one I would call user-visible-broken on day one of cutover. The other items are visible-degraded-not-broken. So the PR is mergeable in an "incremental improvement" review framing, but not in a "complete migration" framing — and PROGRESS.md frames it as the latter, which is the disconnect.

The migration deserves to ship. It also deserves an honest PR description and a 4-hour cleanup pass before it does.
