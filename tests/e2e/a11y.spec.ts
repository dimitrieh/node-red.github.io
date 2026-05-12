import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Accessibility audit spec — broad sweep across representative pages.
 *
 * - Writes a JSON report to docs/audit-qa-a11y.json with the per-page
 *   breakdown so PR reviewers can see the full picture without re-running.
 * - ASSERTS that no `critical` impact violation slips in (bypasses, missing
 *   labels, frame-title, etc — anything axe rates worse than "serious").
 * - For `serious` impact, the suite enforces an explicit KNOWN_OPEN allowlist
 *   of in-flight items tracked in docs/audit-ux/team/a11y-report.md. New
 *   serious violations OUTSIDE the allowlist (different rule id) fail the
 *   spec, so a regression on a new rule is caught immediately.
 *
 * The narrower, fully-asserting tests live in a11y-themes.spec.ts and exercise
 * the a11y-owned chrome (Starlight sidebar, header, breadcrumb, theme select,
 * footer).
 */

// Force a single worker so the shared `collected` / `pageStatus` arrays are
// populated by every page-scan test before the report-writer test asserts.
// Without this, Playwright spawns one worker per file in parallel and each
// worker has its own module-level state, so the writer would see an empty
// collected[] and silently miss violations from other workers.
test.describe.configure({ mode: 'serial' });

interface Violation {
  page: string;
  id: string;
  impact: string | null | undefined;
  description: string;
  help: string;
  helpUrl: string;
  selector: string;
  htmlSnippet: string;
}

const PAGES: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'docs', path: '/docs/' },
  { name: 'docs-api-runtime', path: '/docs/api/runtime/' },
  { name: 'blog', path: '/blog/' },
  { name: 'blog-latest', path: '/blog/2024/06/20/version-4-0-released/' },
  { name: 'about', path: '/about/' },
  { name: 'about-community', path: '/about/community/' },
  { name: 'docs-getting-started', path: '/docs/getting-started/' },
  { name: 'docs-user-guide', path: '/docs/user-guide/' },
  { name: 'not-found', path: '/this-page-does-not-exist-xyz/' },
];

const collected: Violation[] = [];
const pageStatus: { name: string; path: string; status: number; numViolations: number; bySeverity: Record<string, number> }[] = [];

for (const p of PAGES) {
  test(`a11y scan: ${p.name} (${p.path})`, async ({ page }) => {
    const resp = await page.goto(p.path, { waitUntil: 'domcontentloaded' });
    const status = resp?.status() ?? 0;
    // Even 404 pages should be scanned
    const builder = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      // The YouTube iframe on /about/ and /about/community/ surfaces violations
      // (aria-prohibited-attr on #movie_player) that belong to YouTube's player
      // chrome, not to us. The marketing axe tests in navigation.spec.ts apply
      // the same exclude — keep them in sync.
      .exclude('iframe');
    const results = await builder.analyze();
    const bySeverity: Record<string, number> = {};
    for (const v of results.violations) {
      for (const node of v.nodes) {
        collected.push({
          page: p.path,
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          selector: node.target.join(' '),
          htmlSnippet: (node.html ?? '').slice(0, 200),
        });
      }
      const imp = v.impact ?? 'unknown';
      bySeverity[imp] = (bySeverity[imp] ?? 0) + v.nodes.length;
    }
    pageStatus.push({
      name: p.name,
      path: p.path,
      status,
      numViolations: results.violations.reduce((s, v) => s + v.nodes.length, 0),
      bySeverity,
    });
    expect(true).toBe(true);
  });
}

/**
 * Known-open serious violations that live in another teammate's file scope and
 * are tracked in docs/audit-ux/team/a11y-report.md. They collapse to two root
 * causes:
 *
 *  - BaseLayout's global `a { color: var(--nr-red) }` rule resolves to #C75050
 *    which fails AA against white (4.47:1) and against dark page bg (3.66:1).
 *    When the UX teammate switches to the theme-aware --sl-color-text-accent
 *    token (or a #8B2E2E / #E87070 pair) the allowlist shrinks dramatically.
 *  - design-tokens.css --nr-gray-500 #6B6B6B is AA on white but only 3.5:1 on
 *    the dark page bg #111114, so 5-ish .nr-label nodes flag in dark mode.
 *
 * The cap is intentionally generous because a single blog post can carry 50+
 * red links; if the cap is hit we'll learn from the test before the user does.
 */
