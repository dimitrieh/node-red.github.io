// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import starlight from '@astrojs/starlight';
import UnoCSS from '@unocss/astro';

import sitemap from '@astrojs/sitemap';

import { VIEW_TRANSITION_HEAD } from './src/styles/view-transition-head.js';

// Pagefind bundles jemalloc compiled for 4 KB pages; ARM64 hosts with 16 KB
// pages crash with "Unsupported system page size". Set DISABLE_PAGEFIND=1 to skip
// search-index generation locally. Production CI on 4 KB hosts leaves this unset
// and gets full Pagefind.
const disablePagefind = process.env.DISABLE_PAGEFIND === '1';

// Extra Host header values the dev and preview servers should accept, read from
// ASTRO_ALLOWED_HOSTS as a comma-separated list. Empty by default, which leaves
// Vite's own loopback allowance in place and its DNS-rebinding check doing its
// job. Needed only when the server is reached under another name, such as from a
// container host or over a LAN or VPN address.
const allowedHosts = () =>
  (process.env.ASTRO_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

// Real pages that should not be indexed or listed in the sitemap: reachable, but
// internal tooling rather than content. Paths are stored without a trailing slash
// and compared that way, because `trailingSlash` is left at its `ignore` default.
//
// Every route here must ALSO pass `noindex` to BaseLayout. The two do different
// jobs: the sitemap keeps the URL from being advertised, the meta tag keeps it out
// of the index if a crawler reaches it another way. Neither is sufficient alone.
const INTERNAL_ROUTES = new Set(['/widget-lab']);

// Deployed origin. Held in a const because the docs `head` block below has
// to bake it into an absolute og:image URL (og:image consumers do not
// resolve relative paths, and Starlight's `head` entries are plain static
// attrs with no access to Astro.site). A pasted literal down there would
// drift silently if the site ever moves, so both derive from one value.
const SITE = process.env.SITE_ORIGIN || 'https://nodered.org';

// Sub-path the site is served from, with a leading and a trailing slash.
// '/' on nodered.org, which is served from the root of its own domain. A
// GitHub Pages *project* site lives under https://<user>.github.io/<repo>/
// instead, so a preview deploy sets SITE_BASE='/<repo>/'. Normalised here so
// the value is the same shape however it is written in the environment.
const baseSegments = (process.env.SITE_BASE || '/').split('/').filter(Boolean);
const BASE = baseSegments.length ? `/${baseSegments.join('/')}/` : '/';
// Same asset and same resolution rule as the marketing side's default
// social image (BaseLayout.astro resolves `/node-red-icon.png` against
// Astro.site into `resolvedOgImage`), so a docs link and a marketing link
// preview with identical artwork.
const DOCS_OG_IMAGE = new URL(`${BASE}node-red-icon.png`, SITE).href;

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  // Shiki syntax-highlighting theme. Our code blocks render on a dark
  // surface (`pre { background: var(--nr-bg-dark) }` = #1E1E1E) in both
  // light and dark site themes, so the syntax-highlighting palette must
  // be designed for a dark background. Astro's default is `github-dark`
  // for dark surfaces; older versions defaulted to `github-light` which
  // gives code text colour `#403F53` — invisible (1.5:1) on #1E1E1E.
  // Pin `github-dark` explicitly so the contrast is correct regardless
  // of Astro's default. Use `themes` (object form) if/when we want a
  // separate light-theme palette in the future.
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  // Self-hosted web fonts, replacing the Google Fonts CDN link that used to sit
  // in BaseLayout.astro and in the Starlight `head` array below.
  //
  // The CDN was the worst thing on the critical path, and it was the only thing
  // on it. Measured on a docs page, the sole resource the browser reported with
  // `renderBlockingStatus: "blocking"` was the
  // https://fonts.googleapis.com/css2?... stylesheet, and behind it sat font
  // files on a SECOND origin (fonts.gstatic.com). A cold visit therefore paid
  // two third-party DNS/TLS handshakes before any text could paint, for a
  // resource whose whole job is to describe fonts we already know we want.
  //
  // The link carried a comment claiming the CSS2 endpoint "ships a single woff2
  // keyed on both axes, so the cost is one file regardless of how many weights
  // the page uses". That was false, and it is worth recording why so nobody
  // re-derives it: the axes have nothing to do with the file count, the SUBSETS
  // do. Google splits every family by `unicode-range` and returns a separate
  // face and file per subset (for Google Sans Flex: latin, latin-ext, math,
  // symbols, vietnamese, cherokee, syriac, nushu, tifinagh and more), and the
  // measured docs page really did pull several of those plus Ubuntu Mono.
  //
  // Astro downloads the same files at build time, serves them from our own
  // origin, and the <Font /> component inlines the @font-face CSS into the
  // document head, so no stylesheet request stands between the parser and the
  // first paint and no third-party origin is contacted at all.
  //
  // Same bytes, verified rather than assumed: the `src` URL Astro resolves for
  // the latin face is character-for-character the one the hand-written link
  // produced (.../s/googlesansflex/v22/t5svIQcYNIWbF...woff2), and likewise for
  // Ubuntu Mono (.../s/ubuntumono/v19/KFOjCneDtsqEr0keqCMhbCc6CsTYl4BO.woff2).
  // Glyph outlines, axis ranges and advance widths are unchanged by the move,
  // which matters because SiteHeader.astro's wordmark hover cancels a measured
  // advance-width growth of Google Sans Flex's wght axis.
  //
  // Both families have to be rendered into the head by a <Font /> component, and
  // this site has two page types that share no layout, so there are two call
  // sites and they must stay in step: src/layouts/BaseLayout.astro for
  // marketing pages, src/components/starlight/Head.astro for docs pages.
  //
  // THE ONE THING TO KNOW BEFORE WRITING A font-family ANYWHERE: these families
  // are no longer addressable by name. Astro appends a hash of each family's
  // config to the name in the @font-face rules it generates, so what ships is
  // "Google Sans Flex-<hash>", and a literal 'Google Sans Flex' in CSS now
  // matches no face. An unmatched family name is not an error in CSS, so the
  // symptom is silent: text renders in the next entry of the stack, usually
  // system-ui, with nothing logged. Always go through `cssVariable`. The
  // handles are --font-sans / --font-mono (design-tokens.css), --sl-font /
  // --sl-font-mono for docs (starlight-font-tokens.css), the `font-sans`,
  // `font-heading` and `font-mono` Uno utilities (uno.config.ts), or the
  // generated variables below directly. All of them resolve to one of the two
  // cssVariables here, which is the only reason they agree.
  //
  // Weight of the inlined CSS, since inlining trades a request for bytes on
  // every page: the generated block is around 11 KB raw, because Astro repeats
  // the metric-matched fallback faces once per subset and they are identical.
  // It is highly repetitive, so it gzips to under 2 KB (measured). That is the
  // right side of the trade against a render-blocking round trip to a
  // third-party origin, but it is the reason to keep the subset list below
  // honest rather than generous.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Google Sans Flex',
      // Referenced as var(--font-google-sans-flex) by --font-sans in
      // src/styles/design-tokens.css and by `theme.fontFamily.sans` /
      // `.heading` in uno.config.ts. Those three have to agree or a Uno
      // utility and a token silently resolve to different faces.
      cssVariable: '--font-google-sans-flex',
      // One variable file per subset covering the whole axis, not a file per
      // weight. The site uses the range, not a handful of stops: the wordmark
      // animates its weight from 600 to 800 on hover and the homepage masthead
      // asks for 900. Discrete `weights` would download a file each and break
      // the hover transition, which needs a continuous axis to interpolate.
      // Google's metadata reports wght 1..1000 for this family; 100..900 is the
      // span the site actually asks for.
      weights: ['100 900'],
      // The family also exposes an opsz axis (6..144 per Google's metadata) and
      // the CDN link requested that full range, so keep requesting it: the
      // browser then picks the optical size that suits the rendered size,
      // which is visible between body copy and the masthead. `weights` and
      // `styles` map to the wght and ital axes; every other axis goes through
      // the Google provider's `options.experimental.variableAxis`.
      options: {
        experimental: {
          variableAxis: {
            opsz: [['6', '144']],
          },
        },
      },
      // No italic face exists for this family (its axes are wght, opsz, slnt,
      // wdth, GRAD and ROND, with no ital), and the CDN link never asked for
      // one. Astro's default would request normal AND italic, so this has to be
      // narrowed explicitly. Italic sans text keeps being synthesised by the
      // browser, exactly as it is today.
      styles: ['normal'],
      // Only the subsets whose glyphs this site actually renders. Chosen by
      // scanning src/ for codepoints above U+00FF and mapping each to the
      // subset that covers it, not by taste:
      //   latin      ASCII plus the typographic punctuation and the U+2191 /
      //              U+2193 / U+2212 characters used in UI chrome.
      //   latin-ext  accented Latin, which turns up in blog author names and
      //              quoted product names.
      //   math       U+2192 arrows in homepage and blog "See all" call to
      //              actions, U+21B3 as generated content on mobile nav
      //              sub-items, plus the comparison signs in copy.
      //   symbols    U+2699 on the wordmark tuner toggle and U+2318 in docs
      //              keyboard shortcuts.
      // The scripts Google also offers for this family (cherokee, syriac,
      // nushu, tifinagh, canadian-aboriginal, vietnamese) have no glyph on this
      // site, so their files are not downloaded or served. Every face kept here
      // is still `unicode-range` gated, so an ASCII-only page fetches the latin
      // file and nothing else. Box-drawing characters (U+2500 and friends, used
      // in a docs tree diagram) sit in NO Google subset of this family and
      // already render from a system font; that is unchanged.
      subsets: ['latin', 'latin-ext', 'math', 'symbols'],
      // Matches the chain the --font-sans token used to spell out, so the tail
      // behaviour is identical if every download fails. Because the last entry
      // is a generic family name, Astro also generates metric-matched faces
      // ahead of it: `src: local(...)` declarations named "Google Sans Flex
      // fallback: <font>" carrying size-adjust and ascent overrides derived
      // from the real font metrics, for the platform UI fonts behind system-ui
      // (BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial). That is
      // what keeps the swap from shifting layout, so `optimizedFallbacks` stays
      // at its default of true and the generic name stays last.
      fallbacks: ['-apple-system', 'system-ui'],
      // Explicit only because the CDN link spelled out `&display=swap` and
      // someone will look for where that went. It is also Astro's default.
      display: 'swap',
    },
    {
      provider: fontProviders.google(),
      name: 'Ubuntu Mono',
      // Referenced as var(--font-ubuntu-mono) by --font-mono in
      // src/styles/design-tokens.css and by `theme.fontFamily.mono` in
      // uno.config.ts.
      cssVariable: '--font-ubuntu-mono',
      // Regular only. The 700 face is deliberately not shipped: bold monospace
      // is not part of the design, and Astro's default of weight 400 alone is
      // the behaviour we want, spelled out so a later reader does not "fix" it
      // by adding 700. Ubuntu Mono is a static family (Google's metadata
      // reports no variable axes), so a weight here is a file, unlike the sans
      // above.
      weights: [400],
      // Same reason as the sans: Astro would otherwise also fetch the italic
      // face, which the CDN link never requested.
      styles: ['normal'],
      // Code blocks and inline code are mostly ASCII, but docs samples quote
      // accented names and paths. Both faces are `unicode-range` gated, so an
      // ASCII-only page fetches the latin file alone.
      subsets: ['latin', 'latin-ext'],
      // Mirrors the old --font-mono chain. Ending on the generic `monospace`
      // gets the metric-matched "Ubuntu Mono fallback: Courier New" face from
      // Astro on top of it.
      fallbacks: ['Cascadia Code', 'Fira Code', 'monospace'],
      display: 'swap',
    },
  ],
  // Astro enables prefetching by default only on pages that mount
  // `<ClientRouter />`. This site deliberately has no client router: the
  // page-to-page animation is a native CSS cross-document view transition
  // declared in src/styles/view-transition-head.js. So the default never
  // applies and `prefetch` has to be set here explicitly. Measured on
  // /docs/user-guide/concepts/ before this block: no prefetch script in the
  // document, no `data-astro-prefetch` on any link, no speculation rules,
  // nothing warmed. That is the whole problem: a cross-document transition
  // cannot begin until the response arrives, so every docs click paid a full
  // round trip before anything animated.
  //
  // `hover` rather than `viewport`: the docs sidebar renders most of the
  // reference tree in the viewport on every page, so `viewport` would fire a
  // speculative fetch for nearly the whole section on load. `hover` starts
  // the fetch the moment a sidebar item is pointed at or focused, which is
  // usually early enough to cover the round trip while staying cheap on
  // bandwidth. Start conservative; move to `viewport` only if the measured
  // hover-to-click gap turns out too short to hide the request.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  experimental: {
    // Upgrades the prefetch above to the Speculation Rules API where the
    // browser supports it, which prerenders the target document instead of
    // only fetching it; browsers without support fall back to the plain
    // `<link rel="prefetch">` path. Needs no client router, so it composes
    // with the native cross-document transitions rather than replacing them.
    clientPrerender: true,
  },
  vite: {
    server: {
      // Vite rejects requests whose Host header it does not recognise, which is
      // what stops a DNS-rebinding attack from reaching a dev server. Loopback
      // is allowed by default, so this only needs setting when the server is
      // reached under another name: a container host, a LAN or VPN address, a
      // tunnel. Name those hosts in ASTRO_ALLOWED_HOSTS (comma-separated) rather
      // than disabling the check with `true`, which accepts any Host at all.
      allowedHosts: allowedHosts(),
      // Host FSEvents don't reach the container's inotify across the podman
      // VM boundary, so Vite's watcher never fires and HMR dies silently.
      // compose.yaml sets CONTAINER_POLLING=1 to switch the watcher over to
      // polling. Left off on the host and in CI, where native file events
      // work and polling would only burn CPU.
      ...(process.env['CONTAINER_POLLING'] === '1'
        ? { watch: { usePolling: true, interval: 1000 } }
        : {}),
      // Dev-only proxy for the Discourse forum feed on the homepage.
      // discourse.nodered.org doesn't emit Access-Control-Allow-Origin
      // for nodered.org yet, so the browser blocks a direct fetch. The
      // dev server forwards /_forum-proxy/* → https://discourse.nodered.org/*
      // so the client-side fetch is same-origin and bypasses the gate.
      // Production (GitHub Pages) has no server, so the script falls
      // back to fetching Discourse directly — see src/pages/index.astro
      // forum-feed loader for the import.meta.env.DEV switch.
      proxy: {
        '/_forum-proxy': {
          target: 'https://discourse.nodered.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/_forum-proxy/, ''),
        },
      },
    },
    preview: {
      // Same reasoning as the dev server above.
      allowedHosts: allowedHosts(),
    },
  },
  integrations: [
    UnoCSS(),
    starlight({
      title: 'Node-RED',
      // Almost no docs page sets a frontmatter `description`, and with no
      // site-level fallback Starlight emits neither `<meta name="description">`
      // nor `og:description` at all: both verified absent on
      // /docs/user-guide/concepts/ before this line. Starlight falls back to
      // this value on any page whose frontmatter has none. The wording is
      // copied verbatim from the marketing side's default (the `description`
      // default in src/layouts/BaseLayout.astro) so docs and marketing pages
      // describe the project identically in search results and social embeds.
      description: 'Low-code programming for event-driven applications',
      // Code blocks render on our dark `--nr-bg-dark` (#1E1E1E) surface
      // in both light and dark site themes (the dark codeblock card is
      // intentional brand chrome). Pin both Expressive Code themes to
      // dark Shiki themes so the syntax-highlighting palette gives
      // legible contrast on the dark background. Without this,
      // light-mode pages get Expressive Code's "github-light" theme
      // (#403F53 fg on #fff bg) layered into our dark pre, producing
      // ~1.5:1 contrast — text is barely visible.
      expressiveCode: {
        themes: ['github-dark', 'github-dark'],
        useStarlightDarkModeSwitch: false,
      },
      ...(disablePagefind ? { pagefind: false } : {}),
      logo: {
        src: './src/assets/node-red-icon.png',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/node-red' },
        { icon: 'discourse', label: 'Forum', href: 'https://discourse.nodered.org' },
      ],
      // "Edit page" footer link. Starlight appends the page's path relative to
      // the project root, so a docs page resolves to
      // <baseUrl>src/content/docs/<...>. `main` is the upstream default
      // branch: `git ls-remote --symref origin HEAD` reports refs/heads/main,
      // and so does the GitHub API. (The local origin/HEAD ref still points at
      // the retired `master`; do not trust it.) The docs tree only exists on
      // `main` once this Astro migration merges, which is also the point at
      // which this config is served, so the link is correct for the state it
      // ships in. It does resolve to a 404 for anyone previewing the
      // unmerged branch.
      editLink: {
        baseUrl: 'https://github.com/node-red/node-red.github.io/edit/main/',
      },
      // `lastUpdated` is deliberately NOT enabled. Starlight reads the date
      // from `git log --format=%ct` per content file, and the entire docs tree
      // arrived in one Jekyll-to-Astro migration commit, so every file's most
      // recent committer timestamp is that same migration day. Switching it on
      // would stamp one identical, misleading "Last updated" date across the
      // whole reference section, which is worse than showing no date at all.
      // Enable it once the docs have accumulated genuine per-page history, or
      // set the `lastUpdated` frontmatter field on individual pages.
      // design-tokens.css must come BEFORE starlight-custom.css so the
      // marketing brand tokens (--nr-*, --grid-max-width, --grid-padding,
      // typography vars used by SiteHeader) are defined when Starlight's
      // overrides reference them. Without it, SiteHeader inside docs gets
      // `max-width: var(--grid-max-width)` resolving to `none`, padding
      // 0, and the docs navbar drifts away from the marketing layout.
      // There is no third entry re-pointing --sl-font / --sl-font-mono at the
      // generated font variables any more: those two declarations now sit on
      // the :root block at the top of starlight-custom.css, which is the only
      // place either token is declared. They arrived as a separate file
      // registered after it, winning on array order alone, while that file was
      // being modified concurrently; one token declared twice in two files
      // depending on this array's order surviving the CSS bundle is not
      // something to keep.
      customCss: ['./src/styles/design-tokens.css', './src/styles/starlight-custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [{ autogenerate: { directory: 'docs/getting-started' } }],
        },
        {
          label: 'User Guide',
          items: [{ autogenerate: { directory: 'docs/user-guide' } }],
        },
        {
          label: 'Creating Nodes',
          items: [{ autogenerate: { directory: 'docs/creating-nodes' } }],
        },
        {
          // Manual sidebar for /docs/api/* — the on-disk layout mirrors the
          // HTTP route structure (admin/methods/get/nodes/module/set/…)
          // which makes autogenerate produce 6+ levels of nested groups
          // around a single leaf. URLs stay identical; only the sidebar
          // shape changes — endpoint titles come from each page's
          // `title:` frontmatter (e.g. "GET /nodes/:module/:set").
          label: 'API Reference',
          items: [
            { slug: 'docs/api' },
            {
              label: 'Admin API',
              collapsed: true,
              items: [
                { slug: 'docs/api/admin' },
                { slug: 'docs/api/admin/errors' },
                { slug: 'docs/api/admin/oauth' },
                { slug: 'docs/api/admin/types' },
                {
                  label: 'GET',
                  collapsed: true,
                  items: [
                    { slug: 'docs/api/admin/methods/get/settings' },
                    { slug: 'docs/api/admin/methods/get/diagnostics' },
                    { slug: 'docs/api/admin/methods/get/flow' },
                    { slug: 'docs/api/admin/methods/get/flows' },
                    { slug: 'docs/api/admin/methods/get/flows/state' },
                    { slug: 'docs/api/admin/methods/get/nodes' },
                    { slug: 'docs/api/admin/methods/get/nodes/module' },
                    { slug: 'docs/api/admin/methods/get/nodes/module/set' },
                    { slug: 'docs/api/admin/methods/get/auth/login' },
                    { slug: 'docs/api/admin/methods/get/credentials/type/id' },
                  ],
                },
                {
                  label: 'POST',
                  collapsed: true,
                  items: [
                    { slug: 'docs/api/admin/methods/post/flow' },
                    { slug: 'docs/api/admin/methods/post/flows' },
                    { slug: 'docs/api/admin/methods/post/flows/state' },
                    { slug: 'docs/api/admin/methods/post/nodes' },
                    { slug: 'docs/api/admin/methods/post/auth/token' },
                    { slug: 'docs/api/admin/methods/post/auth/revoke' },
                  ],
                },
                {
                  label: 'PUT',
                  collapsed: true,
                  items: [
                    { slug: 'docs/api/admin/methods/put/flow' },
                    { slug: 'docs/api/admin/methods/put/nodes/module' },
                    { slug: 'docs/api/admin/methods/put/nodes/module/set' },
                  ],
                },
                {
                  label: 'DELETE',
                  collapsed: true,
                  items: [
                    { slug: 'docs/api/admin/methods/delete/flow' },
                    { slug: 'docs/api/admin/methods/delete/nodes/module' },
                  ],
                },
              ],
            },
            {
              label: 'Context API',
              collapsed: true,
              items: [
                { slug: 'docs/api/context' },
                { slug: 'docs/api/context/methods' },
                { slug: 'docs/api/context/store/localfilesystem' },
                { slug: 'docs/api/context/store/memory' },
              ],
            },
            {
              label: 'Editor UI API',
              collapsed: true,
              items: [
                { slug: 'docs/api/ui' },
                { slug: 'docs/api/ui/actions' },
                { slug: 'docs/api/ui/autoComplete' },
                { slug: 'docs/api/ui/editableList' },
                { slug: 'docs/api/ui/events' },
                { slug: 'docs/api/ui/notifications' },
                { slug: 'docs/api/ui/searchBox' },
                { slug: 'docs/api/ui/sidebar' },
                { slug: 'docs/api/ui/themes' },
                { slug: 'docs/api/ui/treeList' },
                { slug: 'docs/api/ui/typedInput' },
              ],
            },
            {
              label: 'Hooks API',
              collapsed: true,
              items: [
                { slug: 'docs/api/hooks' },
                { slug: 'docs/api/hooks/install' },
                { slug: 'docs/api/hooks/messaging' },
              ],
            },
            { slug: 'docs/api/library' },
            { slug: 'docs/api/modules' },
            {
              label: 'Storage API',
              collapsed: true,
              items: [{ slug: 'docs/api/storage' }, { slug: 'docs/api/storage/methods' }],
            },
          ],
        },
        {
          label: 'Developing Flows',
          items: [{ autogenerate: { directory: 'docs/developing-flows' } }],
        },
        {
          label: 'Developing',
          items: [{ autogenerate: { directory: 'docs/developing' } }],
        },
        {
          label: 'Tutorials',
          items: [{ autogenerate: { directory: 'docs/tutorials' } }],
        },
        { label: 'FAQ', slug: 'docs/faq' },
        { label: 'Telemetry', slug: 'docs/telemetry' },
      ],
      components: {
        // Override components for Node-RED branding
        Header: './src/components/starlight/Header.astro',
        Footer: './src/components/starlight/Footer.astro',
        PageFrame: './src/components/starlight/PageFrame.astro',
        // Not branding: this one exists purely so the docs pages can render the
        // <Font /> component, which the `head` array below cannot. Starlight's
        // own guidance is to override Head as a last resort and to reach for the
        // `head` config first, and that is what the rest of the head does. Fonts
        // are the one thing that has no other route in. The override renders
        // Starlight's default Head and appends to it, so nothing is lost.
        Head: './src/components/starlight/Head.astro',
      },
      head: [
        {
          // Must be inline rather than in customCss, or docs pages lose the
          // incoming half of every cross-document transition once there is
          // network latency. See src/styles/view-transition-head.js.
          tag: 'style',
          content: VIEW_TRANSITION_HEAD,
        },
        {
          // Render-blocking anchor, the docs counterpart of BaseLayout's vtAnchor:
          // holds first render until the sidebar exists, so the arriving document is
          // not snapshotted mid-parse with nr-rail-docs missing from the capture.
          // starlight__sidebar is Starlight's own id, already on the sidebar pane.
          tag: 'link',
          attrs: {
            rel: 'expect',
            href: '#starlight__sidebar',
            blocking: 'render',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            href: `${BASE}favicon.ico`,
          },
        },
        // Starlight already emits `twitter:card: summary_large_image` on every
        // docs page but no image to go with it, so a shared docs link previewed
        // as a blank card. These two tags supply the image the marketing pages
        // already use as their default, resolved from the same asset and the
        // same `site` origin (see DOCS_OG_IMAGE above).
        //
        // Note the mismatch this inherits: the card type is
        // `summary_large_image` (a wide 2:1 slot) while node-red-icon.png is a
        // square icon, so it will be padded rather than filling the card.
        // Changing the card type is out of scope. When a purpose-made wide
        // social card image exists, these two entries are the single place to
        // point at it for the whole docs section.
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: DOCS_OG_IMAGE,
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image',
            content: DOCS_OG_IMAGE,
          },
        },
        // Fonts are NOT declared here, and cannot be. Entries in this array are
        // static tag objects written straight into the document, so the array
        // can hold neither a component nor a local asset import, and <Font />
        // is both. The two preconnects and the Google stylesheet link that used
        // to close this array are gone with the CDN; see the `fonts` block near
        // the top of this file, and the Head override registered above, which
        // is where the docs side gets its @font-face CSS and preload now.
      ],
    }),
    // The `filter` is NOT for the redirect stubs. @astrojs/sitemap already drops
    // those: it collects URLs from `astro:routes:resolved` and skips anything
    // whose `route.type` is not `page`, and a redirect route's type is
    // `redirect`. Confirmed against a real build, where every stub HTML file is
    // present under dist/ with its `http-equiv="refresh"` and none of their URLs
    // appear in dist/sitemap-0.xml. So do not add redirect sources here.
    //
    // It exists for internal routes: real pages that are reachable but are not
    // content, have no navigation pointing at them, and would make a poor search
    // result for the project. Each of them also sets `noindex` through
    // BaseLayout, and both halves are needed, since a crawler that never fetches
    // the page cannot read the meta tag. Keep this list and those props in step.
    sitemap({
      filter: (page) => {
        // Sitemap entries are absolute URLs and therefore carry the base;
        // INTERNAL_ROUTES is written base-less. Strip it before comparing, or
        // a based build silently stops filtering.
        const path = new URL(page).pathname.replace(/\/$/, '');
        const route =
          BASE !== '/' && path.startsWith(BASE.slice(0, -1))
            ? path.slice(BASE.length - 1) || '/'
            : path;
        return !INTERNAL_ROUTES.has(route);
      },
    }),
  ],
  // THE ONLY REDIRECT MECHANISM THIS SITE HAS. Read this before adding a
  // redirect file of any kind.
  //
  // The site is hosted on GitHub Pages (public/CNAME -> nodered.org), which
  // serves static files and honours no redirect configuration at all: no
  // _redirects, no _headers, no rewrite rules, nothing that can make it emit a
  // 301 for a path we choose. So legacy URLs can only be handled from inside
  // the build, which is what this block does. `astro build` turns each entry
  // into a small HTML stub at dist/<source>/index.html carrying
  // `<meta http-equiv="refresh" content="0;url=<target>">`, plus
  // `<meta name="robots" content="noindex">` and a `<link rel="canonical">` on
  // the target. Checked against a real build, not assumed.
  //
  // The tradeoff, accepted deliberately: a meta refresh is not a 301. Readers
  // land on the right page, but search engines treat it as a soft redirect, so
  // these legacy paths pass on less link equity than a permanent redirect
  // would. Most of them are linked from years of forum threads and third-party
  // posts, so that loss is real rather than theoretical. It is the price of
  // hosting on Pages and it has been weighed and accepted; the only way to buy
  // real 301s back would be moving the site to a host with a redirect engine,
  // which is not the plan.
  //
  // A Netlify-syntax `public/_redirects` mirror of this list used to sit
  // alongside it, on the theory that another host could be swapped in. It has
  // been retired. On Pages it was copied verbatim into dist/ and served as an
  // inert text file: it redirected nothing while looking authoritative, and it
  // drifted from this block more than once. Do not re-add it, or any other
  // host's redirect manifest, for as long as the site is on Pages. This block
  // is the single source of truth, and scripts/verify-urls.ts fails the build
  // if any entry here is missing its stub in dist/ or points somewhere else.
  //
  // Trailing slashes: every source below ends in one, and each path appears
  // exactly once. `build.format` is at its 'directory' default, so an entry
  // builds to `<source>/index.html` whichever form is written here, and Pages
  // then serves that file for the slash form and redirects the bare form to it.
  // Declaring both forms of one path is what made Astro's router warn that
  // "The route /slack is defined in both /slack and /slack/", which it says
  // will become a hard error in a later version. One form per path, the slash
  // form, matching the file the build actually writes.
  //
  // `trailingSlash` is left at its 'ignore' default on purpose. Astro's own
  // documentation notes that trailing slashes on prerendered pages are handled
  // by the hosting platform and may not respect the setting, so pinning it to
  // 'always' would change nothing in production on Pages. It would only
  // tighten dev-server and preview route matching, where the e2e parity suite
  // and old inbound links both still ask for several of these paths without a
  // trailing slash.
  redirects: {
    // The former "Release Plan" page now lives at /about/roadmap/; the
    // version-list / download page took over the /releases name.
    '/about/releases/': '/about/roadmap/',
    // Top-level legacy aliases (Jekyll redirect_from)
    '/slack/': '/about/community/slack/',
    '/community/': '/about/community/',
    '/conduct/': '/about/conduct/',
    '/2019survey/': '/about/community/survey/2019/',
    '/2023survey/': '/about/community/survey/2023/',
    // Legacy docs/hardware/* (now /docs/getting-started/*)
    '/docs/hardware/raspberrypi/': '/docs/getting-started/raspberrypi/',
    '/docs/hardware/beagleboneblack/': '/docs/getting-started/beaglebone/',
    '/docs/hardware/arduino/': '/docs/faq/interacting-with-arduino/',
    // Legacy docs/platforms/* (now /docs/getting-started/*)
    '/docs/platforms/docker/': '/docs/getting-started/docker/',
    '/docs/platforms/docker-custom/': '/docs/getting-started/docker-custom/',
    '/docs/platforms/android/': '/docs/getting-started/android/',
    '/docs/platforms/aws/': '/docs/getting-started/aws/',
    '/docs/platforms/azure/': '/docs/getting-started/azure/',
    '/docs/platforms/bluemix/': '/docs/getting-started/ibmcloud/',
    '/docs/platforms/flowforge/': '/docs/getting-started/flowfuse/',
    '/docs/platforms/windows/': '/docs/getting-started/windows/',
    '/docs/getting-started/flowforge/': '/docs/getting-started/flowfuse/',
    // Legacy docs flat URLs (now nested under user-guide/runtime)
    '/docs/configuration/': '/docs/user-guide/runtime/configuration/',
    '/docs/embedding/': '/docs/user-guide/runtime/embedding/',
    '/docs/security/': '/docs/user-guide/runtime/securing-node-red/',
    '/docs/writing-functions/': '/docs/user-guide/writing-functions/',
    '/docs/node-red-admin/': '/docs/user-guide/node-red-admin/',
    '/docs/user-guide/configuration/': '/docs/user-guide/runtime/configuration/',
    '/docs/user-guide/embedding/': '/docs/user-guide/runtime/embedding/',
    '/docs/user-guide/logging/': '/docs/user-guide/runtime/logging/',
    // Tutorials moved from getting-started/
    '/docs/getting-started/first-flow/': '/docs/tutorials/first-flow/',
    '/docs/getting-started/second-flow/': '/docs/tutorials/second-flow/',
    '/docs/getting-started/adding-nodes/': '/docs/user-guide/runtime/adding-nodes/',
    // Three install pages collapsed into one
    '/docs/getting-started/installation/': '/docs/getting-started/local/',
    '/docs/getting-started/running/': '/docs/getting-started/local/',
    '/docs/getting-started/upgrading/': '/docs/getting-started/local/',
    // /docs/api/ui/* camelCase URLs are preserved natively by Starlight
    // (e.g. /docs/api/ui/autoComplete/). No redirect needed: keeping a
    // lowercase->camelCase entry would shadow the real page with a stub.
    // Note: /feed.xml is now served directly as RSS XML by
    // src/pages/feed.xml.ts (same data as /blog/rss/) so RSS readers
    // don't have to follow a meta-refresh redirect.
  },
});
