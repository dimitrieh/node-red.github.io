# UX Report

## Summary
Audited the new Astro/Starlight Node-RED site at three viewports (390, 768, 1280) in both light and dark themes, plus a sweep of homepage, blog index, blog post, about, and one about sub-page. The marketing pages had a major theme-switching bug (Starlight's `data-theme="dark"` was set but absolute neutrals were referenced directly, so the marketing CSS rendered as light regardless), a mobile menu that didn't close on link activation or Escape, three pages duplicating identical 50-line breadcrumb CSS, a tablet (768) layout that collapsed everything to single-column with too much vertical scroll, and visually flat blog cards that had no read affordance. Six commits ship those fixes; the design-token additions also lay groundwork for the docs portal/footer to be themed by future work. Two remaining items (missing `<h1>` on `/about/`, and Header.astro starlight ownership) are flagged for parity / a11y.

## Method
- **Build**: `DISABLE_PAGEFIND=1 npx astro build` (211 pages, 0 errors). Architecture teammate added the env flag mid-shift; before that I served the existing `dist/` via `python3 -m http.server 4322 --bind 0.0.0.0` since Pagefind crashes on the sandbox's 16 KB page size.
- **Visual testing**: Playwright MCP at viewports 1280×900, 768×1024, 390×844, capturing both light and dark renderings. Comparison against `research/nodered-homepage.png` and the existing `current-*-desktop.png` baselines.
- **Theme toggle**: Forced Starlight's dark mode via `document.documentElement.setAttribute('data-theme','dark')` and `localStorage.setItem('starlight-theme','dark')`, then probed `getComputedStyle` for the body bg and CSS custom-prop values.
- **Mobile menu**: Clicked `.mobile-toggle`, asserted `aria-expanded` / `aria-hidden` toggled correctly, pressed Escape to verify close-on-Escape.
- **Source diff vs old site**: `git show master:_includes/header.html` for nav parity, `_layouts/default.html` for global structure.
- **Screenshots saved** under `research/ux-audit/` (paths in Verification section).

## Findings — fixed in this branch

- **Dark mode tokens (cc70fec, `src/styles/design-tokens.css`).** Marketing pages referenced `--nr-white`, `--nr-black`, `--nr-gray-*` directly; Starlight's `data-theme="dark"` flipped the attribute but the CSS variables never re-resolved. Introduced semantic surface tokens (`--nr-surface`, `--nr-surface-alt`, `--nr-surface-elevated`, `--nr-text-strong/body/muted/faint`, `--nr-border`, `--nr-border-strong`, `--nr-raster-line*`) with explicit `:root[data-theme='dark']` overrides, then rewired the marketing pages to consume them.
- **Mobile menu UX (5644bf8, `src/layouts/BaseLayout.astro:141-179`).** The menu opened but didn't close on link click, Escape, or breakpoint resize. Now closes on all three; Escape also returns focus to the toggle. Hamburger button also got a visible border and active/expanded background tint so it no longer reads as decorative-only against the dark header.
- **Breadcrumb DRY (5644bf8/4523099, `BaseLayout.astro` + 3 callers).** The 48 px red breadcrumb bar was copy-pasted three times (`blog/index.astro`, `about/index.astro`, `about/[...slug].astro`, `BlogPostLayout.astro`). Lifted to BaseLayout's global stylesheet; pages now keep the markup (`<nav class="breadcrumb-bar">`) and let the global style apply. Net -156 / +25 lines.
- **Blog card visual hierarchy (1e5e78a, `src/pages/blog/index.astro`).** Cards were title + monospace date + (sometimes) excerpt, with no read affordance and a featured card that was indistinguishable except font-size. Now: overline-styled mono date (matches DESIGN_PLAN.md's `nr-label` rhythm), bold "Read post →" CTA with hover gap animation, a 3 px red left accent that scales in on hover and is always visible on the featured card, and the featured card surface is `--nr-red-light` so it actually reads as featured. The CTA also makes the entire card feel intentional even when no description is present.
- **Tablet layout (f1b18ef, `src/pages/index.astro:548-606`).** The 768–1023 px range was using the same `1fr` mobile collapse, wasting half the screen on iPad portrait. Now: features 2-col (3rd card spans), getstarted 2-col (3rd card spans), trusted-by 4-col, community 2-col. Verified visually at 768×1024.
- **Mobile hero CTAs (f1b18ef).** Buttons now `align-items: stretch` so primary + secondary buttons match width — bigger tap targets, no awkward left-anchor.
- **Themed homepage sections (f1b18ef).** All `var(--nr-white)`, `var(--nr-gray-50)`, `var(--nr-black)`, `var(--nr-gray-700/500)` swapped for semantic equivalents. Light mode is visually identical; dark mode now actually renders dark. Hero eyebrow also bumped from `--nr-red` (4.6:1) to `--nr-red-dark` (7.8:1) for AA-large contrast on the gray-50 hero surface; dark-mode override gives it a brighter `#FF8585`.
- **Trusted-by dark mode (ddc5f8d, `src/pages/index.astro:524-544`).** First attempt at `filter: invert(1)` correctly lit up dark logos but blacked-out logos that were already white-on-transparent. Replaced with a tonal dark tile (`#2A2A30`) + slight desaturation so all logo variants survive.

## Findings — flagged, not fixed

- **(parity) `/about/` renders no `<h1>`.** `src/pages/about/index.astro` doesn't include a heading wrapper; it pipes the `index.md` body directly, and that md file has no top-level `#` heading either. Compare to `[...slug].astro` which injects `<h1>{page.data.title}</h1>` before content. Either UX adds the wrapper on `index.astro` or parity adds `# About` to `src/content/about/index.md`. Devil's advocate already flagged this in `devils-advocate.md`. Owner: parity (it's a content fix in `src/content/`).
- **(a11y) Starlight `Header.astro` GitHub link.** Devil's report notes the override still points at `node-red/node-red`, inconsistent with the main nav at `github.com/node-red`. That file is in `src/components/starlight/` which a11y owns.
- **(parity) Hero "Wire anything. Flow everything." headline diverges from old site copy** ("Low-code programming for event-driven applications"). Devil flagged. Not a UX-lane fix.
- **(arch) UnoCSS still present.** `i-simple-icons-mastodon w-5 h-5` etc. in BaseLayout footer rely on UnoCSS class generation. PROGRESS.md claim "Removed UnoCSS" is false. Devil + architecture have both flagged. Not my lane to remove the integration.
- **(content / parity) Featured blog card excerpt empty for many posts.** The "Modernization Survey Results", "Node-RED Con 2025 is coming!", "Version 4.0 released" etc. have no `description` frontmatter, so the card is mostly empty space. The new "Read post →" CTA softens this, but the long-term fix is to add descriptions in the content frontmatter (parity).
- **(arch) Blog `blog-card-cta` hover-driven gap animation depends on `transition: gap`.** Works in modern browsers but is non-standard; if cross-browser support becomes an issue, swap to a `translateX` on the SVG. Low priority.
- **(ux, not blocking) About-content `:global(.grid)` markup in MD uses raw `<div class="grid col-1-2">`.** Already styled in `about/index.astro` and `[...slug].astro` to 2-col with `min-width:0`. Fine as-is; would be cleaner as MDX components in a future pass.
- **(ux, low priority) `BlogPostLayout.astro` has a `.post-inner` panel with a `box-shadow` that still reads correctly in dark mode but loses some elevation. Acceptable.

## Patches for other teammates

### Patch for **parity**: add `<h1>` to /about/ landing

The simplest fix (parity owns content; this is a frontmatter-time concern):

```diff
diff --git a/src/content/about/index.md b/src/content/about/index.md
--- a/src/content/about/index.md
+++ b/src/content/about/index.md
@@ -3,6 +3,8 @@
 layout: "about-single"
 ---

+# About Node-RED
+
 Node-RED is a flow-based programming tool, originally developed by IBM Emerging Technology Services team and now a part of the [OpenJS Foundation](https://openjsf.org/).
```

If parity prefers to keep content unchanged, **alternative for UX (next shift)** is to add a `<h1>` to `src/pages/about/index.astro` directly (UX-owned):

```diff
diff --git a/src/pages/about/index.astro b/src/pages/about/index.astro
--- a/src/pages/about/index.astro
+++ b/src/pages/about/index.astro
@@ -38,6 +38,7 @@ if (mainPage) {

     <div class="about-content">
+      <h1>{mainPage?.data.title || 'About Node-RED'}</h1>
       {Content ? <Content /> : <p>Content not found</p>}
     </div>
```
…but only after coordinating with parity since the title comes from the md frontmatter.

### Patch for **a11y**: update Starlight Header GitHub link

A11y already owns `src/components/starlight/Header.astro`. Devil noted it still points at `node-red/node-red`. UX hasn't touched it.

### Patch for **architecture**: optional — guard the body transition for reduced-motion

I added a `transition: background-color, color` on `body` to smooth the theme flip. The token CSS already includes a `prefers-reduced-motion` rule that zeros out animations and transitions. Verified — no patch needed, just confirming for the record.

## Verification

### Commands run
- `DISABLE_PAGEFIND=1 npx astro build` → `211 page(s) built in 16.43s` → `Complete!` (exit 0)
- `curl http://localhost:4322/{,/blog/,/about/}` → 200/200/200
- Playwright in-browser eval: `document.documentElement.getAttribute('data-theme')` flips to dark → `getComputedStyle(document.body).backgroundColor` returns `rgb(24, 24, 27)` (= `#18181B`, dark token) instead of `rgb(255, 255, 255)`.
- Mobile menu: click toggle → `aria-expanded=true` / `aria-hidden=false`; press Escape → `aria-expanded=false` / `aria-hidden=true`.

### Screenshots saved (all under `research/ux-audit/`)
- Baseline before fixes: `home-1280-full.png`, `home-768-full.png`, `home-390-full.png`, `home-390-mobilemenu-open.png`, `blog-1280-full.png`, `about-1280-full.png`, `aboutcommunity-1280-top.png`, `blogpost-1280-top.png`, `docs-1280-top.png`
- After fixes (light): `after-home-1280-full.png`, `after-home-768-full.png`, `after-home-390-light.png`, `after-blog-1280-light.png`, `after-home-390-mobilemenu.png`
- After fixes (dark): `after-home-1280-dark-v2.png`, `after-blog-1280-dark.png`, `after-aboutcommunity-1280-dark.png`

### Commit list (ux-prefixed)
1. `cc70fec` ux: add dark-mode design tokens + semantic surface aliases
2. `5644bf8` ux: improve mobile menu UX + extract breadcrumb to global
3. `4523099` ux: thread semantic tokens through about + blog post layouts
4. `1e5e78a` ux: enrich blog listing cards with overline date + read CTA
5. `f1b18ef` ux: thread semantic tokens through homepage + tablet 2-col layouts
6. `ddc5f8d` ux: keep trusted-by logos legible in dark mode

## Recommendations

Prioritized for next shift / follow-up:

1. **P0 – content**: add `<h1>` to `/about/` (parity 5-line fix).
2. **P0 – a11y**: align Starlight `Header.astro` GitHub link with main nav (a11y, 1-line fix). Both above unlock screen-reader landmark parity with the old site.
3. **P1 – ux follow-up**: write the missing `description:` frontmatter for the 35+ blog posts that have none, so the new "Read post →" cards aren't half-empty in the listing. Parity-adjacent; could be UX if positioned as content rhythm.
4. **P1 – ux follow-up**: cross-page rhythm audit — section padding scale already exists (`--space-9` etc.) but `BlogPostLayout` uses `var(--space-6) auto` while `about-layout` uses `var(--space-6) var(--grid-padding) var(--space-8)`. Aligning would tighten the visual signature.
5. **P2 – ux follow-up**: blog "featured" card could carry a hero image once we have art direction; current red-tinted bg is good but a real visual asset would close the gap to `zed.dev` reference.
6. **P2 – architecture**: ship a real "system" theme listener so the marketing pages auto-flip with OS-level prefers-color-scheme even before the user opens the docs toggle. Today the dark tokens activate only after Starlight has run its inline script and set `data-theme`. Easy to add an early-script `<head>` snippet in `BaseLayout.astro` to set `data-theme` from `prefers-color-scheme` if `localStorage.starlight-theme` is unset.
7. **P2 – architecture**: when removing UnoCSS for real, the only marketing-page usages are footer social icons (`i-simple-icons-*`) and a few utility classes — replaceable with inline SVG.
8. **P3 – docs portal parity**: Starlight's docs feel detached from marketing because the body bg + content card chrome are different. The new semantic tokens give us a path; a11y owns starlight overrides and could mirror `--nr-surface*` to `--sl-color-bg*` in a follow-up.
