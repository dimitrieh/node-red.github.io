/* Everything the browser must know BEFORE it snapshots a document for a
   cross-document view transition: the opt-in, and every `view-transition-name`.
   Rendered inline into the <head> of both page types, by BaseLayout directly and
   into Starlight pages through the `head` array in astro.config.mjs.

   Inline is not a style choice, it is the only thing that works. Two capture
   decisions are made very early in the arriving document's life, and a bundled
   stylesheet arrives too late for both of them:

   1. The opt-in. With `@view-transition` in the bundle, the outgoing page still
      snapshots (its `pageswap` carries a viewTransition) but the arriving page
      declines to join (`pagereveal` has none), so navigations cut. Measured on the
      built site with 120ms added per response: 0/4 navigations transitioned with the
      rule bundled, 4/4 with it inline.
   2. The names. With `view-transition-name` in the bundle, the arriving document's
      elements are not captured, so every pair collapses into an exit: the old band
      and rail play their leaving animation across a page that has both sitting
      still, which reads as the red bar sliding away for no reason. Measured on the
      same build: `::view-transition-new(nr-announce-band)` does not exist at 120ms
      latency, and does exist at 0ms. This is why it only shows on a deployment.

   The pseudo-element animations stay in design-tokens.css. Those are read after the
   new document's first render, by which point its render-blocking CSS has arrived,
   so the bundle is fine for them.

   Selectors are global here rather than scoped to their components, which is the one
   cost of this arrangement: keep them in step with the class names in SiteHeader,
   VersionBadge, ThemeToggle, BaseLayout and the Starlight PageFrame override. The
   two rails are named only above their breakpoints, since below them both collapse
   into a disclosure and there is no side panel to animate. Astro's `transition:name`
   directive is not used: it cannot express a conditional name, and its generated CSS
   is appended to `extraHead`, which renderHead() flushes when the <head> renders, so
   for components rendered further down the body (SiteHeader) it is silently dropped.
   Measured: `view-transition-name: none` on every header part on /about/ while the
   same component worked on docs pages, where Starlight renders the head later. */
export const VIEW_TRANSITION_HEAD = `
@view-transition{navigation:auto}
@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}

.site-header{view-transition-name:nr-header}
.header-nav{view-transition-name:nr-header-nav}
.header-search{view-transition-name:nr-header-search}
.header-logo-img{view-transition-name:nr-header-mark}
.header-logo-wordmark{view-transition-name:nr-header-wordmark}
.version-badge{view-transition-name:nr-header-version}
.theme-toggle{view-transition-name:nr-header-theme}
.nr-announce{view-transition-name:nr-announce-band}

@media (min-width:768px){.about-rail,.blog-rail{view-transition-name:nr-rail-section}}
@media (min-width:50rem){nav.sidebar{view-transition-name:nr-rail-docs}}
`;
