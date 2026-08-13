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

  /* This used to assert the breadcrumb bar, which the announcement band replaced
     in the same slot under the navbar. The band is the thing to hold onto now,
     and on every route rather than the three that had breadcrumbs: it is the one
     piece of chrome whose content comes from a single data file, so a template
     that forgets to render it fails silently and looks fine. */
  test('should show the announcement band under the navbar on every page type', async ({
    page,
  }) => {
    for (const path of ['/', '/blog/', '/about/', '/docs/']) {
      await page.goto(path);
      const band = page.locator('.nr-announce');
      await expect(band, `announcement band missing on ${path}`).toBeVisible();

      // Below the navbar, not above it: the order is what makes it scroll away.
      const navBox = await page.locator('.site-header').boundingBox();
      const bandBox = await band.boundingBox();
      // Thrown rather than expect()ed, because `expect(x).not.toBeNull()` does not
      // narrow `BoundingBox | null` for the type checker, and tsconfig includes
      // tests/ under Astro's strictest preset.
      if (!navBox || !bandBox) throw new Error(`navbar or band has no box on ${path}`);
      expect(bandBox.y, `band should sit below the navbar on ${path}`).toBeGreaterThanOrEqual(
        navBox.y + navBox.height - 1,
      );
    }
  });

  test('announcement band scrolls away while the navbar stays', async ({ page }) => {
    await page.goto('/docs/user-guide/writing-functions/');
    const band = page.locator('.nr-announce');
    await expect(band).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForFunction(() => window.scrollY > 500);

    const after = await band.boundingBox();
    const nav = await page.locator('.site-header').boundingBox();
    if (!after || !nav) throw new Error('band or navbar has no box after scrolling');
    // The band has left the viewport upwards, the navbar has not moved.
    expect(after.y).toBeLessThan(0);
    expect(nav.y).toBeLessThanOrEqual(1);
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
    await expect(page.locator('.post-content')).not.toBeEmpty();
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

// ===== ABOUT SECTION RAIL =====
// The rail is the only sibling navigation inside About between 768px and
// 1200px, where SiteHeader hides the nav and its about popout.
test.describe('About section rail', () => {
  const aboutPages = [
    '/about/',
    '/about/community/',
    '/about/community/slack/',
    '/about/community/survey/',
    '/about/contribute/',
    '/about/governance/',
    '/about/license/',
    '/about/roadmap/',
    '/about/conduct/',
    '/about/resources/',
  ];

  for (const path of aboutPages) {
    test(`should show the rail on ${path}`, async ({ page }) => {
      await page.goto(path);
      const rail = page.locator('.about-rail');
      await expect(rail).toBeVisible();
      // Every top-level About page reachable from every other one.
      await expect(rail.locator('.section-rail-link')).toHaveCount(10);
    });

    test(`should mark exactly one current page on ${path}`, async ({ page }) => {
      await page.goto(path);
      // Two elements claiming aria-current="page" is an a11y defect, and the
      // ancestor-highlight logic is where that regression would come from.
      await expect(page.locator('.about-rail [aria-current="page"]')).toHaveCount(1);
    });
  }

  test('should mark the current page, not its ancestor', async ({ page }) => {
    await page.goto('/about/community/slack/');

    const current = page.locator('.about-rail [aria-current="page"]');
    await expect(current).toHaveText('Slack');

    // Community is the open section, styled but not announced as current.
    const community = page.locator('.section-rail-link', { hasText: /^Community$/ });
    await expect(community).toHaveClass(/is-section/);
    await expect(community).not.toHaveAttribute('aria-current', 'page');
  });

  test('should not treat the section index as an ancestor of every page', async ({ page }) => {
    await page.goto('/about/governance/');
    const sectionIndex = page.locator('.section-rail-link', { hasText: /^About Node-RED$/ });
    await expect(sectionIndex).not.toHaveClass(/is-section/);
    await expect(sectionIndex).not.toHaveClass(/is-active/);
  });

  test('should navigate to a sibling page from the rail', async ({ page }) => {
    await page.goto('/about/governance/');
    await page.locator('.section-rail-link', { hasText: /^Code of Conduct$/ }).click();
    await expect(page).toHaveURL(/\/about\/conduct\//);
    await expect(page.locator('.about-rail [aria-current="page"]')).toHaveText('Code of Conduct');
  });

  test('should expose nested community pages', async ({ page }) => {
    await page.goto('/about/');
    const sublinks = page.locator('.section-rail-sublink');
    await expect(sublinks).toHaveCount(2);
    await expect(sublinks.nth(0)).toHaveText('Slack');
    await expect(sublinks.nth(1)).toHaveText('Surveys');
  });

  test('should stay visible in the band where the header nav is hidden', async ({ page }) => {
    // 1024px: below SiteHeader's 75rem nav cutoff, above the mobile collapse.
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/about/governance/');
    await expect(page.locator('.section-rail-link').first()).toBeVisible();
    await expect(page.locator('.section-rail-summary')).toBeHidden();
  });

  test('should collapse to a disclosure on mobile, showing the current page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/about/governance/');

    const summary = page.locator('.section-rail-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Governance');
    // Closed by the breakpoint script, so the list isn't pushing the prose down.
    await expect(page.locator('.section-rail-link').first()).toBeHidden();

    await summary.click();
    await expect(page.locator('.section-rail-link').first()).toBeVisible();
  });
});

// ===== BLOG POST RAIL AND PAGER =====
// The rail lists only the 10 most recent posts, so the pager below the article
// is what makes the older archive readable in sequence.
test.describe('Blog post navigation', () => {
  const NEWEST = '/blog/2025/12/03/node-red-roadmap-to-5/';
  const OLDEST = '/blog/2013/10/16/version-0-2-0-released/';
  const MIDDLE = '/blog/2025/07/29/version-4-1-released/';
  // Old enough to fall outside the recent-10 window the rail shows.
  const ARCHIVED = '/blog/2013/10/21/internet-of-things-messaging-hangout/';

  test('should show the recent-posts rail on a post', async ({ page }) => {
    await page.goto(MIDDLE);
    const rail = page.locator('.blog-rail');
    await expect(rail).toBeVisible();
    await expect(rail.locator('.section-rail-link')).toHaveCount(10);
    await expect(rail.locator('.section-rail-footer-link')).toHaveText('All posts');
  });

  test('should mark the current post in the rail when it is recent', async ({ page }) => {
    await page.goto(MIDDLE);
    await expect(page.locator('.blog-rail [aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('.blog-rail [aria-current="page"]')).toContainText(
      'Version 4.1 released',
    );
  });

  test('should mark nothing current for a post outside the recent window', async ({ page }) => {
    await page.goto(ARCHIVED);
    // Honest: the post genuinely has no rail entry, so nothing should claim to
    // be the current one. The pager carries the neighbours instead.
    await expect(page.locator('.blog-rail [aria-current="page"]')).toHaveCount(0);
    await expect(page.locator('.blog-rail .section-rail-link')).toHaveCount(10);
  });

  test('should omit the newer link on the newest post', async ({ page }) => {
    await page.goto(NEWEST);
    await expect(page.locator('.post-pager-link.is-newer')).toHaveCount(0);
    await expect(page.locator('.post-pager-link.is-older')).toHaveCount(1);
  });

  test('should omit the older link on the oldest post', async ({ page }) => {
    await page.goto(OLDEST);
    await expect(page.locator('.post-pager-link.is-newer')).toHaveCount(1);
    await expect(page.locator('.post-pager-link.is-older')).toHaveCount(0);
  });

  test('should offer both neighbours on a post mid-archive', async ({ page }) => {
    await page.goto(MIDDLE);
    await expect(page.locator('.post-pager-link.is-newer')).toHaveCount(1);
    await expect(page.locator('.post-pager-link.is-older')).toHaveCount(1);
  });

  test('should walk to the older post and back', async ({ page }) => {
    await page.goto(MIDDLE);

    const olderTitle = await page
      .locator('.post-pager-link.is-older .post-pager-title')
      .textContent();
    await page.locator('.post-pager-link.is-older').click();
    await expect(page.locator('.post-title')).toHaveText(olderTitle!.trim());

    // The newer link on the destination must point back where we came from.
    await expect(page.locator('.post-pager-link.is-newer .post-pager-title')).toHaveText(
      'Version 4.1 released',
    );
    await page.locator('.post-pager-link.is-newer').click();
    await expect(page).toHaveURL(new RegExp(MIDDLE));
  });

  test('should order the pager newest-left, oldest-right', async ({ page }) => {
    await page.goto(MIDDLE);
    const newerDate = await page
      .locator('.post-pager-link.is-newer .post-pager-date')
      .textContent();
    const olderDate = await page
      .locator('.post-pager-link.is-older .post-pager-date')
      .textContent();
    expect(new Date(newerDate!).getTime()).toBeGreaterThan(new Date(olderDate!).getTime());
  });

  test('should collapse the rail on mobile, naming the archive fallback', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(ARCHIVED);

    const summary = page.locator('.blog-rail .section-rail-summary');
    await expect(summary).toBeVisible();
    // No rail entry for this post, so the summary falls back rather than
    // naming an unrelated page.
    await expect(summary).toContainText('Archive');
    await expect(page.locator('.blog-rail .section-rail-link').first()).toBeHidden();
  });

  test('should keep the rail in the band where the header nav is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(MIDDLE);
    await expect(page.locator('.blog-rail .section-rail-link').first()).toBeVisible();
    await expect(page.locator('.blog-rail .section-rail-summary')).toBeHidden();
  });
});

