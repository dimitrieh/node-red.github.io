import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

const SOURCE_DIR = '/home/sprite/node-red-astro/_posts';
const DEST_DIR = '/home/sprite/node-red-website/src/content/blog';

function transformBlogFrontmatter(content: string, filename: string): string {
  // Extract existing frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.warn(`No frontmatter found in ${filename}`);
    return content;
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Parse existing frontmatter
  const titleMatch = frontmatter.match(/title:\s*["']?(.+?)["']?\s*$/m);
  const title = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, '') : 'Untitled';

  const authorMatch = frontmatter.match(/author:\s*["']?(.+?)["']?\s*$/m);
  const author = authorMatch ? authorMatch[1].trim() : 'nick';

  const descMatch = frontmatter.match(/description:\s*["']?(.+?)["']?\s*$/m);
  const description = descMatch ? descMatch[1].trim() : '';

  const imageMatch = frontmatter.match(/image:\s*["']?(.+?)["']?\s*$/m);
  const image = imageMatch ? imageMatch[1].trim() : '';

  // Build new frontmatter
  let newFrontmatter = `---\ntitle: "${title.replace(/"/g, '\\"')}"`;
  newFrontmatter += `\nauthor: "${author}"`;
  if (description) {
    newFrontmatter += `\ndescription: "${description.replace(/"/g, '\\"')}"`;
  }
  if (image) {
    newFrontmatter += `\nimage: "${image}"`;
  }
  newFrontmatter += '\n---';

  return newFrontmatter + body;
}

// Create destination directory
mkdirSync(DEST_DIR, { recursive: true });

// Process all blog posts
const entries = readdirSync(SOURCE_DIR);
let count = 0;

for (const entry of entries) {
  if (!entry.endsWith('.md')) continue;

  const sourcePath = join(SOURCE_DIR, entry);
  const content = readFileSync(sourcePath, 'utf-8');

  const transformedContent = transformBlogFrontmatter(content, entry);

  const destPath = join(DEST_DIR, entry);
  writeFileSync(destPath, transformedContent);
  console.log(`Migrated: ${entry}`);
  count++;
}

console.log(`\nBlog migration complete! Migrated ${count} posts.`);
