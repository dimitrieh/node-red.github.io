# nodered.org

The Node-RED project website and documentation portal, served at
[nodered.org](https://nodered.org).

Built with [Astro](https://astro.build) 7 and
[Starlight](https://starlight.astro.build) 0.41, replacing the Jekyll site that
GitHub Pages used to build. Every published URL is preserved; see
[What changed](#what-changed-from-the-jekyll-site) below for how the old tree
maps onto this one.

## What changed from the Jekyll site

Same URLs, same content, different machinery. Nothing in the site's information
architecture moved: the navigation, the docs hierarchy, the blog's dated paths
and the About section are all where they were.

| Jekyll                                      | Here                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `_config.yml`, `Gemfile`, `_plugins/`       | `astro.config.mjs`, `package.json`                                                                                      |
| `index.html`                                | `src/pages/index.astro`                                                                                                 |
| `_layouts/`                                 | `src/layouts/`, plus Starlight overrides in `src/components/starlight/`                                                 |
| `_includes/`                                | `src/components/`                                                                                                       |
| `_data/`                                    | `src/data/`                                                                                                             |
| `_posts/`, `blog/index.html`, `blog/rss/`   | `src/content/blog/`, `src/pages/blog/`, `src/pages/feed.xml.ts`                                                         |
| `docs/`                                     | `src/content/docs/docs/`, rendered by Starlight                                                                         |
| `about/`                                    | `src/content/about/` with routes in `src/pages/about/`                                                                  |
| `css/`                                      | `src/styles/`, plus UnoCSS utilities                                                                                    |
| `js/`, `jquery/`                            | Gone. The editor-widget illustrations in the docs are dependency-free custom elements in `src/components/docs-widgets/` |
| `images/`, `users/`, `favicon.ico`, `CNAME` | `public/`, copied to the site root as-is                                                                                |
| GitHub Pages' built-in Jekyll build         | `.github/workflows/deploy-pages.yml`                                                                                    |

Two things about the chrome are deliberately different from the old site:

- **The announcement band** sits directly under the navbar rather than above it,
  and appears on every page instead of being repeated per template. Its wording
  lives in `src/data/announcement.ts`, which also feeds the conference card in
  the homepage's Community section. Setting `active: false` there removes both.
- **Breadcrumbs are gone.** The red band under the navbar used to be a
  breadcrumb on About, the blog and Releases; the announcement band took that
  slot. About pages keep their section rail for orientation.

Two additions with no Jekyll equivalent: documentation search, via a Pagefind
index built at deploy time, and a light and dark theme shared across the whole
site through one stored preference.

## Architecture

The site is two shells that share their chrome.

**Marketing pages** (`/`, `/about/`, `/blog/`, `/releases/`) render through
`src/layouts/BaseLayout.astro`, which owns the document head, the view-transition
setup and the global element styles. Tokens come from
`src/styles/design-tokens.css`.

**Documentation** (`/docs/`) renders through Starlight. Rather than restyling it
from the outside, a small set of component overrides in
`src/components/starlight/` replace Starlight's own header, page frame and footer
so the docs use the same navbar component as the marketing pages. Docs-specific
token overrides live in `src/styles/starlight-custom.css`, where
`--sl-nav-height` is the value every offset in the docs shell derives from.

`src/components/SiteHeader.astro` is the single navbar for both, which is what
keeps the two halves from drifting apart. It is paired across navigations with
view transitions, so moving between marketing and docs morphs the chrome instead
of redrawing it.

Content is three collections defined in `src/content.config.ts` with Zod schemas:
blog posts, About pages, and the documentation, which is mirrored from
`node-red/node-red` rather than authored here (see
[Sync upstream documentation](#sync-upstream-documentation)).

Data that pages read rather than fetch lives in `src/data/`: navigation links,
the "who's using Node-RED" gallery, blog authors, contributors, the announcement,
and a generated logo-tone map. Anything fetched at build time goes through
`src/lib/`, which caches GitHub release data for the version badge and the
Releases page.

## Prerequisites

- Node.js as declared in `package.json#engines` (Node 22, 24 or 26)
- npm, any recent version

## Setup

```sh
npm install
```

Install scripts are disabled repo-wide by `.npmrc`; see the comment in that file
for why, and what to do if a dependency ever genuinely needs one.

## Develop

```sh
npm run dev
```

Starts the Astro dev server on http://localhost:4321 with hot module
replacement.

## Build

```sh
npm run build           # production build, including the Pagefind search index
npm run preview         # serve dist/ locally on http://localhost:4321
```

The build emits the site, `sitemap-index.xml` and `sitemap-0.xml`, an RSS feed at
`/feed.xml` (an alias of `/blog/rss/`), `robots.txt`, and the Pagefind index.

`npm run build` runs `astro check` first, so a type or content-schema error fails
the build rather than shipping.

### Pagefind on ARM64 and 16 KB-page hosts

Pagefind bundles jemalloc compiled for 4 KB memory pages. On ARM64 Linux hosts
with a 16 KB page size (some Apple Silicon developer sandboxes and containers,
certain Linux ARM64 distributions) the search-index step crashes:

```
<jemalloc>: Unsupported system page size
```

Pages still generate before the crash, but the build exits non-zero. Workaround:

```sh
npm run build:sandbox   # equivalent to DISABLE_PAGEFIND=1 npm run build
```

This passes `pagefind: false` to Starlight and skips the index. Use it for local
work on an affected host only. CI runs the unsuffixed `npm run build` on x64
Linux and produces the full index; a deploy built the other way would publish the
documentation with search silently broken.

## Test

```sh
npm test                  # Vitest, assertions over the build output
npm run test:e2e          # Playwright: navigation, a11y, parity, themes, widgets
npm run lint              # ESLint, then Prettier in check mode
npm run lint:fix          # both, in write mode
npm run check             # astro check on its own, no build
```

The e2e suite starts its own preview server on port 4321, so stop any preview
already running first.

## Audit and parity

```sh
npm run verify:urls       # every expected URL is present in the build output
npm run verify:images     # image files survive the build into dist/
npm run lighthouse        # Lighthouse CI against lighthouserc.json
```

The first two run in CI. Both read `dist/`, `public/` and `astro.config.mjs`
directly, so they need no external input. Anything they write as a file lands in
`reports/`, which is gitignored: generated output, not source.

`verify:urls` also fails if a `public/_redirects` manifest reappears. See
[Deployment](#deployment) for why.

Redirect parity has its own coverage in `tests/e2e/parity-redirects.spec.ts`,
which walks every entry in the `redirects:` block and checks where it lands.

## Sync upstream documentation

The documentation under `src/content/docs/` is mirrored from the `docs/` tree in
`node-red/node-red`. It is not edited here: a fix to the docs belongs in that
repository, and arrives through this script.

```sh
npm run sync:upstream                    # show the diff
npm run sync:upstream -- --since=v4.1.0  # since a tag or sha
```

## Project layout

```
src/
  assets/                  Images imported by components (favicon, icon)
  components/              Shared chrome and marketing components
    AnnouncementBanner.astro  Red band under the navbar, on every page
    SiteHeader.astro          The one navbar, marketing and docs
    VersionBadge.astro        Latest release, from src/lib/releases.ts
    docs-widgets/          Dependency-free ports of editor UI widgets
    starlight/             Docs-portal overrides (Header, PageFrame, Footer)
  content/
    blog/                  Blog posts (.md with YAML frontmatter)
    docs/                  Documentation, mirrored from node-red/node-red
    about/                 About pages (.md)
  content.config.ts        Collection schemas (Zod)
  data/
    announcement.ts        The site-wide announcement, band and homepage card
    navigation.ts          Shared nav links (main, footer, about rail)
    users.ts               "Who's using Node-RED" gallery
    authors.ts             Blog author details
    contributors.ts        Contributor wall data
    logo-tones.json        Generated by scripts/audit-logo-tones.mjs
  layouts/                 BaseLayout, BlogPostLayout
  lib/
    releases.ts            Build-time GitHub release data, with a fallback
    api-cache.ts           localStorage cache for client-side API reads
  pages/
    index.astro            Homepage
    releases.astro         Downloads and release history
    feed.xml.ts            RSS endpoint, alias of /blog/rss/
    widget-lab.astro       Internal harness for the docs widgets, noindex
    about/, blog/          Section routes
  styles/
    design-tokens.css      Marketing tokens (colour, spacing, type, motion)
    starlight-custom.css   Docs-portal token and layout overrides
  utils/
    blog.ts                Blog parsing and URL helpers

public/                    Copied to the site root untouched
  CNAME                    nodered.org
  users/, images/          Logo wall and legacy image paths
  blog/, docs/             Post and documentation images at their old URLs

scripts/                   Nothing here runs during a build. Two are CI steps,
                           the rest are hand-run maintenance tools.
  verify-urls.ts           CI: expected URLs present in dist/, _redirects guard
  verify-images.ts         CI: images survive into dist/
  sync-upstream.ts         Pull documentation changes from node-red/node-red
  audit-logo-tones.mjs     Regenerate src/data/logo-tones.json from public/users/
  build-editor-svg.mjs     Rebuild the homepage editor illustration from the export
  trim-logos.mjs           Trim padding on newly added raster logos
  dev-fresh.mjs            Dev server with caches cleared

tests/
  unit/, integration/      Vitest
  e2e/                     Playwright

.github/workflows/
  checks.yml               Lint, types, build, parity, e2e, Lighthouse
  deploy-pages.yml         Build and publish to GitHub Pages, main only

astro.config.mjs           Astro, Starlight, UnoCSS, sitemap, fonts, redirects
uno.config.ts              UnoCSS (preset-wind, preset-icons)
lighthouserc.json          Lighthouse CI thresholds
```

## Deployment

GitHub Actions builds and publishes to GitHub Pages: `deploy-pages.yml`, on push
to `main` or by manual dispatch. `public/CNAME` keeps the domain.

**This requires the repository's Pages source to be set to GitHub Actions.** The
Jekyll site used Pages' built-in build instead, and while that setting stands
this workflow cannot publish, so merging alone will not update the site.

`astro.config.mjs#redirects` is the **only** redirect map. Do not add a
`public/_redirects` back. Earlier drafts of this file described one as a
maintained mirror for Netlify and Cloudflare Pages; it existed, but it was inert
on GitHub Pages, which serves static files and honours no redirect config. It has
been retired, and `scripts/verify-urls.ts` now fails the build if a `_redirects`
manifest reappears.

On Pages, each `redirects:` entry builds a small HTML stub carrying
`<meta http-equiv="refresh">`, a canonical link to the target and
`robots noindex`. That is a soft redirect, not a 301, so the legacy URLs pass no
link equity. This is a known and accepted tradeoff of hosting on Pages: moving to
a host with real redirect support is the only way to change it, and would mean
reinstating a host manifest as the single source rather than as a mirror.

## Known issues

### The homepage forum feed is blocked in production

The homepage's "On the forum" section reads Discourse's `top.json` and
`site.json` from the visitor's browser. `discourse.nodered.org` sends no
`Access-Control-Allow-Origin` header for `https://nodered.org`, so the browser
blocks the response and the section degrades to a single "browse the latest
discussions" link. It looks healthy in development only because the Vite dev
server proxies `/_forum-proxy/*` to Discourse (see `astro.config.mjs`) and
`import.meta.env.DEV` picks that path, so the live feed renders for every
developer and for no real visitor.

The fix is a forum setting rather than a code change: Discourse exposes a
`cors_origins` site setting, and the Node-RED project runs the forum, so a forum
admin adding `https://nodered.org` to it unblocks the section as written. Until
then the feed is expected to be empty for real visitors. The alternative for a
static host is to fetch the threads at build time and ship them with the page,
the way `src/lib/releases.ts` already handles GitHub releases, at the cost of the
list only being as fresh as the last build.

### Open work carried over from the migration

- Images are served from `public/` at their original URLs, so they do not pass
  through Astro's image pipeline and have no responsive variants.
- The documentation table of contents is suppressed below 1100px.
- Search covers the documentation, not the blog or About.
- Some hand-written `img` tags in migrated documentation prose still need `alt`
  text.

## Contributing

Issues and pull requests welcome on
[node-red/node-red.github.io](https://github.com/node-red/node-red.github.io).
See the project [contribution guide](https://nodered.org/about/contribute/) for
what kind of changes are most useful.
