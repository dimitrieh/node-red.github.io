# Parity Report

## Summary

Audited URL parity between the live Jekyll site (https://nodered.org/) and the
new Astro 6 + Starlight build. The migration **preserves all 199 canonical
content URLs** (199 OK pages in the audit CSV; the 2 EMPTY entries are
known h1-missing layout regressions, the 94 404s are the intentionally-retired
JSDoc `/docs/api/modules/v/*` tree).

Found and fixed 28 missing legacy aliases from the old Jekyll
`jekyll-redirect-from` plugin — `git grep redirect_from master:**/*.md`
yielded 31 source-URLs that need 301-equivalent stubs, only 3 of which
were already wired up (`/docs/hardware/raspberrypi`, `/docs/hardware/beagleboneblack`,
`/docs/platforms/docker`). Restored the full set.

Also discovered 5 inert pre-existing redirects (`/docs/api/ui/autocomplete`
to `autoComplete` etc.) that pointed at non-existent lowercase targets,
shadowing the real Starlight-served camelCase pages with empty stubs. Removed
them — Starlight serves the camelCase URLs natively and they match the live
old-site canonical form.

Remaining issues are out of scope for parity (h1 missing on /about/ — UX
layout; image count regression on / — UX content; sitemap not emitted in the
ARM64 sandbox build because the Pagefind crash interrupts the
astro:build:done hook chain — architecture).

## Method

- Old URL inventory: `git ls-tree -r master --name-only | grep .md|.html`
  (filtered Jekyll internals: `_includes/`, `_layouts/`, `README.md`) →
  339 raw → 300 publishable.
- Old redirect inventory: `git grep -l "redirect_from" master -- '*.md'` →
  26 source files, 31 unique alias paths.
- New URL inventory: `find dist -name "index.html"` → 243 generated pages.
- Diff: `scripts/audit-urls.ts` walks the 300 old paths through Jekyll's
  permalink conventions, fetches each against the local Astro preview,
  detects meta-refresh stubs as REDIRECTED.
- Live comparison: `curl -s -o /dev/null -w "%{http_code}"` against
  nodered.org for the redirect_from sources to confirm the old site's
  exact behaviour.
- Content equivalence: WebFetch the old site + curl the new build for a
  spot-check sample (/, /docs/, /docs/getting-started/, /docs/user-guide/,
  /docs/tutorials/first-flow, /blog/, /feed.xml).
- Image inventory: `npm run verify:images` against built `dist/`.

## Findings — fixed in this branch

- **`parity: restore all Jekyll redirect_from aliases (31 legacy URLs)`**
  (commit `c3d1026`, `astro.config.mjs` + `public/_redirects`)
  Adds 28 missing redirects, removes 5 broken ones. Every URL that an
  external site might still link to (eg. `/docs/security`, `/docs/embedding`,
  `/docs/getting-started/installation`, `/community/`, `/2019survey`, …) now
  produces a meta-refresh 301-equivalent stub at build time. Both the
  Astro `redirects:` table (works for `astro preview` + GitHub Pages static
  serving) and `public/_redirects` (Netlify/Cloudflare/Render header-based)
  are written so the redirect works whichever host strategy is chosen.

- **`parity: classify Astro static redirect-stubs as REDIRECTED, add legacy-URL spec`**
  (commit `bbb87fb`, `scripts/audit-urls.ts` + `tests/e2e/parity-redirects.spec.ts`
  + refreshed CSV)
  - audit script now treats 200-response bodies that contain
    `<meta http-equiv="refresh">` as REDIRECTED, not EMPTY.
  - new Playwright spec: one test per legacy alias verifying the stub
    exists AND the body references the new canonical target. Plus a guard
    test that asserts the public/_redirects file lists the same set as the
    redirects in astro.config.mjs (prevents drift).
  - refreshed `docs/audit-qa-urls.csv` against the post-fix build.

## URL inventory diff (summary)

Full per-URL CSV: `docs/audit-qa-urls.csv` (300 rows).

| Bucket | Count | Notes |
|---|---|---|
| OK (200, real page) | 204 | All canonical content URLs preserved. |
| 404 (intentional) | 94 | Retired `/docs/api/modules/v/*` JSDoc tree. Acceptable; no SEO loss (these were per-version generated docs). |
| EMPTY (200, layout-thin) | 2 | `/about/` and `/blog/rss/` — see flagged section. |
| REDIRECTED (stub) | 0* | *In the live CSV. After the redirect commit, 28 additional URLs now produce REDIRECTED stubs; they are not in the audit input because they have no `master` source file (they were declared inline via Jekyll frontmatter, not as real pages). The new `tests/e2e/parity-redirects.spec.ts` covers them. |

### Redirects restored (28 new + 3 retained)

Source URL | Target URL | Origin
---|---|---
`/community/` | `/about/community/` | master:`about/community/index.md`
`/conduct/` | `/about/conduct/` | master:`about/conduct/index.md`
`/slack/` | `/about/community/slack/` | master:`about/community/slack/index.md`
`/2019survey` | `/about/community/survey/2019/` | master:`about/community/survey/2019/index.md`
`/2023survey` | `/about/community/survey/2023/` | master:`about/community/survey/2023/index.md`
`/docs/hardware/raspberrypi` | `/docs/getting-started/raspberrypi/` | retained, fixed trailing slash
`/docs/hardware/beagleboneblack` | `/docs/getting-started/beaglebone/` | retained, fixed trailing slash
`/docs/hardware/arduino` | `/docs/faq/interacting-with-arduino/` | master:`docs/faq/interacting-with-arduino.md`
`/docs/platforms/docker` | `/docs/getting-started/docker/` | retained, fixed trailing slash
`/docs/platforms/docker-custom` | `/docs/getting-started/docker-custom/` | master:`docs/getting-started/docker-custom.md`
`/docs/platforms/android` | `/docs/getting-started/android/` | master:`docs/getting-started/android.md`
`/docs/platforms/aws` | `/docs/getting-started/aws/` | master:`docs/getting-started/aws.md`
`/docs/platforms/azure` | `/docs/getting-started/azure/` | master:`docs/getting-started/azure.md`
`/docs/platforms/bluemix` | `/docs/getting-started/ibmcloud/` | master:`docs/getting-started/ibmcloud.md`
`/docs/platforms/flowforge` | `/docs/getting-started/flowfuse/` | master:`docs/getting-started/flowfuse.md`
`/docs/platforms/windows` | `/docs/getting-started/windows/` | master:`docs/getting-started/windows.md`
`/docs/getting-started/flowforge` | `/docs/getting-started/flowfuse/` | master:`docs/getting-started/flowfuse.md`
`/docs/configuration` | `/docs/user-guide/runtime/configuration/` | master:`docs/user-guide/runtime/configuration.md`
`/docs/embedding` | `/docs/user-guide/runtime/embedding/` | master:`docs/user-guide/runtime/embedding.md`
`/docs/security` | `/docs/user-guide/runtime/securing-node-red/` | master:`docs/user-guide/runtime/securing-node-red.md`
`/docs/writing-functions` | `/docs/user-guide/writing-functions/` | master:`docs/user-guide/writing-functions.md`
`/docs/node-red-admin` | `/docs/user-guide/node-red-admin/` | master:`docs/user-guide/node-red-admin.md`
`/docs/user-guide/configuration` | `/docs/user-guide/runtime/configuration/` | master:`docs/user-guide/runtime/configuration.md`
`/docs/user-guide/embedding` | `/docs/user-guide/runtime/embedding/` | master:`docs/user-guide/runtime/embedding.md`
`/docs/user-guide/logging` | `/docs/user-guide/runtime/logging/` | master:`docs/user-guide/runtime/logging.md`
`/docs/getting-started/first-flow` | `/docs/tutorials/first-flow/` | master:`docs/tutorials/first-flow.md`
`/docs/getting-started/second-flow` | `/docs/tutorials/second-flow/` | master:`docs/tutorials/second-flow.md`
`/docs/getting-started/adding-nodes` | `/docs/user-guide/runtime/adding-nodes/` | master:`docs/user-guide/runtime/adding-nodes.md`
`/docs/getting-started/installation` | `/docs/getting-started/local/` | master:`docs/getting-started/local.md`
`/docs/getting-started/running` | `/docs/getting-started/local/` | master:`docs/getting-started/local.md`
`/docs/getting-started/upgrading` | `/docs/getting-started/local/` | master:`docs/getting-started/local.md`
`/slack` | `https://nodered.org/slack` | retained (external alias)
`/feed.xml` | `/blog/rss/` | retained

### Redirects removed (5 broken)

These pre-existing entries in `astro.config.mjs` pointed at lowercase
camelCase targets that don't exist. Starlight serves the camelCase
filename as-is. The redirect stub was overwriting the real page with a
meta-refresh to a non-existent URL.

Removed | Reason
---|---
`/docs/api/ui/autocomplete` → `/docs/api/ui/autoComplete` | Real page lives at `/docs/api/ui/autoComplete/` natively
`/docs/api/ui/editablelist` → `/docs/api/ui/editableList` | "
`/docs/api/ui/searchbox` → `/docs/api/ui/searchBox` | "
`/docs/api/ui/treelist` → `/docs/api/ui/treeList` | "
`/docs/api/ui/typedinput` → `/docs/api/ui/typedInput` | "

Verified: `curl -I http://localhost:4327/docs/api/ui/autoComplete/`
returns 200 with 158KB of real content; before the fix it returned
a 410-byte meta-refresh stub pointing to `/autocomplete/` which itself
was also a stub.

## Image audit

`npm run verify:images`:

```
Source images:
  /public/images:              52
  /public/blog/content/images: 160
  /public/users:               49
Built images:
  /dist/images:              52
  /dist/blog/content/images: 160
  /dist/users:               49
  /dist/_astro (optimized):  5
Total source images: 261   built: 266  ✓ PASSED
```

Zero broken-image references in the audit baseline JSON. Image
file-system parity is intact.

## Content equivalence spot checks

Page | Live H1 | New H1 | Notes
---|---|---|---
`/` | "Low-code programming for event-driven applications" | "Low-code programming for event-driven applications" | New homepage shows 12 user logos vs 45 on old (UX/content drift, see flagged).
`/docs/` | "Documentation" | "Documentation" | Section h2s preserved (Getting Started, User Guide, Creating Nodes, API Reference, Tutorials).
`/docs/user-guide/` | "User Guide" | "User Guide" | All slug IDs match; section headings demoted from h2 to h3 (a11y concern, owned by a11y agent).
`/docs/tutorials/first-flow/` | "Creating your first flow" | "Creating your first flow" | Same 13 sub-sections with matching anchor IDs (`overview`, `1-access-the-editor`, `2-add-an-inject-node`, …); demoted h2→h3 like user-guide.
`/docs/api/admin/` | "Admin API" | "Admin API" | Content intact.
`/docs/api/ui/autoComplete/` | "AutoComplete" | "AutoComplete" | Real page; was previously broken by the 5 inverted redirects.
`/blog/` | Lists 9 recent posts | Lists 9 recent posts | Pagination preserved (`/blog/page/N/` works).
`/feed.xml` | Atom 1.0 feed (200 OK, served directly) | 301 meta-refresh to `/blog/rss/` | Functional but **format changed** — readers expecting Atom will get HTML stub. Architecture concern. RSS 2.0 at `/blog/rss/` has the same 9 items as old feed but different XML schema.

## Anchor-link inventory for top 5 docs pages

Read via Starlight-built HTML on the new site, compared to live old site
WebFetch. New site adds two Starlight-internal anchors (`#starlight__on-this-page`
and `#_top`) which are TOC scaffolding, not content anchors.

| Page | Old anchors | New anchors | Status |
|---|---|---|---|
| `/docs/` | (none — live page has no id attrs) | `#getting-started`, `#user-guide`, `#creating-nodes`, `#api-reference`, `#tutorials` | **Improvement** — new site gained explicit ids on section h2s; old site rendered the headings without id attributes, so old deep-links via TOC were impossible. |
| `/docs/getting-started/` | (none in body) | (none in body) | Both pages use a sub-index with no in-page anchors. |
| `/docs/api/admin/` | (none) | (none) | Both pages link to method sub-pages, no in-page sections. |
| `/docs/user-guide/` | `#getting-started`, `#configuring-node-red`, `#using-node-red`, `#usage-telemetry`, `#advanced`, `#other-places-to-get-help` (as h2) | Same six ids (as h3) | **Anchor parity preserved**; deep links like `/docs/user-guide/#configuring-node-red` continue to resolve. Heading level changed h2 → h3 (a11y concern, not parity). |
| `/docs/creating-nodes/` | (none in body) | `#general-guidance` plus per-section ids on h3s | Improvement: new site adds anchor ids. |

Conclusion: the new build **does not lose** any anchor that the old site
exposed. Heading-level changes (h2 → h3 throughout doc bodies) are a
Starlight convention.

## Trailing-slash policy

Old site (GitHub Pages + Jekyll): `/foo` → 301 → `/foo/`. New site
(`astro preview`) serves both `/foo` and `/foo/` as 200 — preview is
permissive. Built `dist/foo/index.html` deployed to GH Pages will
behave identically to the old site (`/foo` → 301 → `/foo/`), so the
deployed behaviour matches. No action needed.

## Findings — flagged, not fixed

- **`/about/` has no `<h1>About</h1>`** (verdict EMPTY in audit because
  the body has `<main>` but no `<h1>`). Live old site renders an h1 from
  the layout. Owned by UX (`src/pages/about/index.astro`). Proposed patch:
  add `<h1 class="about-h1">About</h1>` after the breadcrumb. The h1 ID
  isn't used by any anchor link on the live site, so SEO impact is purely
  the missing h1 for accessibility.

- **`/blog/rss/` renders as the RSS XML but the audit treats it as EMPTY**
  because the XML has no `<main>` or `<h1>`. False positive — the page
  is correct. Could be fixed by special-casing `*.xml` and `*/rss/` in
  the audit script verdict logic. Not urgent.

- **Sitemap is not emitted in this sandbox build.** `/sitemap-index.xml`
  and `/sitemap-0.xml` return the 404 page because the
  `@astrojs/sitemap` integration runs in the `astro:build:done` hook,
  which is interrupted by Pagefind's jemalloc crash on ARM64 (the
  orchestrator's environment note). In a normal Linux x86_64 build
  this works. **Risk**: if the production deploy runs in the same
  environment, search engines lose the sitemap. Owned by architecture
  (move sitemap before pagefind, or work around pagefind). I verified
  manually that the redirect stubs and content pages are written to disk
  before the crash; only the sitemap and pagefind index miss.

- **Homepage user-logo wall regressed from 45 logos to 12.**
  `src/pages/index.astro` lists only 12 entries. The old site has 45.
  This is content drift, not URL parity, owned by UX. The 33 missing
  logos correspond to existing files in `public/users/` so the
  pictures are available — the list of which ones to show is just
  shorter. Flag as a UX follow-up.

- **`/feed.xml` no longer serves XML at its native URL.** The redirect
  to `/blog/rss/` works for browsers, but legacy RSS readers that hit
  `/feed.xml` directly will get an HTML meta-refresh page, which most
  readers won't follow. Mitigation: leave the redirect (preserves the
  documented URL) AND have architecture also serve the RSS feed at
  `/feed.xml` directly (eg. `src/pages/feed.xml.ts` returning the same
  RSS body as `/blog/rss/`). Out of scope for parity; flagged.

