# nodered.org

The Node-RED project website and documentation portal, served at
[nodered.org](https://nodered.org).

Built with [Astro 6](https://astro.build) and
[Starlight 0.39](https://starlight.astro.build). Migrated from a Jekyll site
in May 2026 — see `PROGRESS.md` for the migration notes and
`docs/audit-ux/team/` for the architecture / accessibility / parity audit
that produced the current state.

## Prerequisites

- Node.js >= 20 (Astro 6 requires Node 20 or 22+)
- npm >= 10 (any recent npm works)

## Setup

```sh
npm install
```

## Develop

```sh
npm run dev
```

Starts the Astro dev server on http://localhost:4321 with hot module replacement.

## Build

```sh
npm run build           # production build (Pagefind search index enabled)
npm run preview         # serve dist/ locally on http://localhost:4321
```

The build emits ~211 pages, a `sitemap-index.xml`, a `sitemap-0.xml` (~210
URLs), an RSS feed at `/feed.xml` (alias of `/blog/rss/`), a `robots.txt`,
and a Pagefind search index.

### Pagefind on ARM64 / 16 KB-page hosts

Pagefind 1.5.2 bundles jemalloc compiled for 4 KB pages. On ARM64 Linux hosts
with 16 KB page size (some Apple Silicon developer sandboxes, certain Linux
ARM64 distributions) the search-index step crashes:

```
<jemalloc>: Unsupported system page size
```

Pages still generate before the crash, but the build exits non-zero. Workaround:

```sh
npm run build:sandbox   # equivalent to DISABLE_PAGEFIND=1 npm run build
```

This sets `DISABLE_PAGEFIND=1`, which passes `pagefind: false` to Starlight
and skips the search-index step. Use this for local development on affected
hosts. Production CI (GitHub Actions Linux x64) runs the unsuffixed
`npm run build` and gets the full Pagefind index.

Upstream tracking: https://github.com/CloudCannon/pagefind

## Test

```sh
npm test                  # Vitest unit/integration tests (tests/integration/**)
npm run test:e2e          # Playwright e2e tests (114 specs, ~1 min)
npm run lint              # ESLint + Prettier (check)
npm run lint:fix          # ESLint + Prettier (write)
npm run check             # astro check (type + content schema only, no build)
```

E2E tests spin up their own preview server on port 4321, so kill any existing
preview process first.

## Audit / parity

```sh
npm run verify:urls       # URL parity vs nodered.org -> docs/audit-qa-urls.csv
npm run verify:images     # Image parity                -> docs/audit-qa-images.json
npm run lighthouse        # Lighthouse CI vs lighthouserc.json (4 URLs)
```

## Sync upstream documentation

The Node-RED documentation at `src/content/docs/` is mirrored from
`node-red/node-red`'s `docs/` tree. To pull changes from upstream:

```sh
npm run sync:upstream                    # show diff
npm run sync:upstream -- --since=v4.1.0  # since a tag/sha
```

## Project layout

```
src/
  assets/                  Images shared across layouts (favicon, icon)
  components/              Marketing-page components (Header, Footer, etc.)
    starlight/             Docs-portal overrides (Header, Footer, PageFrame)
  content/
    blog/                  Blog posts (.md, with YAML frontmatter)
    docs/                  Documentation (mirrored from node-red/node-red)
    about/                 About pages (.md)
  data/
    navigation.ts          Shared nav links (main, footer, about sidebar)
    users.ts               "Who's using Node-RED" gallery entries
  layouts/                 BaseLayout, BlogPostLayout
  pages/
    index.astro            Homepage
    feed.xml.ts            RSS endpoint (legacy /feed.xml alias of /blog/rss/)
    about/                 About section routes
    blog/                  Blog listing + post routes
  styles/
    design-tokens.css      Marketing-page tokens (colours, spacing, typography)
    starlight-custom.css   Docs-portal token overrides
  utils/
    blog.ts                Shared blog parsing + URL helpers
  content.config.ts        Content collection schemas (Zod)

public/                    Static files copied as-is to dist/
  _redirects               Netlify/Cloudflare redirect manifest
                           (mirror of astro.config.mjs#redirects)
  robots.txt               Sitemap reference
  favicon.{ico,svg}        Favicons

scripts/
  audit-urls.ts            URL parity audit (writes docs/audit-qa-urls.csv)
  audit-images.ts          Image parity audit (writes docs/audit-qa-images.json)
  verify-urls.ts           Read-back check of audit-qa-urls.csv
  verify-images.ts         Read-back check of audit-qa-images.json
  migrate-*.ts             One-off Jekyll -> Astro migration tools (kept for
                           reproducibility; not wired to npm scripts)
  sync-upstream.ts         Pull doc-content changes from node-red/node-red

tests/
  integration/             Vitest assertions on dist/ output
  e2e/                     Playwright suite (navigation, a11y, parity, themes)

astro.config.mjs           Astro + Starlight + UnoCSS + sitemap + redirects
uno.config.ts              UnoCSS configuration (preset-wind, preset-icons)
tsconfig.json              extends astro/tsconfigs/strictest
playwright.config.ts       Playwright config (chromium project only)
vitest.config.ts           Vitest config
lighthouserc.json          Lighthouse CI thresholds
```

## Deployment

The site is deployed to GitHub Pages (`CNAME` -> nodered.org). A
`public/_redirects` file is kept in sync with the Astro `redirects:` map so
that other hosts (Netlify, Cloudflare Pages) can be used as a backup with the
same legacy-URL behaviour.

## Contributing

Issues and pull requests welcome on
[node-red/node-red.github.io](https://github.com/node-red/node-red.github.io).
See the project [contribution guide](https://nodered.org/about/contribute/)
for what kind of changes are most useful.
