#!/usr/bin/env node
// Transform the Figma SVG export into the interactive editor illustration.
//
// Input:  ./Node-RED Website Design.svg (Figma frame 5:900, 1392x851 viewBox)
//
//         That export is NOT in the repository: it is a design source file, and
//         root-level *.svg is gitignored so it cannot be committed by accident.
//         The generated output IS committed, at the path below, so the site
//         builds without it. Re-exporting the frame from Figma and dropping it at
//         the repo root is only needed when the illustration itself changes.
// Output: ./public/images/editor-mock/editor.svg
//
// Strategy: keep the entire Figma drawing as-is, layered with the smallest
// additions needed for interactivity:
//   1. SVG <pattern> for the canvas grid (the export omits it because Figma
//      hides overflow content), positioned over the canvas region only.
//   2. The flow content (the two nodes + wire + their masks) lives as one
//      contiguous source block at the end of the outer clip0 group. We move
//      that block into a <g class="ed-canvas-pan"> alongside the grid rect
//      so the drag-pan handler translates the grid, wire, and nodes
//      together.
//   3. Transparent hover overlay rects with data-label on top, so the
//      tooltip JS can show per-region labels without altering Figma paths.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const SRC = path.join(ROOT, 'Node-RED Website Design.svg');
const OUT = path.join(ROOT, 'public/images/editor-mock/editor.svg');

const svg = fs.readFileSync(SRC, 'utf8');

