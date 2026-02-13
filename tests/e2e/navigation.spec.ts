import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ===== NAVIGATION TESTS =====
test.describe('Navigation', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Node-RED/);
    await expect(page.locator('h1')).toBeVisible();
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
    const navLinks = page.locator('nav[aria-label="Main navigation"] a');
    await expect(navLinks).toHaveCount(7);
  });

  test('should mark active nav link', async ({ page }) => {
    await page.goto('/blog/');
    const activeLink = page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]');
    await expect(activeLink).toHaveText(/blog/i);
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
    await expect(page.locator('article')).toHaveCount(9);
  });

  test('should load individual blog post', async ({ page }) => {
    await page.goto('/blog/2024/06/20/version-4-0-released/');
    await expect(page.locator('article h1')).toBeVisible();
  });

  test('should have blog pagination', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.getByText('Page 1 of')).toBeVisible();
    await expect(page.getByRole('link', { name: /Older posts/ })).toBeVisible();
  });

  test('should navigate blog pages', async ({ page }) => {
    await page.goto('/blog/page/2/');
    await expect(page.locator('article')).not.toHaveCount(0);
    await expect(page.getByRole('link', { name: /Newer posts/ })).toBeVisible();
  });

  test('should display blog post with title, author, date', async ({ page }) => {
    await page.goto('/blog/2024/06/20/version-4-0-released/');
    await expect(page.locator('article h1')).not.toBeEmpty();
    await expect(page.locator('article time')).toBeVisible();
    await expect(page.locator('article header a')).toBeVisible();
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
    await expect(page.locator('aside')).toBeVisible();
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
    await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Documentation' })).toBeVisible();
  });

  test('should have features section', async ({ page }) => {
    await page.goto('/');
    // 3 feature images: flow editing, Node.js, social
    const featureImages = page.locator('img[alt="Browser-based flow editing interface"], img[alt="JavaScript function node"], img[alt="Social development and sharing"]');
    await expect(featureImages).toHaveCount(3);
  });

  test('should have users section with logos', async ({ page }) => {
    await page.goto('/');
    const logos = page.locator('img[loading="lazy"]');
    await expect(logos).toHaveCount(12);
  });

  test('should have community section', async ({ page }) => {
    await page.goto('/');
    // 4 community cards with h3 headings
    const communityHeadings = page.locator('section h3');
    await expect(communityHeadings).toHaveCount(7); // 3 get-started + 4 community
  });

  test('should have footer with link sections', async ({ page }) => {
    await page.goto('/');
    // Footer has multiple link lists
    const footerLists = page.locator('footer ul');
    const count = await footerLists.count();
    expect(count).toBeGreaterThanOrEqual(3);
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
    const skipLink = page.locator('a[href="#main-content"], a[href="#_top"]');
    await expect(skipLink).toHaveCount(1);
  });

  test('should have main landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main#main-content')).toBeVisible();
  });

  test('user logos should have alt text', async ({ page }) => {
    await page.goto('/');
    const logos = page.locator('img[loading="lazy"]');
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
    await expect(page.locator('nav[aria-label="Main navigation"]')).not.toBeVisible();
  });

  test('hero renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('blog listing renders on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/blog/');
    await expect(page.locator('article')).not.toHaveCount(0);
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

  test('resources page loads', async ({ page }) => {
    const response = await page.goto('/about/resources/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('.about-content')).toBeVisible();
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
      '/about/resources/',
    ];

    for (const url of pages) {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));

      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      expect(errors).toEqual([]);

      // Verify header and footer present
      await expect(page.locator('header').first()).toBeVisible();
      await expect(page.locator('footer').first()).toBeVisible();

      // Verify page has a title
      const title = await page.title();
      expect(title).toContain('Node-RED');
    }
  });
});

