import { test, expect } from '@playwright/test';

// Round-2 UX restoration: the homepage was missing three load-bearing
// Jekyll-era sections. These tests lock the restored content in place
// so future refactors don't silently regress them again.

test.describe('Homepage round-2 content restoration', () => {
  test('Trusted-by wall renders all 47 community logos', async ({ page }) => {
    await page.goto('/');
    const logos = page.locator('.trusted-logo');
    await expect(logos).toHaveCount(47);
  });

  test('Trusted-by section carries the permission disclaimer + invite link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.trusted-footnote')).toBeVisible();
    await expect(page.locator('.trusted-footnote a[href="/about/community/"]')).toBeVisible();
    await expect(page.locator('.trusted-disclaimer')).toContainText(
      /All logos used with permission/,
    );
  });

  test('Get Started section links to the full platforms index', async ({ page }) => {
    await page.goto('/');
    const more = page.locator('.getstarted-more');
    await expect(more).toBeVisible();
    await expect(more.locator('a[href="/docs/getting-started/"]')).toContainText(
      /see all platforms/i,
    );
  });

  test('"On the blog" feed surfaces the latest 5 posts', async ({ page }) => {
    await page.goto('/');
    const items = page.locator('.blog-feed-item');
    await expect(items).toHaveCount(5);
    // Each row must carry a date + a title.
    const firstItem = items.first();
    await expect(firstItem.locator('.blog-feed-date')).toBeVisible();
    await expect(firstItem.locator('.blog-feed-title')).toBeVisible();
  });

  test('"On the blog" header links to the blog index', async ({ page }) => {
    await page.goto('/');
    const all = page.locator('.blog-feed-more');
    await expect(all).toHaveAttribute('href', '/blog/');
  });

  test('Blog feed posts link to real blog post URLs', async ({ page }) => {
    await page.goto('/');
    const links = await page.locator('.blog-feed-link').all();
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = await link.getAttribute('href');
      // Pretty permalink shape: /blog/YYYY/MM/DD/slug/
      expect(href).toMatch(/^\/blog\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/);
    }
  });
});

test.describe('Homepage social-share metadata', () => {
  test('Per-page og:image and twitter:image fall back to node-red-icon.png on /', async ({
    page,
  }) => {
    await page.goto('/');
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    const tw = await page.locator('meta[name="twitter:image"]').getAttribute('content');
    expect(og).toMatch(/node-red-icon\.png$/);
    expect(tw).toMatch(/node-red-icon\.png$/);
  });

  test('og:url + canonical resolve to the page URL', async ({ page }) => {
    await page.goto('/');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(canonical).toBeTruthy();
    expect(ogUrl).toBe(canonical);
  });
});
