#!/usr/bin/env node
// Classify every file in public/users/ into one of four "tones" so we
// can pick a dark-mode CSS treatment per logo. Output is a JSON map of
// `filename -> tone`, printed to stdout. Buckets:
//
//   dark   — mostly dark artwork on a transparent background. In dark
//            mode it disappears unless we invert/brighten to silhouette.
//   light  — mostly light artwork on a transparent background. Already
//            readable on dark surface; needs no treatment beyond a
//            slight opacity wash.
//   color  — saturated, mid-luminance artwork on a transparent
//            background. Brand colours; a mild brightness bump keeps
//            them legible without overpowering the wall.
//   boxed  — has an opaque (white-ish or coloured) background. The
//            background colour wins regardless of CSS filter; can't be
//            cleanly inverted because that'd flip the bg too. Needs an
//            asset swap to fix properly; we tag it so the dark-mode
//            rule can fall back to a contained tile rather than a
//            broken full-image transform.
//
// The thresholds below were tuned against the actual 47 logos in
// public/users/ — adjust if a new asset is misclassified.

import { readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const USERS_DIR = resolve(import.meta.dirname, '..', 'public', 'users');
const OUT = resolve(import.meta.dirname, '..', 'src', 'data', 'logo-tones.json');

// Pixel sample: render to small thumbnail to keep memory bounded; the
// stats we want (mean luminance, transparency %) are scale-invariant.
const SAMPLE_W = 96;

function luma({ r, g, b }) {
  // Rec.709 luminance (0..255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function classify(path) {
  const img = sharp(path).resize(SAMPLE_W, SAMPLE_W, { fit: 'inside' });
  // Force RGBA so even JPEGs (no alpha) get a uniform pixel layout.
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { channels } = info;
  let opaquePixels = 0;
  let transparentPixels = 0;
  let lumaSum = 0;
  let satSum = 0;
  let bgIsWhite = 0; // count of opaque near-white pixels (likely solid bg)
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 32) {
      transparentPixels++;
      continue;
    }
    opaquePixels++;
    lumaSum += luma({ r, g, b });
    // Crude saturation: max-channel minus min-channel, normalized
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    satSum += max === 0 ? 0 : (max - min) / max;
    if (r > 235 && g > 235 && b > 235) bgIsWhite++;
  }
  const total = opaquePixels + transparentPixels;
  const meanLuma = opaquePixels > 0 ? lumaSum / opaquePixels : 0; // 0..255
  const meanSat = opaquePixels > 0 ? satSum / opaquePixels : 0; // 0..1
  const transparentPct = total > 0 ? transparentPixels / total : 0;
  const whiteOpaquePct = total > 0 ? bgIsWhite / total : 0;

  // Decision tree.
  // 1. White-background image (low transparency, lots of white pixels).
  if (transparentPct < 0.15 && whiteOpaquePct > 0.35) {
    return { tone: 'boxed', meanLuma, meanSat, transparentPct, whiteOpaquePct };
  }
  // 2. Very dark artwork on transparent bg, regardless of saturation.
  //    A saturated-but-dark logo (e.g. dark teal mark) is still invisible
  //    on the dark page surface without the silhouette filter; we accept
  //    the trade-off of losing brand colour in exchange for legibility.
  if (meanLuma < 60) {
    return { tone: 'dark', meanLuma, meanSat, transparentPct, whiteOpaquePct };
  }
  // 3. Mid-luminance dark mark with low saturation → still dark.
  if (meanSat < 0.25 && meanLuma < 100) {
    return { tone: 'dark', meanLuma, meanSat, transparentPct, whiteOpaquePct };
  }
  // 4. Light mark on transparent bg → no treatment needed.
  if (meanSat < 0.25 && meanLuma > 175) {
    return { tone: 'light', meanLuma, meanSat, transparentPct, whiteOpaquePct };
  }
  // 5. Anything else with chroma → color (brand colour, mild brightness lift).
  return { tone: 'color', meanLuma, meanSat, transparentPct, whiteOpaquePct };
}

const files = (await readdir(USERS_DIR)).filter((f) => /\.(png|jpe?g|webp|svg)$/i.test(f)).sort();

const result = {};
for (const file of files) {
  const path = resolve(USERS_DIR, file);
  try {
    const { tone, meanLuma, meanSat, transparentPct, whiteOpaquePct } = await classify(path);
    result[file] = {
      tone,
      meanLuma: +meanLuma.toFixed(1),
      meanSat: +meanSat.toFixed(2),
      transparentPct: +transparentPct.toFixed(2),
      whiteOpaquePct: +whiteOpaquePct.toFixed(2),
    };
    console.log(
      `${tone.padEnd(6)}  ${file.padEnd(40)}  L=${meanLuma.toFixed(0).padStart(3)}  S=${meanSat.toFixed(2)}  trans=${(transparentPct * 100).toFixed(0).padStart(2)}%  white=${(whiteOpaquePct * 100).toFixed(0).padStart(2)}%`,
    );
  } catch (err) {
    console.warn(`SKIP ${file}: ${err.message}`);
  }
}

await writeFile(OUT, JSON.stringify(result, null, 2));
console.log(`\nwrote ${OUT}  (${Object.keys(result).length} entries)`);

// Quick distribution summary
const counts = Object.values(result).reduce((acc, { tone }) => {
  acc[tone] = (acc[tone] || 0) + 1;
  return acc;
}, {});
console.log('  by tone:', counts);
