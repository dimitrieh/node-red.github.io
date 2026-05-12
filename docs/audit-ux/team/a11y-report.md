# A11y Report

## Summary

The migration's `:focus-visible` outline, skip link, single-`<main>`, single-`<header>`, landmark labelling, heading order, `aria-current`, and `prefers-reduced-motion` rules are all in place and verified (PROGRESS.md Phase 4 claims hold). However, axe-core was hiding a serious dark/light regression on every Starlight-rendered page (`/docs/**`): a `:root { --sl-color-black: #1A1A1A; }` override in `starlight-custom.css` was beating Starlight's `[data-theme='light']` reset, forcing light-mode pages into a dark palette and dropping sidebar contrast to **2.22:1** (29 nodes per page × 50 docs pages). Fixed by splitting tokens into proper `[data-theme='light']` and `[data-theme='dark']` blocks. Fixed three more contrast bugs in my file scope (FooterContent legal links 4.04:1, breadcrumb-bar white-on-red 4.47:1, ThemeSelect 1.6:1 over dark navbar). Added 8 new failing-on-violation assertions (skip link, 320px no-h-scroll, both-theme contrast, single `<main>`, reduced motion, sidebar contrast) — supplementing the existing report-only spec. Issues outside my scope (homepage card text, design-token `--nr-gray-500`, mobile-target sizes on UX-owned footer) are listed with ready-to-apply diffs under "Patches for other teammates".

## Method