// Node-RED official logo (public/about/media/node-red-icon.svg). We embed
// its inner drawing instead of the placeholder red rounded rect, recoloured
// to the site's accent red (#DA0000 instead of the upstream #8f0000).
const logoSvgPath = path.join(ROOT, 'public/about/media/node-red-icon.svg');
const logoSvg = fs.readFileSync(logoSvgPath, 'utf8');
function extractLogoBody(src) {
  const after = src.indexOf('</metadata>');
  let body = src.slice(after + '</metadata>'.length);
  body = body.replace(/<\/svg>[\s\S]*$/, '').trim();
  // Recolour upstream's dark red to our brand red.
  return body.replace(/#8f0000/gi, '#DA0000');
}
const LOGO_BODY = extractLogoBody(logoSvg);

const svgOpen = svg.match(/<svg[^>]*>/);
const innerStart = svgOpen.index + svgOpen[0].length;
const innerEnd = svg.lastIndexOf('</svg>');
const inner = svg.slice(innerStart, innerEnd);

// Split the defs out so we can append our grid pattern + clip path.
const defsMatch = inner.match(/<defs>([\s\S]*?)<\/defs>/);
const defsBody = defsMatch ? defsMatch[1] : '';
const innerNoDefs = inner.replace(/<defs>[\s\S]*?<\/defs>/, '').trim();

// Flow content = everything from the first node outline rect to the close
// of the outermost clip group. We locate the boundaries by searching for
// fixed markers from the Figma export.
const FLOW_START_MARKER = '<rect x="326.25" y="227"';
const flowStart = innerNoDefs.indexOf(FLOW_START_MARKER);
if (flowStart < 0) throw new Error('Could not locate flow start marker in SVG');

// The end is the close of the outermost <g clip-path="url(#clip0_5_900)">.
// Find it by depth-tracking from the very beginning of innerNoDefs.
function findGroupCloseDepth1(src, openIdx) {
  let depth = 1;
  let scan = openIdx + 1;
  while (depth > 0 && scan < src.length) {
    const o = src.indexOf('<g', scan);
    const c = src.indexOf('</g>', scan);
    if (c < 0) return -1;
    if (o >= 0 && o < c) {
      depth++;
      scan = o + 2;
    } else {
      depth--;
      if (depth === 0) return c;
      scan = c + 4;
    }
  }
  return -1;
}
const clip0Open = innerNoDefs.indexOf('<g clip-path="url(#clip0_5_900)">');
const clip0Close = findGroupCloseDepth1(innerNoDefs, clip0Open);
if (clip0Close < 0) throw new Error('Could not locate clip0 close');

const flowSource = innerNoDefs.slice(flowStart, clip0Close).trim();
let chrome = (innerNoDefs.slice(0, flowStart) + innerNoDefs.slice(clip0Close)).trim();

// Remove the clip6 group. It contains a huge white-fill path that covers
// the canvas region in document order (Figma's own renderer skips it; SVG
// browsers honour it and hide the right panels + status pill + sidebar
// tabs which are drawn in clip1 BEFORE clip6). We're replacing the grid
// with an SVG <pattern> in the pannable group anyway, so dropping clip6
// entirely is the right move.
const clip6Open = chrome.indexOf('<g clip-path="url(#clip6_5_900)">');
if (clip6Open >= 0) {
  const clip6Close = findGroupCloseDepth1(chrome, clip6Open);
  if (clip6Close >= 0) {
    chrome = chrome.slice(0, clip6Open) + chrome.slice(clip6Close + 4);
    console.log("Removed clip6 group (Figma's grid + white canvas bg)");
  }
}

// Remove the mask-fill canvas-border path that Figma uses for the canvas
// outline. The mask+fill technique produces a border that's 2-3 viewBox
// units thick and renders heavier in Chromium than Figma. We re-add a
// clean 1-unit stroke below.
const borderPathRe = /<path d="[^"]+" fill="black" mask="url\(#path-26-inside-2_5_900\)"\/>/;
if (borderPathRe.test(chrome)) {
  chrome = chrome.replace(borderPathRe, '');
  console.log('Removed mask-fill canvas border (replaced with clean stroke)');
}

// Replace the Figma placeholder logo (a simple red rounded rect inside
// clip4) with the official Node-RED logo. The clip4 path is the same
// 32×32 rounded square at (9, 9), so the logo gets the matching corner
// radius automatically. The original logo is 480×480; we crop its
// viewBox to the actual artwork extent (16..464 in each axis = 448×448)
// so the red background fills the full 32×32 with no transparent border.
const logoBlockRe = /<g clip-path="url\(#clip4_5_900\)">\s*<path d="M9 13C9 10\.7909[\s\S]*?<\/g>/;
if (logoBlockRe.test(chrome)) {
  chrome = chrome.replace(
    logoBlockRe,
    `<g clip-path="url(#clip4_5_900)">
      <svg x="9" y="9" width="32" height="32" viewBox="16 16 448 448" preserveAspectRatio="xMidYMid meet">
        ${LOGO_BODY}
      </svg>
    </g>`,
  );
  console.log('Embedded Node-RED official logo (recoloured to #DA0000)');
}

console.log(`Flow source length: ${flowSource.length} bytes`);
console.log(`Chrome length: ${chrome.length} bytes`);

// Grid pattern. Node-RED's actual editor CSS is:
//   stroke: #EEEEEE; stroke-width: 1px; shape-rendering: crispEdges;
// (source: editor-client/src/sass/workspace.scss + colors.scss).
// At our render scale (viewBox 1392 -> ~1280 display px = factor 0.92),
// a 1-px stroke at #EEEEEE anti-aliases to ~#F2F2F2 on a 2x DPR screen
// and washes out completely on 1x. We pre-darken to #E0E0E0 so the
// rendered pixels land back at ~#EEEEEE — the visual weight that
// matches the actual Node-RED canvas on a 2x screen.
const GRID_DEFS = `
  <pattern id="ed-grid" x="225" y="49" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 H 0 V 20" fill="none" stroke="#E0E0E0" stroke-width="1" shape-rendering="crispEdges"/>
  </pattern>
  <clipPath id="ed-canvas-clip">
    <rect x="225" y="49" width="1166" height="800"/>
  </clipPath>`;

const flowGroup = `
  <!-- Canvas layer: static white background + pannable grid + flow.
       White bg stays fixed (matches Node-RED's view-background variable);
       gives #EEEEEE grid lines enough contrast. Grid + nodes share the
       pannable group so they translate together under the drag handler.
       The pan group is wrapped by .ed-canvas-root so that:
         (a) mousedown on grid OR a node bubbles up to the same element
             the JS pan handler is bound to;
         (b) flow nodes paint *above* the canvas-root hit area, which
             means a flow node's data-label wins the closest() lookup
             (the canvas-root carries no data-label of its own — the
             empty canvas is intentionally a non-legend region). -->
  <g clip-path="url(#ed-canvas-clip)">
    <!-- White canvas background (does NOT pan — matches real Node-RED) -->
    <rect class="ed-canvas-bg" x="225" y="49" width="1166" height="800" fill="#FFFFFF"/>
    <g class="ed-el ed-canvas-root">
      <g class="ed-canvas-pan">
        <!-- Grid pattern (CSS-pattern variant, far cheaper than the 64 KB
             Figma asset). Oversized rect so panning reveals more grid. -->
        <rect class="ed-canvas-grid" x="-1000" y="-1000" width="9000" height="9000" fill="url(#ed-grid)"/>
        <!-- Flow elements (wire + 2 nodes) - verbatim from the Figma export,
             extracted as a contiguous source range. The group carries the
             data-label that the legend reads; .ed-flow-el:hover swaps the
             black strokes on rects+paths to red, and a :has() rule on the
             SVG also tints the canvas background + recolours the canvas
             border on hover, so hovering a node lights the whole work
             surface — reinforcing "visual programming on a canvas". -->
        <g class="ed-flow-el" data-label="Nodes on a canvas — a visual language, no black box of code">
          ${flowSource}
        </g>
      </g>
    </g>
  </g>`;

// Overlays are grouped by purpose. Hovering any overlay in a group highlights
// every member of that group (e.g. all four panels light up together), because
// the corresponding Node-RED feature is the SAME thing in different positions.
// Each overlay's `rx` matches the corner radius of the chrome element it sits
// on top of, so the red hover ring follows the same rounded silhouette
// (panels use rx=3.5 per the Figma rects; header pills + logo use rx=4 per
// the Bezier-equivalent paths in clip2/3/4).
const SIDE_PANEL_LABEL = 'Side panel — palette, debug, info, config and other tabs';
const CANVAS_CTRL_LABEL = 'Canvas controls — zoom and navigate the flow';
const PANEL_TAB_LABEL = 'Panel tabs — switch what the side panel shows';

const overlays = [
  // Logo: the chrome is a solid red square, so a red ring drawn on its
  // edge blends into the logo. We offset the overlay outward by 2 units
  // (rx grows from 4 → 6 to stay parallel) so the entire ring lands on
  // the white header strip outside the logo and reads clearly.
  { x: 7, y: 7, w: 36, h: 36, rx: 6, group: 'logo', label: 'Node-RED — open the main menu' },
  {
    x: 225,
    y: 9,
    w: 120,
    h: 32,
    rx: 4,
    group: 'workspace-tabs',
    label: 'Workspace tabs — each tab is a separate flow',
  },
  {
    x: 353,
    y: 9,
    w: 120,
    h: 32,
    rx: 4,
    group: 'workspace-tabs',
    label: 'Workspace tabs — each tab is a separate flow',
  },
  {
    x: 1264,
    y: 9,
    w: 119,
    h: 32,
    rx: 4,
    group: 'deploy',
    label: 'Deploy — push your flows to the runtime',
  },
  { x: 9, y: 49, w: 208, h: 399, rx: 3.5, group: 'panels', label: SIDE_PANEL_LABEL },
  { x: 9, y: 456, w: 208, h: 386, rx: 3.5, group: 'panels', label: SIDE_PANEL_LABEL },
  { x: 1108, y: 58, w: 275, h: 390, rx: 3.5, group: 'panels', label: SIDE_PANEL_LABEL },
  { x: 1108, y: 456, w: 275, h: 350, rx: 3.5, group: 'panels', label: SIDE_PANEL_LABEL },
  { x: 234, y: 814, w: 28, h: 28, rx: 3.5, group: 'canvas-controls', label: CANVAS_CTRL_LABEL },
  { x: 268, y: 814, w: 114, h: 28, rx: 3.5, group: 'canvas-controls', label: CANVAS_CTRL_LABEL },
  // Panel-tabs row: 9 buttons at x=1083.5 + i*34, width 27, height 27.
  // All share `group: panel-controls` so hovering any one lights all
  // nine together — they describe a single feature (the sidebar panel
  // switcher), so a unified highlight reads more clearly than per-button.
  ...Array.from({ length: 9 }, (_, i) => ({
    x: 1083 + i * 34,
    y: 814,
    w: 28,
    h: 28,
    rx: 3.5,
    group: 'panel-controls',
    label: PANEL_TAB_LABEL,
  })),
];
const overlayBlock = overlays
  .map((o) => {
    const groupAttr = o.group ? ` data-hover-group="${o.group}"` : '';
    return `    <g class="ed-el" data-label="${o.label}"${groupAttr}>
      <rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="${o.rx}" fill="transparent" pointer-events="all"/>
    </g>`;
  })
  .join('\n');

// Inline CSS lives inside the SVG itself — that side-steps Astro's
// per-component CSS scoping (the SVG is injected via set:html, so any
// .ed-el selector in the parent .astro file gets scoped with an
// astro-XXX :where() class that the SVG elements don't have). Browsers
// honour <style> inside SVG and the rules cascade to the surrounding
// document, so this is the most reliable place for editor-specific CSS.
const SVG_STYLES = `
  .ed-svg { cursor: default; }
  .ed-svg .ed-el { cursor: help; transition: stroke 150ms ease, fill 150ms ease; }
  .ed-svg .ed-el:not(.ed-canvas-root) > rect[fill="transparent"] {
    stroke: transparent;
    stroke-width: 2;
    transition: stroke 150ms ease, fill 150ms ease;
  }
  .ed-svg .ed-el:not(.ed-canvas-root):hover > rect[fill="transparent"],
  .ed-svg .ed-el.is-group-hover:not(.ed-canvas-root) > rect[fill="transparent"] {
    stroke: #DA0000;
    fill: rgba(218, 0, 0, 0.08);
  }
  .ed-svg .ed-flow-el { cursor: help; }
  /* Hovering a node turns its body stroke + the wire path red. No bg
     ring overlay (the user preferred the cleaner stroke-only highlight
     over the panel-style ring + tint). */
  .ed-svg .ed-flow-el rect[stroke],
  .ed-svg .ed-flow-el path[stroke] {
    transition: stroke 150ms ease, stroke-width 150ms ease;
  }
  .ed-svg .ed-flow-el:hover rect[stroke],
  .ed-svg .ed-flow-el:hover path[stroke] {
    stroke: #DA0000;
  }
  /* Canvas wakes up with the flow: subtle red tint on the white bg +
     red canvas border. Uses :has() (supported in all current browsers)
     so the rule sits on the SVG root and targets the bg/border which
     live outside the .ed-flow-el subtree. */
  .ed-svg .ed-canvas-bg,
  .ed-svg .ed-canvas-border {
    transition: fill 200ms ease, stroke 200ms ease;
  }
  .ed-svg:has(.ed-flow-el:hover) .ed-canvas-bg {
    fill: rgba(218, 0, 0, 0.05);
  }
  .ed-svg:has(.ed-flow-el:hover) .ed-canvas-border {
    stroke: #DA0000;
  }
  .ed-svg .ed-canvas-root { cursor: grab; }
  .ed-svg .ed-canvas-root.is-panning { cursor: grabbing; }
  /* No transition on .ed-canvas-pan: every mousemove sets a new transform,
     and a transition would animate each step over 200ms, making the pan
     visibly lag behind the cursor. The drag should track 1:1. */

  /* In-SVG legend: a dark pill anchored at lower-centre of the SVG that
     stays put while the canvas pans (it lives outside .ed-canvas-pan).
     Hidden by default; JS toggles .is-active when a labelled region is
     hovered. pointer-events:none so the pill never blocks hover events
     for the canvas/flow elements painted underneath. */
  .ed-svg .ed-svg-legend {
    opacity: 0;
    transition: opacity 150ms ease;
    pointer-events: none;
  }
  .ed-svg .ed-svg-legend.is-active { opacity: 1; }
  /* Panel-style white box: matches the chrome's rx=3.5 rectangles and 1px
     black stroke so the legend reads as part of the editor surface rather
     than a foreign tooltip. */
  .ed-svg .ed-svg-legend-bg {
    fill: #fff;
    stroke: #000;
    stroke-width: 1;
  }
  .ed-svg .ed-svg-legend-text {
    fill: #1a1a1a;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    /* 18.5 SVG units ≈ 17 CSS px at the 1280-display / 1392-viewBox scale
       — matches the sponsor paragraph (1.0625rem = 17px). */
    font-size: 18.5px;
    font-weight: 500;
  }
`;

const newSvg = `<svg viewBox="0 0 1392 851" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="ed-svg" role="img" aria-label="Interactive illustration of the Node-RED flow editor. Hover any element for a description; drag the canvas to pan.">
  <style>${SVG_STYLES}</style>
  <defs>${defsBody}
${GRID_DEFS}
  </defs>

${flowGroup}

  <!-- Figma chrome (panels, header, tabs, status pill, sidebar tabs, outer
       frame, deploy button, etc.) - verbatim from the Figma export, with
       the flow content surgically removed and placed in .ed-canvas-pan above. -->
  <g class="ed-chrome">
    ${chrome}
  </g>

  <!-- Clean canvas border: left + top with rounded top-left corner.
       Replaces the Figma mask-fill outline which rendered too thick in
       Chromium. Drawn AFTER the chrome (and the pannable grid) so it
       always sits on top of both. -->
  <path class="ed-canvas-border"
        d="M 225 850 L 225 57 A 8 8 0 0 1 233 49 L 1391 49"
        stroke="black" stroke-width="1" fill="none"/>

  <!-- Hover overlay (transparent rects with data-label) drawn on top of the
       chrome so it captures hover events regardless of what Figma path sits
       beneath. The canvas-root pan hit area lives inside the canvas-clip
       group above (not here) so that flow nodes paint above it and remain
       hoverable. -->
  <g class="ed-overlay">
${overlayBlock}
  </g>

  <!-- In-SVG legend box, centred horizontally. Styled like a chrome panel
       (white fill, 1px black stroke, rx=3.5) so it reads as part of the
       editor surface. Width 640 fits the longest label at 18.5px without
       wrap; height 56 gives ~18 SVG units of vertical padding around the
       text. y=672 lifts it well off the canvas-controls row at y=814.
       Hidden by default; JS adds .is-active and writes the hovered
       region's label into the <text> child. pointer-events disabled
       (see SVG_STYLES) so it never blocks hover for the canvas/nodes
       it sits above. -->
  <g class="ed-svg-legend" aria-hidden="true">
    <rect class="ed-svg-legend-bg" x="376" y="672" width="640" height="56" rx="3.5"/>
    <text class="ed-svg-legend-text" x="696" y="700"
          text-anchor="middle" dominant-baseline="central">Hover an editor region</text>
  </g>
</svg>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, newSvg);
console.log(`Wrote ${OUT} (${newSvg.length} bytes)`);