// ===== DOCS CHROME PARITY =====
test.describe('Docs chrome parity', () => {
  test('should not underline the logo in docs, matching marketing', async ({ page }) => {
    // BaseLayout's global chrome list suppresses this, and docs pages render
    // through Starlight's layout instead, so the rule is restated in
    // starlight-custom.css. Without it the anchor takes the UA underline.
    await page.goto('/docs/');
    const docsLogo = page.locator('.site-header .header-logo');
    await expect(docsLogo).toHaveCSS('text-decoration-line', 'none');

    await page.goto('/');
    await expect(page.locator('.site-header .header-logo')).toHaveCSS(
      'text-decoration-line',
      'none',
    );
  });

  test('should style the docs sidebar like the marketing rails', async ({ page }) => {
    await page.goto('/docs/user-guide/');

    // Continuous 2px hairline on every item, as on SectionRail, rather than
    // Starlight's transparent border plus its own 1px hairline on the li.
    const idle = page.locator('.sidebar-content a:not([aria-current])').first();
    await expect(idle).toHaveCSS('border-left-width', '2px');
    await expect(idle).not.toHaveCSS('border-left-color', 'rgba(0, 0, 0, 0)');

    // Current page: same hairline, thickened to brand red. No background wash.
    const current = page.locator('.sidebar-content a[aria-current="page"]').first();
    await expect(current).toHaveCSS('border-left-color', 'rgb(218, 0, 0)');
    await expect(current).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    // Starlight's nesting border is suppressed so only one vertical line runs
    // down the pane.
    const nested = page.locator('.sidebar-content ul ul li').first();
    await expect(nested).toHaveCSS('border-left-style', 'none');
  });
});