const KNOWN_OPEN: { rule: string; maxNodes: number }[] = [
  { rule: 'color-contrast', maxNodes: 300 },
  // link-in-text-block: same root cause as color-contrast — when a { color }
  // switches to the theme-aware accent token, the links also become
  // distinguishable from surrounding gray text. Closed by the same UX patch.
  { rule: 'link-in-text-block', maxNodes: 20 },
  // heading-order: two content pages emit h1 -> h3 (or skip h2). One is
  // /docs/user-guide/ where Starlight injects a h1 and the markdown starts
  // at h3; the other is /about/community/ "Discussion Guidelines" h3. Content
  // fix — tracked in a11y-report.md round-2.
  { rule: 'heading-order', maxNodes: 5 },
];

test('write a11y report', async () => {
  const out = resolve(process.cwd(), 'docs/audit-qa-a11y.json');
  mkdirSync(dirname(out), { recursive: true });
  const byRule: Record<string, { count: number; impact: string; help: string; helpUrl: string; pages: Set<string>; sampleSelector: string; sampleSnippet: string }> = {};
  for (const v of collected) {
    if (!byRule[v.id]) {
      byRule[v.id] = {
        count: 0,
        impact: v.impact ?? 'unknown',
        help: v.help,
        helpUrl: v.helpUrl,
        pages: new Set(),
        sampleSelector: v.selector,
        sampleSnippet: v.htmlSnippet,
      };
    }
    byRule[v.id]!.count++;
    byRule[v.id]!.pages.add(v.page);
  }
  const summary = Object.entries(byRule)
    .map(([id, info]) => ({
      id,
      impact: info.impact,
      count: info.count,
      pages: [...info.pages],
      help: info.help,
      helpUrl: info.helpUrl,
      sampleSelector: info.sampleSelector,
      sampleSnippet: info.sampleSnippet,
    }))
    .sort((a, b) => b.count - a.count);
  const severityTotals: Record<string, number> = {};
  for (const v of collected) {
    const imp = v.impact ?? 'unknown';
    severityTotals[imp] = (severityTotals[imp] ?? 0) + 1;
  }
  writeFileSync(
    out,
    JSON.stringify(
      {
        pages: pageStatus,
        totalViolations: collected.length,
        severityTotals,
        byRule: summary,
      },
      null,
      2
    )
  );
  console.log(`Wrote a11y report: ${out}`);
  console.log(`Total violations: ${collected.length}`);
  console.log(`Severity totals:`, severityTotals);

  // ASSERT: 0 critical-impact violations ever.
  const criticalCount = severityTotals['critical'] ?? 0;
  expect(criticalCount, `Expected 0 critical-impact a11y violations; got ${criticalCount}.`).toBe(0);

  // ASSERT: every rule appearing on this branch is on the KNOWN_OPEN list and
  // within the agreed cap. Anything outside the list fails the spec, so a new
  // rule violation (e.g. a missing label, a duplicate id) is caught before PR.
  const byRuleCounts = summary.reduce<Record<string, number>>((acc, r) => {
    acc[r.id] = r.count;
    return acc;
  }, {});
  for (const [ruleId, count] of Object.entries(byRuleCounts)) {
    const allow = KNOWN_OPEN.find((k) => k.rule === ruleId);
    if (!allow) {
      throw new Error(
        `New a11y rule "${ruleId}" violated by ${count} node(s) but is not on KNOWN_OPEN allowlist. ` +
          `Either fix the violation or extend tests/e2e/a11y.spec.ts KNOWN_OPEN with a rationale.`
      );
    }
    expect(
      count,
      `Rule "${ruleId}" exceeded its agreed cap (${allow.maxNodes}); now ${count}. ` +
        `Investigate before raising the cap.`
    ).toBeLessThanOrEqual(allow.maxNodes);
  }
});