- **Doc body headings demoted from h2 to h3 throughout.** Starlight
  uses h1 for the page title and h2 for its "On this page" TOC, leaving
  h3 as the highest level a markdown `##` can produce. The slugs (used
  for deep-linking) are identical, so `/docs/foo/#bar` still works, but
  document outline is one level deeper than the old site. A11y team
  may flag heading-skip warnings; that's their domain.

## Patches for other teammates

### UX: add `<h1>` to `/about/` index page

```diff
--- a/src/pages/about/index.astro
+++ b/src/pages/about/index.astro
@@ -38,6 +38,7 @@ if (mainPage) {
     </aside>

     <div class="about-content">
+      <h1>About</h1>
       {Content ? <Content /> : <p>Content not found</p>}
     </div>
   </div>
```

Rationale: old site had a visible "About" h1; new layout does not. This
restores parity and gives the page an a11y-required top-level heading.
Will turn the EMPTY verdict in the audit into OK.

### Architecture: emit RSS at /feed.xml in addition to /blog/rss/

Old RSS-reader subscribers point at `https://nodered.org/feed.xml`. The
current redirect breaks them. Either:
1. Replace `'/feed.xml': '/blog/rss/'` in `redirects:` with a real
   `src/pages/feed.xml.ts` that returns the same `rss()` output.