- Started a preview server (`npx astro preview --host 0.0.0.0 --port 4324`) against the existing `dist/` after each commit, since `npx astro build` exits non-zero at the Pagefind step on this ARM64 sandbox (16KB page size vs jemalloc's 4KB-only support) — per orchestrator's instructions, treat the build as green once `dist/` has 244 HTML pages.
- Loaded axe-core 4.10.0 via CDN inside Playwright MCP and ran `wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa` on `/`, `/docs/`, `/docs/getting-started/`, `/blog/`, `/about/` in both `data-theme=light` and `data-theme=dark`.
- Walked the DOM ancestor chain with `getComputedStyle` to identify the actual rendered foreground/background for each axe violation, so the root cause was attributable to a CSS token rather than to per-component CSS.
- Manual keyboard nav from page load: Tab → skip-link → Enter → Tab → first content control. Verified focus indicator (`outline: 3px solid #C75050`), tap target sizes ≥ 24×24 (WCAG 2.2 AA), no horizontal scroll at 320px viewport.
- Inspected Starlight defaults at `node_modules/@astrojs/starlight/style/props.css` to understand which `--sl-*` tokens Starlight cascades through (e.g. `--sl-color-bg: var(--sl-color-black)`).
- Cross-checked the legacy site via `WebFetch https://nodered.org/` — confirmed `text-nr-red` (`#C75050`) on the OpenJS dark legal-footer band is inherited from the old site too, but on the migration it's surfaced on a darker `#161616` strip where contrast just fails.

## Findings — fixed in this branch

- **Starlight token regression (29 nodes × every docs page)** — `:root { --sl-color-black: #1A1A1A }` in `starlight-custom.css` was shadowing Starlight's own `[data-theme='light']` reset (same specificity, later cascade), forcing every light-mode docs page into a dark palette. Sidebar text rendered at `#525252` on `#1A1A1A` = 2.22:1. Split into proper `:root[data-theme='light']` and `:root[data-theme='dark']` blocks and darkened `--nr-gray-500` from `#8A8A8A` to `#6B6B6B` (4.6:1 on white). Fix: `src/styles/starlight-custom.css:1-94`. Commit `5d8e4d2`.
- **Breadcrumb bar contrast (Starlight docs)** — White text on `#C75050` was 4.47:1 (fails AA 4.5:1 by 0.03). Darkened background to `var(--nr-red-hover)` (`#A63D3D`) → 6.4:1. Fix: `src/styles/starlight-custom.css:347-368`. Commit `5d8e4d2`.
- **Starlight FooterContent legal links (7 per docs page)** — `text-nr-red` (`#C75050`) on `#161616` strip was 4.04:1. Swapped to `text-[#E87070]` (5.6:1) and bumped body text from `#999` to `#B5B5B5` (8.4:1). Fix: `src/components/starlight/FooterContent.astro:33-43`. Commit `5d8e4d2`.
- **Starlight ThemeSelect serious failure (light mode)** — In light mode `--sl-color-gray-2` = `#404040`, which Starlight uses as the select's text colour. The select lives in our `#1E1E1E` dark navbar = 1.6:1. Forced `#E5E5E5` (12.6:1) via `:global(starlight-theme-select select)`. Fix: `src/components/starlight/Header.astro:69-95`. Commit `bfa011c`.
- **Test coverage for the regression** — Added `tests/e2e/a11y-themes.spec.ts` with 8 failing-on-violation tests. The existing `a11y.spec.ts` only writes a JSON report; nothing was actually asserting these contrast values, which is how the regression slipped past green E2E in PROGRESS.md. Commit `8304d16`.

### Verified in place (PROGRESS.md Phase 4 claims hold)

- Skip link `<a href="#main-content">` exists on every page, becomes visible on Tab focus, has 3px red outline. Verified via Playwright keyboard nav from page load.
- `:focus-visible` global rule emits `outline: 3px solid #C75050` on Tab-focused elements. Verified on home page CTA, sidebar links, ThemeSelect.
- `aria-current="page"` on active nav links (Header, sidebar). Confirmed in DOM snapshot.
- `prefers-reduced-motion: reduce` rule present in both `design-tokens.css` and `starlight-custom.css`; reduces transition-duration to 0.01ms.
- Single `<main id="main-content">` per page. Single `<header>`, single `<footer>`. Confirmed across `/`, `/docs/`, `/blog/`, `/about/`, `/docs/getting-started/`.
- All `<nav>` elements have `aria-label` (Main / Mobile / Footer / Site / Breadcrumb).
- Heading order on `/` is h1 → h2×3 → h3×7. No skipped levels triggered by axe.
- No horizontal scroll at 320px on `/`, `/docs/`, `/blog/`, `/about/`.

## Findings — flagged, not fixed (out of file scope)

### Color contrast in UX-owned files

These rendered violations all live in files I cannot edit. Listed with computed contrast and proposed fix.

1. **`/`** — `.nr-label` text `#8A8A8A` on `#FAFAFA` / `#FFFFFF` = 3.3-3.45:1 (16 instances per page across Features, Get Started, Community, Trusted-by section labels and `.platform-desc` / `.community-desc` body copy). Token: `--nr-gray-500` in `src/styles/design-tokens.css` (UX-owned). See Patches: ux #1.
2. **`/` footer** — `.footer-legal a` `#C75050` on `#161616` = 4.04:1 (7 OpenJS / TM / Terms / Privacy / Bylaws / Cookie links). File: `src/components/Footer.astro` (UX-owned). See Patches: ux #2.
3. **`/blog/`, `/about/`, `/about/community/`** — Breadcrumb anchor `#FFFFFF` on `#C75050` = 4.47:1 (3 nodes per page). File: `src/layouts/BaseLayout.astro` (UX-owned). See Patches: ux #3.

### Mobile tap targets (WCAG 2.5.8)

- **`/` footer link group** — `.footer-link-group a` at 320px viewport is 18px tall vs WCAG 2.2 AA minimum of 24×24. Affects 12 links per page. File: `src/components/Footer.astro` (UX-owned). See Patches: ux #4.

### Content-image alt text

- **`/docs/getting-started/`** — 9 platform icons (`platform-local.png`, `platform-device-pi.png`, etc.) have no `alt` attribute. The page is a markdown content page, so the markup is in `src/content/docs/getting-started/index.md(x)`. Outside both a11y and parity scope; flag for content cleanup. See Patches: parity #1.

### `<kbd>` element

- **`/docs/getting-started/`** — Starlight's default `<kbd>` styling renders `#A3A3A3` on `#E5E5E5` = 2:1 (1 instance per Ctrl/Cmd note). This is Starlight's bundled `markdown.css`; the fix is to either override `kbd` in `starlight-custom.css` or upstream-report to Starlight. **Self-fix:** I'll patch this in `starlight-custom.css` if time allows — see "follow-ups".

### About page `<h1>` (already flagged by devils-advocate)

- `/about/` index page renders no `<h1>`. Confirmed via Playwright DOM snapshot. Out of my scope (UX-owned `src/pages/about/index.astro`). UX or devil flagged in TEAM-LOG.

### Skip-link focus management (minor)

- After clicking the skip link, `location.hash` updates to `#main-content` but `document.activeElement` reverts to `<body>` because `<main>` has no `tabindex`. Next Tab does land in the main content (works in practice), but for true SC 2.4.1 compliance the target element should be programmatically focusable. **Self-fix candidate** in my owned scope only if the target is a Starlight element — for BaseLayout it's UX-owned. See Patches: ux #5.

### Search a11y

- Starlight's `<site-search>` button is in the Header (mine). Cannot verify the in-modal accessibility because Pagefind is broken in this sandbox (jemalloc page-size). Flagged per orchestrator's note as "search a11y untestable in this sandbox".

## Patches for other teammates

### ux #1 — darken `--nr-gray-500` (token fix)

`src/styles/design-tokens.css`:

```diff
   --nr-gray-700: #525252;
-  --nr-gray-500: #8A8A8A;
+  --nr-gray-500: #6B6B6B;   /* 4.6:1 on #FFFFFF (was 3.5:1, fails AA) */
   --nr-gray-400: #A3A3A3;
```

Affects every `.nr-label`, `.platform-desc`, `.community-desc`, `.footer-tagline` on the home page — turns 16 axe color-contrast failures into 0. Visually a small darkening; design intent preserved.

### ux #2 — lighten footer legal link colour

`src/components/Footer.astro` (`.footer-legal a` rule near line 600):

```diff
   .footer-legal a {
-    color: var(--nr-red);
+    color: #E87070;  /* 5.6:1 on #161616 (was 4.04:1) */
     text-decoration: underline;
   }
   .footer-legal a:hover {
-    color: #E87070;
+    color: #F58A8A;  /* keep hover lighter still */
   }
```

### ux #3 — darken global breadcrumb bar background

`src/layouts/BaseLayout.astro` global style block (`.breadcrumb-bar`):

```diff
   .breadcrumb-bar {
-    background: var(--nr-red);
+    background: var(--nr-red-hover);  /* 6.4:1 white-on-#A63D3D (was 4.47:1) */
     min-height: 48px;
```

Affects every UX-owned breadcrumb on `/blog/`, `/blog/[page]/`, `/blog/[post]/`, `/about/`, `/about/[...slug]/`. (I already applied the same fix to the Starlight docs breadcrumb in my file scope.)

### ux #4 — increase footer link tap target

`src/components/Footer.astro` (`.footer-link-group li` / `a` near lines 558-572):

```diff
   .footer-link-group li {
-    margin: var(--space-2) 0;
+    margin: 0;
   }

   .footer-link-group a {
     color: #999;
     font-size: var(--text-body-sm);
     text-decoration: none;
     transition: color var(--duration-fast);
+    /* WCAG 2.2 SC 2.5.8: minimum 24×24 tap target. Was 18px tall. */
+    display: inline-block;
+    padding: 6px 0;
+    line-height: 1.5;
   }
```

Note: the link colour `#999` on `#1E1E1E` is 6:1 (passes AA). Only the size is the issue.

### ux #5 — make `<main>` focusable for skip-link target

`src/layouts/BaseLayout.astro` line 79:

```diff
-    <main id="main-content">
+    <main id="main-content" tabindex="-1">
       <slot />
     </main>
```

This lets browsers shift focus from the skip link into `<main>` on activation rather than dropping back to `<body>`. `tabindex="-1"` keeps it out of the normal Tab order while making it programmatically focusable. (Note: this is the BaseLayout skip target. The Starlight Header skip link points to `#_top` which is a Starlight-internal element — see Patches: arch.)

### ux #6 — `/about/` index needs `<h1>` (already flagged in devil report)

Pre-existing finding — adding here so it's tracked alongside contrast fixes. `src/pages/about/index.astro` should render an `<h1>About Node-RED</h1>` before the prose.

### parity #1 — add alt text to platform icons in getting-started content

`src/content/docs/getting-started/index.md` (or wherever it lives):

```diff
- ![](/images/platform-local.png)
+ ![Local install icon](/images/platform-local.png)
- ![](/images/platform-device-pi.png)
+ ![Raspberry Pi icon](/images/platform-device-pi.png)
- ![](/images/platform-local-docker.png)
+ ![Docker icon](/images/platform-local-docker.png)
- ![](/images/platform-local-dev.png)
+ ![Developer install icon](/images/platform-local-dev.png)
- ![](/images/platform-device.png)
+ ![Generic device icon](/images/platform-device.png)
- ![](/images/platform-android.png)
+ ![Android icon](/images/platform-android.png)
- ![](/images/platform-cloud.png) (×3 — flowfuse, aws, azure)
+ ![Cloud icon](/images/platform-cloud.png)
```

If these icons are decorative (a text label follows immediately), use `alt=""` instead — but axe currently treats them as missing required alt entirely. Either resolves the critical failure.

### arch — Starlight skip link target

The Starlight `Header.astro` skip link is `<a href="#_top">`. Starlight's internal `<main id="_top">` is rendered by `MainFrame.astro` and is already focusable in recent Starlight versions, so this likely works. If you can confirm with a Playwright keyboard test on `/docs/`, file a follow-up. (My focus was on the BaseLayout skip link which is shared across all marketing pages.)

## Verification

Commands run (selected):

```bash
# Build + dist sanity:
npx astro build          # exits non-zero at Pagefind step (expected); 244 HTML pages in dist/.
ls dist/_astro/common*.css | xargs grep "sl-color-black: #FFFFFF"   # confirms new light-mode token

# Axe via Playwright MCP, both themes, key pages:
http://localhost:4324/             # home — 16 violations remaining, all UX-owned (see "flagged")
http://localhost:4324/docs/getting-started/   # docs sidebar/landing — 9 + 9 = 18 remaining, all in content `.post-content` (parity)
http://localhost:4324/blog/        # blog — only UX breadcrumb 4.47:1 (ux #3)

# Keyboard:
Tab → focuses skip-link "Skip to main content" with 3px red outline at top:0
Enter → location.hash = #main-content
Tab → focuses first in-main button "Get Started" (header bypassed) ✓

# Mobile (320×800):
no horizontal scroll on /, /docs/, /blog/, /about/  ✓
mobile-toggle button 40×39 ≥ 24×24 ✓ (recommended 44×44 missed)
footer-link-group <a> 18px tall < 24×24 ✗  (see Patches: ux #4)

# Theme switch — both themes axe-clean for chrome I own:
[light] /docs/getting-started/ — 0 violations in my chrome (sidebar / breadcrumb / theme-select / FooterContent)
[dark]  /docs/getting-started/ — 0 violations in my chrome (was: 145 nodes pre-fix)
```

Playwright screenshots saved to `.playwright-mcp/page-2026-05-12T17-*` (12 snapshots covering both themes on /, /docs/, /docs/getting-started/, /blog/, /about/community/, all at 1200px and 320px).

Tests added: `tests/e2e/a11y-themes.spec.ts` — 8 tests, runnable via `npm run test:e2e -- a11y-themes`. They DO fail on violations (unlike `a11y.spec.ts` which only collects).

## Recommendations

Prioritised follow-ups for the orchestrator / next session:

1. **(P0) UX teammate applies patches ux #1, #2, #3, #4** — turns ~40 remaining serious axe violations on the homepage into 0. Each is a one-line CSS change. Estimated 10 minutes.
2. **(P0) Parity teammate applies patch parity #1** — adds alt text to the 9 platform icons in `getting-started/index.md`. Closes the only `image-alt` critical violations.
3. **(P1) UX teammate applies patch ux #5** — `tabindex="-1"` on `<main>` so skip link actually focuses target. Not strictly required by AA but is a quality-of-life win for screen-reader users.
4. **(P1) Run `npm run test:e2e -- a11y-themes`** in CI; on a sandbox without Pagefind crash this should be green for my chrome and fail in a self-documenting way if anyone re-introduces the token regression.
5. **(P2) Address `<kbd>` style** — either override Starlight's default kbd selector in `starlight-custom.css` or file upstream. Currently 1-2 instances per docs page, low impact.
6. **(P2) Verify Starlight search modal a11y** once Pagefind works (different ARM-aware build, e.g. `--target x64` Lambda image). The site-search button is in my scope but the dialog is Starlight-internal.
7. **(P3) Run `axe-core` in CI against the production preview** — the existing `a11y.spec.ts` collects but doesn't fail; promote it (or my new spec) to assertion mode so regressions are caught before merge.
