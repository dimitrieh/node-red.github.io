# Node-RED Website Modernization Progress

This file tracks the Jekyll -> Astro 6 + Starlight migration. For the
architecture/parity/a11y/UX audit notes that produced the current state, see
`docs/audit-ux/team/`.

## Current build state

- `npx astro check`: 0 errors / 0 warnings / 18 hints (Zod 3 / Starlight
  `Props` deprecation warnings — non-blocking).
- `DISABLE_PAGEFIND=1 npx astro build`: 211 page(s), `sitemap-index.xml` +
  `sitemap-0.xml` (210 URLs) emitted, ~15s.
- `DISABLE_PAGEFIND=1 npm test -- --run`: 12 passed / 2 skipped (the 2 skipped
  are Pagefind integration assertions, gated on the same env var).
- `DISABLE_PAGEFIND=1 npm run test:e2e`: ~113/114 passing. One flake known —
  `tests/e2e/navigation.spec.ts:146` asserts `toHaveCount(12)` user logos but
  the homepage now renders the full set of 47 entries (matches old Jekyll).
  Test is UX-owned and needs to be updated to match restored content.

## Stack at a glance

| Concern | Choice |
| --- | --- |
| Static site generator | Astro 6.3 |
| Docs portal | Starlight 0.39 |
| Styling | UnoCSS 66 (preset-wind, preset-icons) + vanilla CSS in `src/styles/**` |
| Search | Pagefind (bundled with Starlight) |
| Type checking | `astro/tsconfigs/strictest` (incl. `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) |
| Linting | ESLint 10 + typescript-eslint + eslint-plugin-astro + Prettier |
| Unit/integration tests | Vitest 4 (config: `vitest.config.ts`) |
| E2E tests | Playwright 1.59 + axe-core (config: `playwright.config.ts`) |
| Lighthouse CI | `@lhci/cli` (config: `lighthouserc.json`) |
| Hosting | GitHub Pages (`CNAME` -> nodered.org), `public/_redirects` mirror for Netlify/Cloudflare hosts |

## Migration phases (historical record)

### Phase 1 - Architecture
- Astro 6 + Starlight 0.39 stack chosen; Vite 7 pinned via `overrides`.
- Strictest TypeScript baseline adopted from `astro/tsconfigs/strictest`.
- Shared utilities extracted: `src/utils/blog.ts` (parseBlogDate, parseBlogPosts,
  sortBlogPosts, formatBlogDate, blogPostUrl) and `src/data/navigation.ts`
  (mainNav, footerLinks, aboutSidebar).
- One-off migration scripts in `scripts/migrate-*.ts` — kept on disk for
  reproducibility, not wired to npm scripts. Run with `npx tsx scripts/migrate-blog.ts`
  if you ever need to re-import Jekyll posts.
- UnoCSS is retained, not removed: header/footer/base-layout components still
  use `bg-nr-*`, `text-nr-*`, `lt-lg:`, `i-simple-icons-*` and `w-5 h-5` utility
  classes. (Earlier drafts of this file claimed UnoCSS had been removed; that
  was inaccurate — `astro.config.mjs` still wires `UnoCSS()` into the
  integrations array and `uno.config.ts` is still on disk.)

### Phase 2 - Routing & redirects
- Sitemap via `@astrojs/sitemap` (`sitemap-index.xml` + paginated `sitemap-0.xml`).
- `public/robots.txt` references the sitemap-index.
- Legacy Jekyll `redirect_from` aliases are restored — see
  `astro.config.mjs#redirects` and `public/_redirects` (kept in sync; drift is
  asserted by `tests/e2e/parity-redirects.spec.ts`).
- `/feed.xml` is served directly as RSS 2.0 XML by `src/pages/feed.xml.ts`
  (not a redirect), so RSS clients that don't follow meta-refresh keep working.
- `/blog/rss/` is the new canonical RSS path and emits the same payload.

### Phase 3 - Content & design
- Marketing pages (`/`, `/about/**`, `/blog/**`) use `src/layouts/BaseLayout.astro`.
- Docs (`/docs/**`) use Starlight with branded overrides in
  `src/components/starlight/` (Header, Footer, PageFrame).