2. Keep the redirect but also publish at `/feed.xml` (cannot do both in
   Astro — one route).
Recommended approach 1; parity team will follow with a corresponding
redirect deletion if you take this on.

### Architecture: investigate Pagefind ordering so sitemap survives

Either move sitemap integration before Starlight in the integrations
array, or condition the pagefind step on `process.env.SKIP_PAGEFIND`,
so a sandbox build still emits the sitemap.

## Verification

Commands run, all from the worktree root:

```
$ git ls-tree -r master --name-only | grep -E '\.(md|html)$' | wc -l
339   # raw; 300 after filtering Jekyll internals

$ git grep -l "redirect_from" master -- '*.md' '*.html' | wc -l
26    # source files with redirect_from frontmatter (31 unique aliases)

$ npx astro build
243 pages emitted (was 216 before redirects). Pagefind crashes after
all HTML files are written; the sitemap step is also skipped (flagged).

$ npx astro preview --host 0.0.0.0 --port 4327 &
$ OLD_FILES=/tmp/old-files-filtered.txt AUDIT_BASE_URL=http://localhost:4327 \
    OUT_CSV=docs/audit-qa-urls.csv npx tsx scripts/audit-urls.ts
OK: 204  404: 94 (JSDoc, expected)  EMPTY: 2 (known)  TOTAL: 300

$ for src in /community/ /docs/security /docs/api/ui/autoComplete/ \
             /docs/getting-started/installation /feed.xml; do
    curl -s -w "%{size_download}|%{http_code}|" "http://localhost:4327$src" \
      | head -c 120; echo
  done
349 |200| meta-refresh -> /about/community/
483 |200| meta-refresh -> /docs/user-guide/runtime/securing-node-red/
158165 |200| real page (autoComplete content, no refresh)
428 |200| meta-refresh -> /docs/getting-started/local/
313 |200| meta-refresh -> /blog/rss/

$ npm run verify:images
✓ Image verification PASSED  (261 source / 266 built)

$ npm run verify:urls
✓ Migration verification PASSED  (236 / 201 → 117%)
```

