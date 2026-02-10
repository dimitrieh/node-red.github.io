import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = './public';
const DIST_DIR = './dist';

function countFiles(dir: string, extensions: string[]): number {
  let count = 0;

  function walk(currentDir: string) {
    if (!existsSync(currentDir)) return;
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (extensions.some(ext => entry.endsWith(ext))) {
        count++;
      }
    }
  }

  walk(dir);
  return count;
}

const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

// Count source images
const publicImages = countFiles(join(PUBLIC_DIR, 'images'), imageExtensions);
const publicBlogImages = countFiles(join(PUBLIC_DIR, 'blog/content/images'), imageExtensions);
const publicUserImages = countFiles(join(PUBLIC_DIR, 'users'), imageExtensions);

// Count built images
const distImages = countFiles(join(DIST_DIR, 'images'), imageExtensions);
const distBlogImages = countFiles(join(DIST_DIR, 'blog/content/images'), imageExtensions);
const distUserImages = countFiles(join(DIST_DIR, 'users'), imageExtensions);
const distOptimizedImages = countFiles(join(DIST_DIR, '_astro'), imageExtensions);

console.log('=== IMAGE VERIFICATION ===');
console.log('Source images:');
console.log(`  /public/images:              ${publicImages}`);
console.log(`  /public/blog/content/images: ${publicBlogImages}`);
console.log(`  /public/users:               ${publicUserImages}`);
console.log('');
console.log('Built images:');
console.log(`  /dist/images:              ${distImages}`);
console.log(`  /dist/blog/content/images: ${distBlogImages}`);
console.log(`  /dist/users:               ${distUserImages}`);
console.log(`  /dist/_astro (optimized):  ${distOptimizedImages}`);
console.log('');

const totalSource = publicImages + publicBlogImages + publicUserImages;
const totalDist = distImages + distBlogImages + distUserImages + distOptimizedImages;

console.log(`Total source images: ${totalSource}`);
console.log(`Total built images:  ${totalDist}`);

if (totalDist >= totalSource) {
  console.log('\n✓ Image verification PASSED!');
  process.exit(0);
} else {
  console.log('\n✗ Image verification FAILED - some images missing');
  process.exit(1);
}
