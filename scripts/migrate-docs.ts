import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, basename } from 'path';

const SOURCE_DIR = '/home/sprite/node-red-astro/docs';
const DEST_DIR = '/home/sprite/node-red-website/src/content/docs';

// Order mapping for sidebar ordering within sections
const sectionOrders: Record<string, Record<string, number>> = {
  'getting-started': {
    'index': 0,
    'local': 1,
    'docker': 2,
    'raspberrypi': 3,
    'beaglebone': 4,
    'android': 5,
    'docker-custom': 6,
    'aws': 7,
    'azure': 8,
    'ibmcloud': 9,
    'flowfuse': 10,
    'node-red-admin': 11,
    'updating': 12,
    'faq': 13,
  },
  'user-guide': {
    'index': 0,
    'concepts': 1,
  },
  'creating-nodes': {
    'index': 0,
    'first-node': 1,
    'node-js': 2,
    'node-html': 3,
    'node-context': 4,
    'config-nodes': 5,
    'properties': 6,
    'credentials': 7,
    'appearance': 8,
    'status': 9,
    'edit-dialog': 10,
    'context-menu': 11,
    'help-style-guide': 12,
    'i18n': 13,
    'packaging': 14,
    'subflow-modules': 15,
  },
  'developing': {
    'index': 0,
  },
  'api': {
    'index': 0,
  },
  'tutorials': {
    'index': 0,
  },
};

function getOrder(section: string, file: string): number | undefined {
  const name = file.replace('.md', '').replace('/index', '');
  if (sectionOrders[section]?.[name] !== undefined) {
    return sectionOrders[section][name];
  }
  return undefined;
}

function transformFrontmatter(content: string, relativePath: string): string {
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
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

  const descMatch = frontmatter.match(/description:\s*["']?(.+?)["']?\s*$/m);
  const description = descMatch ? descMatch[1].trim() : '';

  // Determine section for ordering
  const pathParts = relativePath.split('/');
  const section = pathParts[0];
  const fileName = pathParts[pathParts.length - 1];
  const order = getOrder(section, fileName);

  // Build new frontmatter
  let newFrontmatter = `---\ntitle: "${title.replace(/"/g, '\\"')}"`;
  if (description) {
    newFrontmatter += `\ndescription: "${description.replace(/"/g, '\\"')}"`;
  }
  if (order !== undefined) {
    newFrontmatter += `\nsidebar:\n  order: ${order}`;
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
      const transformedContent = transformFrontmatter(content, relativePath);

      const destPath = join(destDir, entry);
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, transformedContent);
      console.log(`Migrated: ${relativePath}`);
    }
  }
}

// Create destination directory
mkdirSync(DEST_DIR, { recursive: true });

// Process all docs
console.log('Starting docs migration...');
processDirectory(SOURCE_DIR, DEST_DIR);
console.log('Docs migration complete!');