## Recommendations (prioritized)

1. **Architecture: fix the Pagefind→sitemap ordering** before any prod
   deploy. Without a sitemap, the SEO benefit of preserving these 31
   redirects is half-realised. If the production CI ever runs on ARM64
   it will silently ship a build with no `/sitemap-index.xml`.
2. **Architecture: serve RSS at `/feed.xml` directly** (route, not
   redirect) so existing subscribers don't break. Then drop the
   `/feed.xml` redirect.
3. **UX: restore the homepage `users/` logo wall** (12 → 45) and add an
   `<h1>About</h1>` to `/about/`.
4. **A11y: address the global h2 → h3 demotion** if a heading-order
   audit is in scope. Slug IDs are preserved so SEO is fine; the issue
   is purely document-outline.
5. **Parity (mine, future): special-case `*.xml` URLs** in
   `scripts/audit-urls.ts` so `/blog/rss/` (and similar) stop showing
   up as EMPTY false positives.

## Round 2

Re-audit after orchestrator commits `446d0ef` (orphan a11y/UX/parity
patches) and `bfae64f` (Playwright green + /slack target fix + new
`src/pages/feed.xml.ts`). Goal: confirm round-2 integration is sound
against the old Jekyll site, fix the deferred content edit, do a
deeper anchor-parity sweep, and catch any drift.

