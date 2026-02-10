import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Node-RED/);
    await expect(page.locator('.hero h1')).toBeVisible();
  });

  test('should navigate to docs', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/docs/"]');
    await expect(page).toHaveURL(/\/docs\//);
  });

  test('should navigate to blog', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/blog/"]');
    await expect(page).toHaveURL(/\/blog\//);
  });

  test('should navigate to about', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/about/"]');
    await expect(page).toHaveURL(/\/about\//);
  });
});

test.describe('Blog', () => {
  test('should load blog listing', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('.posts-grid')).toBeVisible();
    await expect(page.locator('.post-card')).toHaveCount(9);
  });

  test('should load individual blog post', async ({ page }) => {
    await page.goto('/blog/2024/06/20/version-4-0-released/');
    await expect(page.locator('.blog-post-header h1')).toBeVisible();
  });
});

test.describe('Documentation', () => {
  test('should load docs landing page', async ({ page }) => {
    await page.goto('/docs/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should have working sidebar', async ({ page }) => {
    await page.goto('/docs/getting-started/');
    await expect(page.locator('nav.sidebar-content')).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/docs/');
    await expect(page.locator('site-search')).toBeVisible();
  });
});

test.describe('About', () => {
  test('should load about page', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.locator('.about-content')).toBeVisible();
  });

  test('should have sidebar navigation', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.locator('.about-sidebar')).toBeVisible();
  });
});