// ===== HOMEPAGE SECTIONS =====
test.describe('Homepage', () => {
  test('should have hero with dual CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Documentation' }).first()).toBeVisible();
  });

  test('should have features section', async ({ page }) => {
    await page.goto('/');
    // 3 feature cards in features row
    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(3);
  });

  test('should have users section with logos', async ({ page }) => {
    await page.goto('/');
    // The "Trusted by" wall renders the full set of users.ts entries
    // (matches the old Jekyll site which rendered all of them shuffled
    // at page load). Previously this was sliced to the first 12 which
    // alphabetically excluded most of the community. Lock in the full
    // grid as the source-of-truth count.
    const logos = page.locator('.trusted-logo img');
    await expect(logos).toHaveCount(47);
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
      .exclude('iframe') // YouTube's player markup is outside our control
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('blog listing should pass axe checks', async ({ page }) => {
    await page.goto('/blog/');
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .exclude('iframe')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('blog post should pass axe checks', async ({ page }) => {
    await page.goto('/blog/2024/06/20/version-4-0-released/');
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .exclude('iframe')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('about page should pass axe checks', async ({ page }) => {
    await page.goto('/about/');
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .exclude('iframe')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('docs page should pass axe checks', async ({ page }) => {
    await page.goto('/docs/');
    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
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
    const toggle = page.locator('.mobile-toggle');
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
    const response = await page.goto('/blog/rss/');
    expect(response?.status()).toBe(200);
    const content = await page.content();
    expect(content).toContain('Node-RED Blog');
  });

  test('legacy /feed.xml serves RSS XML for existing subscribers', async ({ request }) => {
    const response = await request.get('/feed.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/^<\?xml version="1\.0"/);
    expect(body).toContain('<rss');
    expect(body).toContain('Node-RED Blog');
  });

  test('API UI widget pages preserve camelCase URLs', async ({ page }) => {
    const widgets = ['autoComplete', 'editableList', 'searchBox', 'treeList', 'typedInput'];
    for (const w of widgets) {
      const response = await page.goto(`/docs/api/ui/${w}/`);
      expect(response?.status(), `expected 200 for /docs/api/ui/${w}/`).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('lowercased widget URLs redirect to camelCase', async ({ page }) => {
    const widgets = [
      ['autocomplete', 'autoComplete'],
      ['editablelist', 'editableList'],
      ['searchbox', 'searchBox'],
      ['treelist', 'treeList'],
      ['typedinput', 'typedInput'],
    ];
    for (const [lower, camel] of widgets) {
      const response = await page.goto(`/docs/api/ui/${lower}/`);
      expect(response?.status()).toBe(200);
      const content = await page.content();
      expect(content, `expected redirect target for ${lower}`).toContain(`/docs/api/ui/${camel}`);
    }
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
