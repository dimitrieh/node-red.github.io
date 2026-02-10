import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';

interface VerificationResult {
  category: string;
  total: number;
  found: number;
  missing: string[];
}

interface MigrationStatus {
  lastRun: string;
  summary: {
    totalPages: number;
    pagesComplete: number;
    pagesFailed: number;
    percentComplete: number;
  };
  docs: VerificationResult;
  blog: VerificationResult;
  about: VerificationResult;
}

function countHtmlFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    if (!existsSync(currentDir)) return;
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.html')) {
        // Convert file path to URL
        let url = fullPath.replace(DIST_DIR, '').replace('/index.html', '/');
        if (!url.endsWith('/')) url += '/';
        files.push(url);
      }
    }
  }

  walk(dir);
  return files;
}

function verifySection(name: string, dir: string, expectedMin: number): VerificationResult {
  const files = countHtmlFiles(dir);
  return {
    category: name,
    total: expectedMin,
    found: files.length,
    missing: files.length < expectedMin ? [`Expected at least ${expectedMin}, found ${files.length}`] : [],
  };
}

// Verify all sections
const docsResult = verifySection('docs', join(DIST_DIR, 'docs'), 138);
const blogResult = verifySection('blog', join(DIST_DIR, 'blog'), 52);
const aboutResult = verifySection('about', join(DIST_DIR, 'about'), 11);

const totalPages = docsResult.found + blogResult.found + aboutResult.found;
const expectedTotal = 138 + 52 + 11;

const status: MigrationStatus = {
  lastRun: new Date().toISOString(),
  summary: {
    totalPages: expectedTotal,
    pagesComplete: totalPages,
    pagesFailed: Math.max(0, expectedTotal - totalPages),
    percentComplete: Math.round((totalPages / expectedTotal) * 1000) / 10,
  },
  docs: docsResult,
  blog: blogResult,
  about: aboutResult,
};

writeFileSync('migration-status.json', JSON.stringify(status, null, 2));

console.log('=== MIGRATION STATUS ===');
console.log(`Docs Pages:   ${docsResult.found}/${docsResult.total} (${Math.round((docsResult.found / docsResult.total) * 100)}%)`);
console.log(`Blog Posts:   ${blogResult.found}/${blogResult.total} (${Math.round((blogResult.found / blogResult.total) * 100)}%)`);
console.log(`About Pages:  ${aboutResult.found}/${aboutResult.total} (${Math.round((aboutResult.found / aboutResult.total) * 100)}%)`);
console.log('─────────────────────────');
console.log(`OVERALL:      ${totalPages}/${expectedTotal} (${status.summary.percentComplete}%)`);

if (status.summary.percentComplete >= 100) {
  console.log('\n✓ Migration verification PASSED!');
  process.exit(0);
} else {
  console.log('\n✗ Migration verification FAILED - some pages missing');
  process.exit(1);
}
