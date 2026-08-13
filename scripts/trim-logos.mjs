#!/usr/bin/env node
// Trim transparent (and near-white) padding from every raster logo in
// public/users/. AioMeet, Iniationware, ChatbotsStudio etc. ship with a
// lot of empty border around the actual mark, which makes them render
// noticeably smaller than their grid-cell peers (max-height: 40px caps
// the *image* height, so empty top/bottom padding eats into the visible
// mark area).
//
// Strategy: sharp.trim() with a small threshold so anti-aliased edges
// don't survive as a halo. Sharp auto-detects the "background" colour
// from the corner pixels — that handles transparent-bg PNGs (corner is
// alpha 0) and white-bg PNG/JPEGs (corner is #FFFFFF) without per-file
// configuration.
//
// SVGs are skipped (vector files don't need pixel-based trimming; their
// viewBox is the source of truth).
//
// Idempotent: re-running on an already-trimmed file is a no-op because
// the corner colour no longer borders the content.
//
// Usage:
//   node scripts/trim-logos.mjs                 # trim every raster in public/users/
//   node scripts/trim-logos.mjs --dry-run       # report what would change without writing
import { readdir, rename, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const DRY = process.argv.includes('--dry-run');
const USERS = resolve(import.meta.dirname, '..', 'public', 'users');
const THRESHOLD = 12; // 0..255 — anti-alias tolerance against the detected bg

const entries = await readdir(USERS);
const rasters = entries.filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();

let trimmed = 0;
let unchanged = 0;
let failed = 0;
const rows = [];

for (const file of rasters) {
  const path = resolve(USERS, file);
  const tmp = `${path}.trim-tmp`;
  try {
    const before = await sharp(path).metadata();
    // Write the trimmed output to a sibling .trim-tmp file in the same
    // format (sharp infers format from the destination extension via the
    // input pipeline). If the trim is a no-op (already tight), discard
    // the tmp and skip — keeps re-runs idempotent and mtime-stable.
    await sharp(path).trim({ threshold: THRESHOLD }).toFile(tmp);
    const after = await sharp(tmp).metadata();
    if (after.width === before.width && after.height === before.height) {
      await unlink(tmp);
      unchanged++;
      rows.push([file, `${before.width}x${before.height}`, '—', 'unchanged']);
      continue;
    }
    if (DRY) {
      await unlink(tmp);
      rows.push([
        file,
        `${before.width}x${before.height}`,
        `${after.width}x${after.height}`,
        'would trim',
      ]);
    } else {
      await rename(tmp, path);
      rows.push([
        file,
        `${before.width}x${before.height}`,
        `${after.width}x${after.height}`,
        'trimmed',
      ]);
    }
    trimmed++;
  } catch (err) {
    failed++;
    rows.push([file, '', '', `ERROR: ${err.message.slice(0, 60)}`]);
    // Don't leak the temp file on failure
    await unlink(tmp).catch(() => {});
  }
}

// pretty table
const colWidths = [
  Math.max(...rows.map((r) => r[0].length), 8),
  Math.max(...rows.map((r) => r[1].length), 10),
  Math.max(...rows.map((r) => r[2].length), 10),
  Math.max(...rows.map((r) => r[3].length), 8),
];
const pad = (s, n) => String(s).padEnd(n);
console.log(['file', 'before', 'after', 'status'].map((h, i) => pad(h, colWidths[i])).join('  '));
console.log(colWidths.map((w) => '-'.repeat(w)).join('  '));
for (const r of rows) {
  console.log(r.map((c, i) => pad(c, colWidths[i])).join('  '));
}
console.log(
  `\nsummary: trimmed=${trimmed}  unchanged=${unchanged}  failed=${failed}  (${DRY ? 'DRY RUN' : 'wrote in place'})`,
);
