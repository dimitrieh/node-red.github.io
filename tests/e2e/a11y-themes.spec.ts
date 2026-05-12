import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Both themes a11y check.
 *
 * The Starlight ThemeSelect flips data-theme on <html>. We've had a regression
 * where a stray :root token override forced light-mode pages into a dark
 * palette, dropping sidebar contrast to 2.22:1. This spec asserts WCAG AA
 * colour-contrast on each theme on the docs landing page (which has the
 * sidebar + header + ThemeSelect on screen at once) and on the homepage.
 */

const PAGES: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'docs', path: '/docs/' },
  { name: 'docs-getting-started', path: '/docs/getting-started/' },
  { name: 'about', path: '/about/' },
];

for (const p of PAGES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`a11y color-contrast [${theme}]: ${p.name}`, async ({ page }) => {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      // Pin the theme by setting data-theme AND localStorage (the inline
      // ThemeProvider script reads localStorage first, then re-applies on load).
      await page.evaluate((t) => {
        try {
          localStorage.setItem('starlight-theme', t);
        } catch {
          /* private mode */
        }
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      // Give CSS a tick to flush.
      await page.waitForTimeout(150);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa', 'wcag21aa', 'wcag22aa'])
        .options({ rules: { 'color-contrast': { enabled: true } } })
        .analyze();

      const cc = results.violations.find((v) => v.id === 'color-contrast');
      const failures = cc ? cc.nodes : [];

      // We report ALL violations attached to the docs chrome we own:
      //  - Starlight sidebar (.sidebar-content)
      //  - Starlight ThemeSelect / Search inside the dark header
      //  - Starlight breadcrumb bar
      //  - Our docs footer (Starlight FooterContent)
      const ownedFailures = failures.filter((n) => {
        const target = n.target.join(' ');
        return (
          target.includes('.sidebar-content') ||
          target.includes('starlight-theme-select') ||
          target.includes('site-search') ||
          target.includes('nav[aria-label="Breadcrumbs"]') ||
          target.includes('.right-sidebar-panel') ||
          // FooterContent (our footer copy/links)
          target.includes('astro-37fxchfa') // body-level chrome class on our footer
        );
      });

      if (ownedFailures.length > 0) {
        const detail = ownedFailures
          .slice(0, 6)
          .map(
            (n) =>
              `  - ${n.target.join(' ')}\n    ${n.failureSummary?.split('\n').slice(1).join(' | ') ?? ''}`
          )
          .join('\n');
        throw new Error(
          `[${theme}] ${p.path} has ${ownedFailures.length} contrast failures in a11y-owned chrome:\n${detail}`
        );
      }

      // Log non-owned failures as info so the report can pick them up.
      if (failures.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `[${theme}] ${p.path}: ${failures.length} contrast failures outside a11y scope (forwarded to ux/parity).`
        );
      }
    });
  }
}

test('skip link is keyboard-reachable and points at #main-content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const skipInfo = await page.evaluate(() => {
    const f = document.activeElement as HTMLElement | null;
    const rect = f?.getBoundingClientRect();
    return {
      tag: f?.tagName,
      href: f?.getAttribute('href'),
      text: f?.textContent?.trim().slice(0, 60),
      onScreen: rect ? rect.top >= 0 && rect.left >= 0 : false,
      // WCAG 2.2 SC 2.4.13 Focus Appearance — outline should be at least 2px.
      outlineWidth: f ? getComputedStyle(f).outlineWidth : '',
    };
  });
  expect(skipInfo.tag).toBe('A');
  expect(skipInfo.text).toMatch(/skip to (main )?content/i);
  expect(skipInfo.href).toMatch(/#(main-content|_top|main)/);
  expect(skipInfo.onScreen).toBe(true);
  // Outline width like "3px"
  expect(parseFloat(skipInfo.outlineWidth)).toBeGreaterThanOrEqual(2);
});

test('no horizontal scroll at 320px viewport on landing pages', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ['/', '/docs/', '/blog/', '/about/']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const dims = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    // Allow 1px rounding tolerance.
    expect(dims.sw, `${path} horizontal scroll (sw=${dims.sw} > cw=${dims.cw})`).toBeLessThanOrEqual(
      dims.cw + 1
    );
  }
});

test('every <nav> has an accessible name', async ({ page }) => {
  for (const path of ['/', '/docs/', '/blog/', '/about/']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const navInfo = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav')).map((n) => ({
        label: n.getAttribute('aria-label') || n.getAttribute('aria-labelledby') || '',
        // Hidden nav (mobile menu) is fine without a visible name as long as it has aria-label.
        hidden: n.getAttribute('aria-hidden') === 'true',
      }))
    );
    for (const nav of navInfo) {
      expect(nav.label, `Unlabelled nav on ${path}`).not.toBe('');
    }
  }
});

test('single <main> landmark per page', async ({ page }) => {
  for (const path of ['/', '/docs/', '/blog/', '/about/', '/docs/getting-started/']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const mains = await page.locator('main').count();
    expect(mains, `${path} has ${mains} <main> landmarks`).toBe(1);
  }
});

test('prefers-reduced-motion honours transition-duration override', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const probe = await page.evaluate(() => {
    // Pick a known transitioning element from our design system.
    const btn = document.querySelector('.nr-btn, a.nr-btn-primary');
    if (!btn) return { found: false };
    const cs = getComputedStyle(btn);
    return {
      found: true,
      transitionDuration: cs.transitionDuration,
    };
  });
  if (probe.found) {
    // Should be ~0.01ms because of our @media (prefers-reduced-motion: reduce) rule.
    expect(probe.transitionDuration).toMatch(/0\.0?1?m?s|0s/);
  }
  await context.close();
});

test('docs sidebar links pass 4.5:1 contrast in both themes', async ({ page }) => {
  await page.goto('/docs/getting-started/', { waitUntil: 'domcontentloaded' });
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((t) => {
      try {
        localStorage.setItem('starlight-theme', t);
      } catch {}
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await page.waitForTimeout(100);
    const probe = await page.evaluate(() => {
      const link = document.querySelector('.sidebar-content a:not([aria-current])');
      if (!link) return null;
      const cs = getComputedStyle(link);
      // Walk up to find first opaque ancestor background.
      let bg = 'rgba(0,0,0,0)';
      let el: HTMLElement | null = link as HTMLElement;
      while (el) {
        const c = getComputedStyle(el).backgroundColor;
        if (c && !c.startsWith('rgba(0, 0, 0, 0)')) {
          bg = c;
          break;
        }
        el = el.parentElement;
      }
      return { fg: cs.color, bg };
    });
    expect(probe).not.toBeNull();
    // Compute relative luminance contrast.
    const ratio = contrastRatio(probe!.fg, probe!.bg);
    expect(ratio, `${theme} sidebar contrast ${probe!.fg} on ${probe!.bg}`).toBeGreaterThanOrEqual(
      4.5
    );
  }
});

function parseColor(s: string): [number, number, number] {
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}
function luminance([r, g, b]: [number, number, number]): number {
  const norm = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}
function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(parseColor(fg));
  const l2 = luminance(parseColor(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
