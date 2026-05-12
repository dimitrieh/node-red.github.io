import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Accessibility audit spec. Unlike the assertion-style axe tests in
 * navigation.spec.ts, this spec COLLECTS violations across a fixed set
 * of representative pages and writes a JSON report to
 * docs/audit-qa-a11y.json so the QA doc can summarise findings.
 *
 * Tests do not fail on violations (they only fail if axe itself crashes).
 */

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
    const builder = new AxeBuilder({ page }).withTags([
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
      'best-practice',
    ]);
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
    byRule[v.id].count++;
    byRule[v.id].pages.add(v.page);
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
});