- Dark mode tokens defined in `src/styles/design-tokens.css`; Starlight chrome
  tokens in `src/styles/starlight-custom.css`.
- BaseLayout emits OG / Twitter / canonical meta on every marketing page
  (round-1 architecture finding; integrated in commit 446d0ef).
- Per-post OG image override threads through `BlogPostLayout.astro` so blog
  posts get `summary_large_image` Twitter cards with their own preview image.

### Phase 4 - Accessibility (WCAG 2.2 AA)
- Skip link, focus rings, `aria-current="page"` on active nav, semantic
  breadcrumbs, axe-core audit on `/`, `/blog/`, blog post, `/about/`, `/docs/`.
- Light/dark contrast for Starlight chrome (sidebar, ThemeSelect, breadcrumbs,
  FooterContent) verified at AA against both palettes.
- `prefers-reduced-motion` honoured in Starlight overrides.
- Heading order normalised on `/about/` (h1 -> h2 -> h2 ...).

### Phase 5 - Testing
- Vitest 4 integration suite: `tests/integration/build.test.ts` (12 assertions
  about generated `dist/` output, 2 skipped under `DISABLE_PAGEFIND=1`).
- Playwright 1.59 e2e suite: 114 tests across navigation, blog, docs, about,
  homepage, a11y (axe-core), responsive, page integrity, image integrity,
  link integrity, parity redirects, and themed contrast.
- Image/URL parity audit scripts: `npm run verify:urls`, `npm run verify:images`.

## Sandbox environment caveat: Pagefind on ARM64 16 KB pages

Pagefind 1.5.2 bundles a Rust binary built against jemalloc with 4 KB-page
assumptions. ARM64 hosts with 16 KB page size (Apple Silicon developer
sandboxes, some Linux ARM64 distros) crash with:

```
<jemalloc>: Unsupported system page size
memory allocation of 16 bytes failed
```

Pages still generate before the crash, but the build exits non-zero and the
search index is missing. Workaround: set `DISABLE_PAGEFIND=1`, which short-
circuits Starlight's `pagefind: false` and skips the search-index step
(implemented in `astro.config.mjs`). Production CI on 4 KB-page runners (the
default for GitHub Actions Linux x64) leaves the env var unset and gets the
full Pagefind index. Track upstream:
https://github.com/CloudCannon/pagefind

## Build / test commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Astro dev server (HMR) on `localhost:4321` |
| `npm run build` | Type-check + production build (Pagefind enabled) |
| `npm run build:sandbox` | Production build with `DISABLE_PAGEFIND=1` (for ARM64 16 KB-page hosts) |
| `npm run preview` | Serve `dist/` locally on `localhost:4321` |
| `npm run check` | `astro check` only (TypeScript + content schema) |
| `npm test` | Vitest unit/integration tests |
| `npm run test:e2e` | Playwright e2e tests (spins up its own preview server) |
| `npm run lint` | ESLint + Prettier (check only) |
| `npm run lint:fix` | ESLint + Prettier (write fixes) |
| `npm run verify:urls` | URL parity audit vs nodered.org (`docs/audit-qa-urls.csv`) |
| `npm run verify:images` | Image parity audit (`docs/audit-qa-images.json`) |
| `npm run sync:upstream` | Pull doc-content changes from upstream `node-red/node-red` |
| `npm run lighthouse` | Lighthouse CI (config: `lighthouserc.json`) |

## Known follow-ups

- Replace UnoCSS with vanilla CSS / inline SVGs in the 3 components that still
  use it, or commit to keeping it long-term (and drop the misleading
  "removed" claim in older docs).
- Sync `tests/e2e/navigation.spec.ts:149` with the restored 47-entry user
  gallery (assertion currently expects 12).
- Migrate `src/content.config.ts` off Zod 3 when Starlight adopts Standard Schema.
- Drop or replace `@astrojs/starlight/props` (`Props` type is deprecated in
  favour of `getRouteData`).
- Add a per-blog-post OG image fallback chain (currently falls back to the
  Node-RED icon if a post has no `image:` frontmatter).
