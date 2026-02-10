import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const SOURCE_DIR = '/home/sprite/node-red-astro/about';
const DEST_DIR = '/home/sprite/node-red-website/src/content/about';

function transformAboutFrontmatter(content: string, relativePath: string): string {
  // Extract existing frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.warn(`No frontmatter found in ${relativePath}`);
    return content;
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Parse existing frontmatter
  const titleMatch = frontmatter.match(/title:\s*["']?(.+?)["']?\s*$/m);
  const title = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, '') : 'Untitled';

  const descMatch = frontmatter.match(/description:\s*["']?(.+?)["']?\s*$/m);
  const description = descMatch ? descMatch[1].trim() : '';

  const layoutMatch = frontmatter.match(/layout:\s*["']?(.+?)["']?\s*$/m);
  const layout = layoutMatch ? layoutMatch[1].trim() : '';

  // Build new frontmatter
  let newFrontmatter = `---\ntitle: "${title.replace(/"/g, '\\"')}"`;
  if (description) {
    newFrontmatter += `\ndescription: "${description.replace(/"/g, '\\"')}"`;
  }
  if (layout) {
    newFrontmatter += `\nlayout: "${layout}"`;
  }
  newFrontmatter += '\n---';

  return newFrontmatter + body;
}

function processDirectory(sourceDir: string, destDir: string, basePath: string = '') {
  const entries = readdirSync(sourceDir);

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry);
    const stat = statSync(sourcePath);

    if (stat.isDirectory()) {
      const newDestDir = join(destDir, entry);
      mkdirSync(newDestDir, { recursive: true });
      processDirectory(sourcePath, newDestDir, join(basePath, entry));
    } else if (entry.endsWith('.md')) {
      const content = readFileSync(sourcePath, 'utf-8');
      const relativePath = join(basePath, entry);
      const transformedContent = transformAboutFrontmatter(content, relativePath);

      const destPath = join(destDir, entry);
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, transformedContent);
      console.log(`Migrated: ${relativePath}`);
    }
  }
}

// Create destination directory
mkdirSync(DEST_DIR, { recursive: true });

// Process all about pages
console.log('Starting about pages migration...');
processDirectory(SOURCE_DIR, DEST_DIR);
console.log('About pages migration complete!');
