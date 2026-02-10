import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ===== NAVIGATION TESTS =====
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

  test('should have all header nav links', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('.desktop-nav .nr-nav-link');
    await expect(navLinks).toHaveCount(7);
  });

  test('should mark active nav link', async ({ page }) => {
    await page.goto('/blog/');
    const activeLink = page.locator('.desktop-nav .nr-nav-link.active');
    await expect(activeLink).toHaveText('blog');
  });

  test('should have working breadcrumbs', async ({ page }) => {
    await page.goto('/blog/');
    const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumbs).toBeVisible();
  });
});

// ===== BLOG TESTS =====
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

  test('should have blog pagination', async ({ page }) => {
    await page.goto('/blog/');
    const pagination = page.locator('.pagination');
    await expect(pagination).toBeVisible();
    await expect(page.locator('.pagination .next')).toBeVisible();
  });

  test('should navigate blog pages', async ({ page }) => {
    await page.goto('/blog/page/2/');
    await expect(page.locator('.posts-grid')).toBeVisible();
    await expect(page.locator('.pagination .prev')).toBeVisible();
  });

  test('should display blog post with title, author, date', async ({ page }) => {
    await page.goto('/blog/2024/06/20/version-4-0-released/');
    await expect(page.locator('.blog-post-header h1')).not.toBeEmpty();
    await expect(page.locator('.blog-post-meta time')).toBeVisible();
    await expect(page.locator('.blog-post-meta a')).toBeVisible();
    await expect(page.locator('.blog-post-content')).not.toBeEmpty();
  });
});

// ===== DOCUMENTATION TESTS =====
test.describe('Documentation', () => {
  test('should load docs landing page', async ({ page }) => {
    await page.goto('/docs/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should have working sidebar', async ({ page }) => {
    await page.goto('/docs/getting-started/');
    await expect(page.locator('.sidebar-content')).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/docs/');
    await expect(page.locator('site-search')).toBeVisible();
  });

  test('should load nested doc page', async ({ page }) => {
    await page.goto('/docs/user-guide/context/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.sl-markdown-content')).not.toBeEmpty();
  });
});

// ===== ABOUT TESTS =====
test.describe('About', () => {
  test('should load about page', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.locator('.about-content')).toBeVisible();
  });

  test('should have sidebar navigation', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.locator('.about-sidebar')).toBeVisible();
  });

  test('should load about sub-pages', async ({ page }) => {
    await page.goto('/about/governance/');
    await expect(page.locator('.about-content')).toBeVisible();
    await expect(page.locator('.about-content h1')).toBeVisible();
  });

  test('should not show "Content not found"', async ({ page }) => {
    await page.goto('/about/');
    const content = await page.locator('.about-content').textContent();
    expect(content).not.toContain('Content not found');
  });
});

// ===== HOMEPAGE SECTIONS =====
test.describe('Homepage', () => {
  test('should have hero with dual CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero .button.primary')).toBeVisible();
    await expect(page.locator('.hero .button.secondary')).toBeVisible();
  });

  test('should have features section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.feature')).toHaveCount(3);
  });

  test('should have users section with logos', async ({ page }) => {
    await page.goto('/');
    const logos = page.locator('.user-logo');
    await expect(logos).toHaveCount(12);
  });

  test('should have community section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.community-card')).toHaveCount(4);
  });

  test('should have footer with three columns', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nr-footer-section')).toHaveCount(3);
  });
});

// ===== ACCESSIBILITY TESTS =====
test.describe('Accessibility', () => {
  test('home page should pass axe checks', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Allow minor contrast issues from legacy content
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('blog listing should pass axe checks', async ({ page }) => {
    await page.goto('/blog/');
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('blog post should pass axe checks', async ({ page }) => {
    await page.goto('/blog/2024/06/20/version-4-0-released/');
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('about page should pass axe checks', async ({ page }) => {
    await page.goto('/about/');
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('docs page should pass axe checks', async ({ page }) => {
    await page.goto('/docs/');
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('should have skip link', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toHaveCount(1);
  });

  test('should have main landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main#main-content')).toBeVisible();
  });

  test('user logos should have alt text', async ({ page }) => {
    await page.goto('/');
    const logos = page.locator('.user-logo img');
    const count = await logos.count();
    for (let i = 0; i < count; i++) {
      const alt = await logos.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt).not.toBe('');
    }
  });
});

// ===== RESPONSIVE TESTS =====
test.describe('Responsive', () => {
  test('mobile menu toggle works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const toggle = page.locator('.nr-mobile-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    const mobileNav = page.locator('.mobile-nav');
    await expect(mobileNav).toHaveAttribute('aria-hidden', 'false');
  });

  test('desktop nav hidden on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('.desktop-nav')).not.toBeVisible();
  });

  test('hero renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('.hero h1')).toBeVisible();
  });

  test('blog listing renders on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/blog/');
    await expect(page.locator('.posts-grid')).toBeVisible();
  });
});

// ===== FULL PAGE WALKTHROUGH =====
test.describe('Page Integrity', () => {
  test('404 page renders', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz/');
    expect(response?.status()).toBe(404);
  });

  test('RSS feed exists', async ({ page }) => {
    const response = await page.goto('/feed.xml');
    expect(response?.status()).toBe(200);
    const content = await page.content();
    expect(content).toContain('Node-RED Blog');
  });

  test('all main pages load without errors', async ({ page }) => {
    const pages = [
      '/',
      '/blog/',
      '/about/',
      '/docs/',
      '/about/community/',
      '/about/governance/',
      '/about/license/',
      '/about/contribute/',
      '/about/conduct/',
      '/about/releases/',
    ];

    for (const url of pages) {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));

      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      expect(errors).toEqual([]);

      // Verify header and footer present
      await expect(page.locator('.nr-header, header.nr-header')).toBeVisible();
      await expect(page.locator('.nr-footer, footer.nr-footer')).toBeVisible();

      // Verify page has a title
      const title = await page.title();
      expect(title).toContain('Node-RED');
    }
  });
});