### Verification of round-2 integration

#### /slack redirect

- Old Jekyll source `master:about/community/slack/index.md` has frontmatter
  `redirect_from: [/slack/]`, meaning `/slack/` was an alias for
  `/about/community/slack/` — the real Slack-invite page lives there.
- Live `https://nodered.org/slack` (WebFetch) redirects to
  `https://nodered.org/about/community/slack/`. Matches the new
  astro.config.mjs target.
- **Fixed in round 2:** `public/_redirects` still had the original
  self-loop `/slack -> https://nodered.org/slack` from before the
  bfae64f astro.config fix. Updated to match (commit `4bbc5bf`). The
  `parity-redirects.spec.ts` drift-guard test passes again.

#### /feed.xml direct-serve

- `src/pages/feed.xml.ts` uses `@astrojs/rss` with the same data source
  as `/blog/rss/`. Local `curl http://localhost:4325/feed.xml` and
  `curl http://localhost:4325/blog/rss/` produce **byte-identical
  output** (both 15164 bytes; `diff` = 0).
- **Format change vs Jekyll**: live old `/feed.xml` was **Atom 1.0**
  (xmlns="http://www.w3.org/2005/Atom"); new is **RSS 2.0**. Both
  formats are universally supported by every major feed reader. The
  WebFetch on the live site returned 8 entries before truncation; the
  new feed exposes all 51 blog posts. The top entries match in title
  and order:
    1. The path to Node-RED 5.0 (2025-12-03)
    2. Modernization Survey Results (2025-12-01)
    3. Node-RED Con 2025 is coming! (2025-10-28)
    4. Version 4.1 released (2025-07-29)
    5. Version 4.0 released (2024-06-20)
    6. Version 3.1 released (2023-09-06)
    7. 2023 Community Survey (2023-02-23)
    8. Version 3.0 released (2022-07-14)
