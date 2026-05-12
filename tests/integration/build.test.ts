import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';

function countHtmlFiles(dir: string): number {
  let count = 0;
  if (!existsSync(dir)) return 0;

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.html')) {
        count++;
      }
    }
  }

  walk(dir);
  return count;
}

describe('Build Output', () => {
  it('should have dist directory', () => {
    expect(existsSync(DIST_DIR)).toBe(true);
  });

  it('should have at least 138 docs pages', () => {
    const count = countHtmlFiles(join(DIST_DIR, 'docs'));
    expect(count).toBeGreaterThanOrEqual(138);
  });

  it('should have at least 52 blog pages', () => {
    const count = countHtmlFiles(join(DIST_DIR, 'blog'));
    expect(count).toBeGreaterThanOrEqual(52);
  });

  it('should have at least 11 about pages', () => {
    const count = countHtmlFiles(join(DIST_DIR, 'about'));
    expect(count).toBeGreaterThanOrEqual(11);
  });

  it('should have home page', () => {
    expect(existsSync(join(DIST_DIR, 'index.html'))).toBe(true);
  });

  it('should have RSS feed', () => {
    expect(existsSync(join(DIST_DIR, 'feed.xml'))).toBe(true);
  });

  it('should have sitemap', () => {
    expect(existsSync(join(DIST_DIR, 'sitemap-index.xml'))).toBe(true);
  });

  it('should have 404 page', () => {
    expect(existsSync(join(DIST_DIR, '404.html'))).toBe(true);
  });
});