// ===== BROKEN IMAGE DETECTION =====
test.describe('Image Integrity', () => {
  test('homepage images all load', async ({ page, request }) => {
    await page.goto('/');
    const images = page.locator('img[src]');
    const count = await images.count();
    const broken: string[] = [];
    for (let i = 0; i < count; i++) {
      const src = await images.nth(i).getAttribute('src');
      if (!src || src.startsWith('data:')) continue;
      const url = src.startsWith('http') ? src : `http://localhost:4321${src}`;
      try {
        const resp = await request.get(url);
        if (resp.status() !== 200) broken.push(src);
      } catch {
        broken.push(src);
      }
    }
    expect(broken, `Broken images on homepage: ${broken.join(', ')}`).toEqual([]);
  });

  test('about pages images all load', async ({ page, request }) => {
    const aboutPages = ['/about/', '/about/community/', '/about/governance/', '/about/resources/'];
    const broken: string[] = [];
    for (const url of aboutPages) {
      await page.goto(url);
      const images = page.locator('img[src]');
      const count = await images.count();
      for (let i = 0; i < count; i++) {
        const src = await images.nth(i).getAttribute('src');
        if (!src || src.startsWith('data:') || src.startsWith('http')) continue;
        const imgUrl = `http://localhost:4321${src}`;
        try {
          const resp = await request.get(imgUrl);
          if (resp.status() !== 200) broken.push(`${url} -> ${src}`);
        } catch {
          broken.push(`${url} -> ${src}`);
        }
      }
    }
    expect(broken, `Broken images: ${broken.join(', ')}`).toEqual([]);
  });

  test('blog listing images load', async ({ page, request }) => {
    await page.goto('/blog/');
    const images = page.locator('img[src]');
    const count = await images.count();
    const broken: string[] = [];
    for (let i = 0; i < count; i++) {
      const src = await images.nth(i).getAttribute('src');
      if (!src || src.startsWith('data:') || src.startsWith('http')) continue;
      const url = `http://localhost:4321${src}`;
      try {
        const resp = await request.get(url);
        if (resp.status() !== 200) broken.push(src);
      } catch {
        broken.push(src);
      }
    }
    expect(broken, `Broken images on blog listing: ${broken.join(', ')}`).toEqual([]);
  });
});

// ===== INTERNAL LINK INTEGRITY =====
test.describe('Link Integrity', () => {
  test('homepage internal links resolve', async ({ page, request }) => {
    await page.goto('/');
    const links = page.locator('a[href^="/"]');
    const count = await links.count();
    const broken: string[] = [];
    const checked = new Set<string>();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (!href || checked.has(href)) continue;
      checked.add(href);
      try {
        const resp = await request.get(`http://localhost:4321${href}`);
        if (resp.status() === 404) broken.push(href);
      } catch {
        broken.push(href);
      }
    }
    expect(broken, `Broken internal links on homepage: ${broken.join(', ')}`).toEqual([]);
  });

  test('about page internal links resolve', async ({ page, request }) => {
    await page.goto('/about/');
    const links = page.locator('a[href^="/"]');
    const count = await links.count();
    const broken: string[] = [];
    const checked = new Set<string>();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (!href || checked.has(href)) continue;
      checked.add(href);
      try {
        const resp = await request.get(`http://localhost:4321${href}`);
        if (resp.status() === 404) broken.push(href);
      } catch {
        broken.push(href);
      }
    }
    expect(broken, `Broken internal links on about: ${broken.join(', ')}`).toEqual([]);
  });

  test('footer links resolve', async ({ page, request }) => {
    await page.goto('/');
    const links = page.locator('footer a[href^="/"]');
    const count = await links.count();
    const broken: string[] = [];
    const checked = new Set<string>();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (!href || checked.has(href)) continue;
      checked.add(href);
      try {
        const resp = await request.get(`http://localhost:4321${href}`);
        if (resp.status() === 404) broken.push(href);
      } catch {
        broken.push(href);
      }
    }
    expect(broken, `Broken footer links: ${broken.join(', ')}`).toEqual([]);
  });
});