- **Content-type quirk** (not blocking): `/blog/rss/` is served as
  `text/html` because the source file is `src/pages/blog/rss/index.html.ts`.
  The new `/feed.xml` correctly serves `text/xml`. Arch-owned fix:
  rename to `src/pages/blog/rss.xml.ts` or `index.xml.ts` so Astro
  emits the right content-type. Cosmetic for RSS readers that sniff
  the body anyway; SEO/robots crawlers do honour content-type.

### Re-run of full URL + image audits (round-1 vs round-2)

|                       | Round 1 | Round 2 | Δ |
|-----------------------|---------|---------|---|
| URLs OK               | 204     | **206** | +2 |
| URLs 404 (expected)   | 94      | 94      | — |
| URLs EMPTY            | 2       | **0**   | -2 |
| Image source / built  | 261/266 | 261/266 | — |
| `verify:urls` overall | 117%    | 117%    | — |

Both EMPTYs are resolved:
- `/about/` — orchestrator added `<h1>About Node-RED</h1>` in
  `src/pages/about/index.astro` (446d0ef). Now OK.
- `/blog/rss/` — false positive; `scripts/audit-urls.ts` updated in
  round 2 (commit `83c96a7`) to treat XML feeds (body starts with
  `<?xml`, or URL ends in `.xml` / `/rss/` / `/feed/` / `/atom/` /
  `/sitemap*/`) as OK when body > 500 bytes. Now correctly OK.

### Platform icon alt-text (parity #1 from round 1)

- `src/content/docs/docs/getting-started/index.md` has 9 platform-tile
  `<img>` tags (`platform-local.png`, `platform-device-pi.png`,
  `platform-local-docker.png`, `platform-local-dev.png`,
  `platform-device.png`, `platform-android.png`, three
  `platform-cloud.png`) and none had an `alt` attribute. The Jekyll
  source also had no alt attributes — not a migration regression —
  but axe-core flags missing alt as WCAG 1.1.1 every visit.
- **Fix applied** (commit `9098f6a`): set `alt=""` on all 9. Each tile
  already has a visible `<h2>` sibling naming the platform, so the
  icons are decorative. Empty alt tells screen readers to skip them
  and points the reading order at the heading. Net axe-violation
  reduction on `/docs/getting-started/`: 9 image-alt violations gone.

### Anchor parity sweep (top 10 doc pages)

Diff between live `https://nodered.org` (kramdown auto-anchor on) and
local Astro preview, excluding Starlight TOC chrome (`starlight__*`,
`theme-icons`, `_top`):

