# Node-RED Website Modernization Progress

## Status: All 5 Phases Complete

### Test Results
- **Build:** 212 pages, zero errors
- **Unit/Integration (Vitest):** 12/12 passing
- **E2E (Playwright):** 47/47 passing

---

## Phase 1: Architecture Cleanup - COMPLETE

- Removed unused dependencies: `lit`, `@semantic-ui/astro-lit`, `unocss`, `@unocss/astro`, `@unocss/preset-wind`, `@unocss/preset-icons`
- Removed UnoCSS integration from `astro.config.mjs` and deleted `uno.config.ts`
- Created `src/utils/blog.ts` — shared blog utilities (parseBlogDate, parseBlogPosts, sortBlogPosts, formatBlogDate, blogPostUrl)
- Updated all blog pages and feed.xml to use shared utilities
- Created `src/data/navigation.ts` — shared navigation data (mainNav, footerLinks, aboutSidebar)
- Updated BaseLayout, Header, Footer to use shared navigation data
- Added `name` field to all 47 entries in `src/data/users.ts` for alt text

## Phase 2: Bug Fixes - COMPLETE

- Fixed about index duplicate route (glob loader strips `.md` from IDs)
- Added `developing-flows` sidebar section to `astro.config.mjs`
- Added CSS for Jekyll grid classes (`.grid`, `.col-1-2`, `.doc-callout`) in about pages
- Fixed "Content not found" on about index page

## Phase 3: Design Modernization - COMPLETE

- Updated color palette: `--nr-red: #C75050`, `--nr-bg-dark: #1E1E1E`, `--nr-text: #2D2D2D`
- Typography: 17px base, 1.7 line-height, 600-weight headings
- Modern hero with gradient background and dual CTA buttons
- Card components with 8-12px border-radius and hover transitions
- Dark IDE-style code blocks
- Multi-column footer with Project, Community, Resources sections

## Phase 4: WCAG 2.2 AA Compliance - COMPLETE

- Skip link added to all layouts (BaseLayout + Starlight Header)
- Global `:focus-visible` with 3px solid #C75050 outline
- `aria-current="page"` on active nav links
- Semantic breadcrumbs with `<nav aria-label="Breadcrumb"><ol>`
- `aria-label` on all navigation landmarks
- `aria-hidden="true"` on decorative SVGs
- `prefers-reduced-motion: reduce` media query
- Fixed duplicate `<main>` landmarks (about pages: `<main>` → `<div>`)
- Fixed duplicate `<header>` landmarks (Starlight Header: `<header>` → `<div>`)
- Fixed heading order (features: `<h3>` → `<h2>`, footer: `<h4>` → `<p>`)
- Fixed redundant alt text on logo images (alt="" when text label adjacent)
- Added alt text to about page images and iframe title
- Added underline to footer and blog meta links for link-in-text-block compliance
- All 5 axe-core audits passing (home, blog listing, blog post, about, docs)

## Phase 5: Comprehensive Playwright Testing - COMPLETE

40 E2E tests across 8 test suites:
- Navigation (7 tests): page loads, nav links, active states, breadcrumbs
- Blog (5 tests): listing, individual post, pagination, post metadata
- Documentation (4 tests): landing page, sidebar, search, nested pages
- About (4 tests): page load, sidebar, sub-pages, no "Content not found"
- Homepage (5 tests): hero with dual CTA, features, user logos, community cards, footer
- Accessibility (8 tests): axe-core audits on 5 page types, skip link, main landmark, logo alt text
- Responsive (4 tests): mobile menu, desktop nav hidden, hero on mobile, blog on tablet
- Page Integrity (4 tests): 404 page, RSS feed, resources page, all main pages load without errors
- Image Integrity (3 tests): homepage, about pages, blog listing — all images resolve
- Link Integrity (3 tests): homepage, about page, footer — all internal links resolve

---

## Content Parity Audit (vs nodered.org)

### Phase 1: Fix Broken Homepage Images - COMPLETE
Fixed 6 broken image references on homepage:
- Feature images: `nr-image-browser.png` → `nr-image-1.png`, `nr-image-func.png` → `nr-image-2.png`, `nr-image-social.png` → `nr-image-3.png`
- Get-started images: SVG references → existing PNG platform icons (`platform-local.png`, `platform-local-docker.png`, `platform-device-pi.png`)

### Phase 2: Fix URL Discrepancies - COMPLETE
- Changed GitHub link from `https://github.com/node-red/node-red` to `https://github.com/node-red` (header nav, footer, homepage)
- Added missing legal footer links: Terms of Use, Privacy Policy, Bylaws, Cookie Policy
- Added social media icons: Mastodon, Twitter/X, GitHub, Discourse

### Phase 3: Create Missing Content Pages - COMPLETE
- Created `/about/resources/` page with logo assets and quick reference links
- Added "Resources" to about sidebar navigation

### Phase 4: Automated Image/Link Integrity Tests - COMPLETE
- Added 3 image integrity tests (homepage, about pages, blog listing)
- Added 3 link integrity tests (homepage, about page, footer)
- Added resources page load test
- Fixed resources page image paths (`/about/resources/media/` → `/about/media/`)
- Total: 47 E2E tests passing

### Phase 5: Blog & Content Parity - COMPLETE
- Blog page size (9 posts/page) already matches nodered.org — no change needed
- Scanned all 52 blog posts: 158/160 image references valid
- 2 broken blog images (`import-dupes.gif`, `git-workflow.png` in 2020-10-15 post) are also 404 on live nodered.org — pre-existing issue, not migration bug
- All about content validated — no remaining broken references

### Known Issues (also present on live nodered.org)
- `/blog/content/images/2020/10/import-dupes.gif` — 404 on both sites
- `/blog/content/images/2020/10/git-workflow.png` — 404 on both sites
