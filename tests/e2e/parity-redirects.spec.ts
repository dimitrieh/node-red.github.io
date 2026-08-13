import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Validates every legacy URL redirect declared in astro.config.mjs.
 * Each entry: { from: legacy path, to: expected final URL (after one hop) }.
 *
 * Generated from grep redirect_from across master *.md files plus the
 * UI camelCase preservation set. Keep in sync with the `redirects:` block in
 * astro.config.mjs, which is the single source of truth now that the
 * Netlify-syntax public/_redirects mirror has been retired (it was inert on
 * GitHub Pages; see the comment above that block).
 */

interface RedirectCase {
  from: string;
  to: string;
}

const REDIRECTS: RedirectCase[] = [
  // Top-level legacy aliases
  { from: '/slack/', to: '/about/community/slack/' },
  { from: '/community/', to: '/about/community/' },
  { from: '/conduct/', to: '/about/conduct/' },
  { from: '/2019survey', to: '/about/community/survey/2019/' },
  { from: '/2023survey', to: '/about/community/survey/2023/' },
  // docs/hardware/*
  { from: '/docs/hardware/raspberrypi', to: '/docs/getting-started/raspberrypi/' },
  { from: '/docs/hardware/beagleboneblack', to: '/docs/getting-started/beaglebone/' },
  { from: '/docs/hardware/arduino', to: '/docs/faq/interacting-with-arduino/' },
  // docs/platforms/*
  { from: '/docs/platforms/docker', to: '/docs/getting-started/docker/' },
  { from: '/docs/platforms/docker-custom', to: '/docs/getting-started/docker-custom/' },
  { from: '/docs/platforms/android', to: '/docs/getting-started/android/' },
  { from: '/docs/platforms/aws', to: '/docs/getting-started/aws/' },
  { from: '/docs/platforms/azure', to: '/docs/getting-started/azure/' },
  { from: '/docs/platforms/bluemix', to: '/docs/getting-started/ibmcloud/' },
  { from: '/docs/platforms/flowforge', to: '/docs/getting-started/flowfuse/' },
  { from: '/docs/platforms/windows', to: '/docs/getting-started/windows/' },
  { from: '/docs/getting-started/flowforge', to: '/docs/getting-started/flowfuse/' },
  // Flat docs paths nested under user-guide/runtime
  { from: '/docs/configuration', to: '/docs/user-guide/runtime/configuration/' },
  { from: '/docs/embedding', to: '/docs/user-guide/runtime/embedding/' },
  { from: '/docs/security', to: '/docs/user-guide/runtime/securing-node-red/' },
  { from: '/docs/writing-functions', to: '/docs/user-guide/writing-functions/' },
  { from: '/docs/node-red-admin', to: '/docs/user-guide/node-red-admin/' },
  { from: '/docs/user-guide/configuration', to: '/docs/user-guide/runtime/configuration/' },
  { from: '/docs/user-guide/embedding', to: '/docs/user-guide/runtime/embedding/' },
  { from: '/docs/user-guide/logging', to: '/docs/user-guide/runtime/logging/' },
  // Tutorials moved out of getting-started/
  { from: '/docs/getting-started/first-flow', to: '/docs/tutorials/first-flow/' },
  { from: '/docs/getting-started/second-flow', to: '/docs/tutorials/second-flow/' },
  { from: '/docs/getting-started/adding-nodes', to: '/docs/user-guide/runtime/adding-nodes/' },
  // Install pages collapsed
  { from: '/docs/getting-started/installation', to: '/docs/getting-started/local/' },
  { from: '/docs/getting-started/running', to: '/docs/getting-started/local/' },
  { from: '/docs/getting-started/upgrading', to: '/docs/getting-started/local/' },
  // Note: /feed.xml is now served directly as RSS XML by src/pages/feed.xml.ts
  // (not a redirect), so RSS readers don't need to follow meta-refresh.
  // Coverage for that endpoint lives in navigation.spec.ts.
];

test.describe('parity: legacy redirects resolve to a 200 page', () => {
  for (const { from, to } of REDIRECTS) {
    test(`${from} -> ${to}`, async () => {
      const ctx = await pwRequest.newContext({ baseURL: 'http://localhost:4321' });
      // First hop: follow redirects manually so we can assert intent
      const initial = await ctx.get(from, { maxRedirects: 0 });
      // Astro static builds use meta-refresh; the initial response may be 200 with
      // a meta refresh, OR (when astro emits a real 301 in some adapters) a 3xx.
      // Accept either, but the final landing page MUST be 200 and match `to`.
      const final = await ctx.get(from);
      expect(final.status(), `final status for ${from}`).toBeLessThan(400);
      const url = new URL(final.url());
      const path = url.pathname.replace(/\/+$/, '/');
      const expected = to.replace(/\/+$/, '/');
      // Allow exact match OR meta-refresh that's still on the source URL (Astro static)
      // — when the test runs against `astro preview`, redirects are served as meta-refresh
      //   HTML. Validate by inspecting body for the canonical target.
      if (path !== expected) {
        const body = await final.text();
        expect(body, `${from} should redirect/canonical to ${to}`).toContain(to);
      }
      // Initial response: should not be 404 (the redirect stub itself must exist)
      expect(initial.status(), `redirect stub for ${from} exists`).toBeLessThan(400);
      await ctx.dispose();
    });
  }
});

test.describe('parity: /docs/api/ui/* camelCase URLs serve real content (not stubs)', () => {
  const CAMEL_URLS = [
    '/docs/api/ui/autoComplete/',
    '/docs/api/ui/editableList/',
    '/docs/api/ui/searchBox/',
    '/docs/api/ui/treeList/',
    '/docs/api/ui/typedInput/',
  ];
  for (const url of CAMEL_URLS) {
    test(`${url} returns real page content`, async () => {
      const ctx = await pwRequest.newContext({ baseURL: 'http://localhost:4321' });
      const res = await ctx.get(url);
      expect(res.status()).toBe(200);
      const body = await res.text();
      // Must NOT be a redirect stub, must have real page bytes.
      expect(body, `${url} must not be a meta-refresh stub`).not.toMatch(
        /<meta[^>]+http-equiv="refresh"/i,
      );
      expect(body.length, `${url} body too small to be a real page`).toBeGreaterThan(10000);
      await ctx.dispose();
    });
  }
});

test.describe('parity: legacy redirects all declared in astro.config.mjs', () => {
  test('astro.config.mjs declares every alias this spec covers', async () => {
    // Lightweight drift guard between this list and the config. It used to point
    // at public/_redirects, which was a hand-maintained mirror of the config and
    // did nothing on GitHub Pages; that file is gone, so the guard now reads the
    // source of truth directly. The reverse direction (every config entry got a
    // built stub pointing at the right target) is checked by
    // scripts/verify-urls.ts, which runs against dist/ in CI.
    const { readFileSync } = await import('node:fs');
    const config = readFileSync('astro.config.mjs', 'utf-8');
    for (const { from } of REDIRECTS) {
      // Sources are declared in their trailing-slash form, matching the
      // <source>/index.html the build writes, so compare on that form.
      const declared = from.endsWith('/') ? from : `${from}/`;
      expect(config, `astro.config.mjs must declare a redirect for ${declared}`).toContain(
        `'${declared}':`,
      );
    }
  });
});