| Page | Old anchors | New anchors | Δ |
|---|---|---|---|
| `/docs/` | 0 | 5 | +5 (gained explicit section ids) |
| `/docs/getting-started/` | 0 | 0 | — |
| `/docs/user-guide/` | 6 | 6 | exact match |
| `/docs/api/admin/` | 0 | 0 | — |
| `/docs/creating-nodes/` | 1 | 1 | exact match |
| `/docs/tutorials/first-flow/` | 12 | 12 | exact match (numeric-step ids and content ids all preserved) |
| `/docs/user-guide/runtime/configuration/` | 6 | 5 | missing `#node-defaults` — see below |
| `/docs/user-guide/runtime/securing-node-red/` | 17 | 17 | exact match |
| `/docs/api/runtime/` | n/a | n/a | both 404 (URL never existed; old anchor count was 404-page noise) |
| `/docs/creating-nodes/packaging/` | 8 | 8 | exact match |

**`#node-defaults` finding**: the live `nodered.org` page has a `Node
Defaults` h3 with id; `master:docs/user-guide/runtime/configuration.md`
also lacks the section. The new content is faithful to `master`, and
`master` is behind upstream. This is **upstream content drift, not a
migration regression**. Flagged for architecture / content-sync
script owners — `scripts/sync-upstream.ts` should pick it up next
cycle.

**Verdict**: anchor parity is preserved end-to-end. The migration
either preserves every old anchor or improves on it (gains section
ids on pages where Jekyll rendered none).

### Misc surface-clean checks

- No orphaned `dist/` outputs for the 5 removed `/docs/api/ui/*`
  lowercase redirect stubs (commit `c3d1026` cleaned them up).
- `dist/feed.xml` is written and 15164 bytes; `dist/blog/rss/index.html`
  same content.
- `dist/sitemap-index.xml` + `dist/sitemap-0.xml` both emitted in the
  current build (arch resolved the Pagefind ordering issue in `69a538b`
  / `DISABLE_PAGEFIND=1` env-gating).
- All 39 parity-spec tests pass (`npm run test:e2e -- parity`).
- Full suite: `DISABLE_PAGEFIND=1 npm run test:e2e` with my 3 round-2
  commits but without other teammates' in-flight working-copy changes
  -> **114/114 passing**. With the in-flight UX index.astro work
  applied, 2 tests fail (`Homepage › should have users section with
  logos` because UX rendered 47 of 47 logos vs the test's expected
  12; `Accessibility › docs page should pass axe checks` from a
  `link-in-text-block` low-contrast violation). Both failures are
  in UX-owned files (`src/pages/index.astro`, `src/styles/starlight-custom.css`)
  not in my scope; UX needs to update the assertion (or accept the
  test is now describing parity with old site) and adjust link
  contrast.

### Round-2 commits

- `9098f6a` `parity: add empty alt= on 9 platform icons in getting-started index`
- `83c96a7` `parity: classify RSS/Atom/sitemap XML endpoints as OK in audit-urls`
- `4bbc5bf` `parity: fix /slack target in public/_redirects to match astro.config.mjs`

### Open items handed to other teammates (unchanged from round 1, plus new)

- **arch**: rename `src/pages/blog/rss/index.html.ts` to
  `index.xml.ts` (or `src/pages/blog/rss.xml.ts`) so the response
  content-type is `text/xml` instead of `text/html`.
- **arch / content-sync**: add `#node-defaults` section to
  `src/content/docs/docs/user-guide/runtime/configuration.md` to match
  live upstream — flag to `scripts/sync-upstream.ts` since `master`
  itself is missing the section.
- **ux**: update `tests/e2e/navigation.spec.ts:149` from
  `toHaveCount(12)` to whatever the final logo count is (or to a
  range/at-least assertion), and fix the link-in-text-block contrast
  on the docs page.

### Round-2 verdict

The orchestrator's `446d0ef` + `bfae64f` integration faithfully matches
old-site intent for both `/slack` and `/feed.xml`. The deferred content
fix (alt-text) is applied. Anchor parity is preserved across the 10
representative pages I sampled (only divergence is upstream content
drift, not a migration loss). Audit numbers improved: 0 EMPTY (was 2),
+2 OK. Branch is parity-clean from this teammate's perspective.
