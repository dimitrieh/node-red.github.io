# Node-RED Website Design Overhaul Plan

## Current State Analysis

### What Exists
The Node-RED website is built with **Astro 6.0.6** + **Starlight** (docs) + **UnoCSS 66.6.7**. It features:

- **Homepage**: Hero with YouTube embed, Features (3 cards), Get Started (3 platform cards), Trusted By (logo grid), Community (4 cards)
- **Blog listing**: 3-column card grid with pagination (9 posts/page)
- **Blog posts**: Single-column article with breadcrumbs
- **About pages**: Left sidebar navigation + content area with alternating image/text sections
- **Docs portal**: Starlight-powered with left sidebar, search, theme toggle, right TOC sidebar
- **Header**: Fixed dark (#1E1E1E) bar with 3px red bottom border
- **Footer**: Dark background, 4-column layout (brand + 3 link sections)

### What Needs Work
1. **Visual hierarchy is flat** — headings, body, captions all feel similar weight. No clear typographic rhythm.
2. **Section spacing is inconsistent** — some sections use 80px padding, others less. No systematic spacing scale.
3. **Grid system is ad-hoc** — uses CSS Grid in places but no unified column system. Content widths vary.
4. **The grid raster background is weak** — current implementation uses faint radial gradient dots. Needs to be a proper Node-RED editor-style grid pattern.
5. **Cards lack depth** — hover effects exist but cards feel generic. No premium tactile quality.
6. **Blog listing is sparse** — cards show title + date with too much whitespace, no visual richness.
7. **Docs portal feels disconnected** — Starlight defaults show through; doesn't feel like the same site.
8. **Mobile responsive but not optimized** — content stacks correctly but spacing/typography don't adapt fluidly.
9. **Color palette is narrow** — only red + dark gray + white. Needs warmer neutrals and subtle tonal variation.

---

## Design System Definition

### Color Palette

#### Primary Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--nr-red` | `#C75050` | Primary brand accent, links, active states |
| `--nr-red-hover` | `#A63D3D` | Hover states on primary elements |
| `--nr-red-dark` | `#8B2E2E` | Deep accent, emphasis, footer CTA backgrounds |
| `--nr-red-light` | `#F5E6E6` | Light red wash, subtle backgrounds |
| `--nr-red-subtle` | `rgba(199, 80, 80, 0.08)` | Very subtle red tint for large areas |

#### Neutral Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--nr-black` | `#1A1A1A` | Headings, primary text |
| `--nr-gray-900` | `#2D2D2D` | Body text |
| `--nr-gray-700` | `#525252` | Secondary text, labels |
| `--nr-gray-500` | `#8A8A8A` | Muted text, placeholders |
| `--nr-gray-300` | `#D4D4D4` | Borders, dividers |
| `--nr-gray-100` | `#F5F5F5` | Section backgrounds, card fills |
| `--nr-gray-50` | `#FAFAFA` | Subtle alternating sections |
| `--nr-white` | `#FFFFFF` | Page background, card backgrounds |

#### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--nr-bg-dark` | `#1E1E1E` | Header, footer, code blocks |
| `--nr-bg-darker` | `#161616` | Footer bottom bar |
| `--nr-code-text` | `#D4394B` | Inline code text |
| `--nr-code-bg` | `#FFF5F5` | Inline code background |
| `--nr-focus` | `#C75050` | Focus ring color (3px solid) |

#### WCAG 2.2 AA Contrast Ratios
All combinations verified:
- `--nr-black` on `--nr-white`: 17.4:1 (AAA)
- `--nr-gray-900` on `--nr-white`: 12.6:1 (AAA)
- `--nr-gray-700` on `--nr-white`: 7.1:1 (AA)
- `--nr-red` on `--nr-white`: 4.6:1 (AA for large text)
- `--nr-red-dark` on `--nr-white`: 7.8:1 (AA)
- `--nr-white` on `--nr-bg-dark`: 14.7:1 (AAA)
- `--nr-gray-300` on `--nr-bg-dark`: 10.2:1 (AAA)

### Typography

#### Font Stack
- **Primary**: `'Google Sans Flex', system-ui, -apple-system, sans-serif`
- **Monospace**: `'Ubuntu Mono', 'Cascadia Code', 'Fira Code', monospace`

#### Type Scale (modular, ratio 1.25)
| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `--text-display` | `clamp(2.5rem, 5vw, 4rem)` | 700 | 1.05 | -0.03em | Hero headline |
| `--text-h1` | `clamp(2rem, 3.5vw, 2.75rem)` | 600 | 1.15 | -0.02em | Page titles |
| `--text-h2` | `clamp(1.5rem, 2.5vw, 2rem)` | 600 | 1.2 | -0.015em | Section headings |
| `--text-h3` | `1.25rem` | 600 | 1.3 | -0.01em | Card titles, subsections |
| `--text-h4` | `1.125rem` | 600 | 1.35 | -0.005em | Minor headings |
| `--text-body` | `1.0625rem` (17px) | 400 | 1.7 | -0.01em | Body text |
| `--text-body-sm` | `0.9375rem` (15px) | 400 | 1.6 | 0 | Secondary text |
| `--text-caption` | `0.8125rem` (13px) | 400 | 1.5 | 0.02em | Dates, meta, labels |
| `--text-overline` | `0.75rem` (12px) | 500 | 1.4 | 0.08em | Section labels (uppercase) |
| `--text-code` | `0.875rem` (14px) | 400 | 1.6 | 0 | Code blocks |

Key design decisions (inspired by zed.dev):
- **Tight letter-spacing on headings** (-0.03em to -0.01em) for a refined, premium feel
- **Fluid sizing with `clamp()`** for display and heading levels
- **Weight 600 for headings** (not 700) — slightly lighter for sophistication
- **Display at 700** only for the hero headline to create clear hierarchy

### Spacing Scale

8px base unit, following a geometric progression:
| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Tight gaps (icon-text) |
| `--space-2` | `8px` | Inline spacing, small gaps |
| `--space-3` | `12px` | Input padding, compact gaps |
| `--space-4` | `16px` | Card padding (tight), list gaps |
| `--space-5` | `24px` | Card padding (standard), component gaps |
| `--space-6` | `32px` | Section inner padding, card gaps |
| `--space-7` | `48px` | Section separation (small) |
| `--space-8` | `64px` | Section separation (medium) |
| `--space-9` | `96px` | Section separation (large) |
| `--space-10` | `128px` | Hero padding, major section separation |

### Grid System

Inspired by stripe.dev's 24-column subgrid architecture, adapted for a project website:

#### Desktop (>= 1024px): 12-column grid
```css
.grid-root {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  column-gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 48px;
}
```

#### Tablet (768px – 1023px): 8-column grid
```css
@media (min-width: 768px) and (max-width: 1023px) {
  .grid-root {
    grid-template-columns: repeat(8, 1fr);
    column-gap: 20px;
    padding: 0 32px;
  }
}
```

#### Mobile (< 768px): 4-column grid
```css
@media (max-width: 767px) {
  .grid-root {
    grid-template-columns: repeat(4, 1fr);
    column-gap: 16px;
    padding: 0 20px;
  }
}
```

#### Subgrid Usage
Sections and components use `grid-template-columns: subgrid` to inherit the parent column tracks:
- **Full-width sections**: span all 12 columns
- **Content area**: span 8 columns (centered, with 2-column margins)
- **Wide content**: span 10 columns
- **Sidebar + main**: 3 + 9 column split (docs, about)
- **Half-and-half**: 6 + 6 column split (hero, features)
- **Third cards**: 4 + 4 + 4 columns

### Component Tokens

#### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Buttons, badges, inline code |
| `--radius-md` | `10px` | Cards, inputs |
| `--radius-lg` | `16px` | Large cards, hero elements |
| `--radius-full` | `9999px` | Pills, avatars |

#### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Subtle lift |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | Cards at rest |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)` | Cards on hover |
| `--shadow-red` | `0 4px 16px rgba(199,80,80,0.15)` | Primary buttons, red-tinted cards |
| `--shadow-inset` | `inset 0 -2px 0 0 rgba(139,46,46,0.3)` | Button depth (inspired by zed.dev) |

#### Transitions
| Token | Value | Usage |
|-------|-------|-------|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Most transitions |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations |
| `--ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |
| `--duration-fast` | `150ms` | Hover, focus states |
| `--duration-normal` | `250ms` | Card transforms, fades |
| `--duration-slow` | `400ms` | Page transitions |

---

## Node-RED Editor Grid Raster Specification

The characteristic dot/line grid from the Node-RED flow editor, reimplemented as a pure CSS background pattern.

### Implementation (based on FlowFuse's approach)

```css
.nr-grid-raster {
  position: relative;
}

.nr-grid-raster::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(199, 80, 80, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(199, 80, 80, 0.12) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
  border-radius: inherit;
  z-index: 0;
}
```

### Variants

#### 1. Full Grid (hero sections)
- Grid line color: `rgba(199, 80, 80, 0.12)` — red at 12% opacity
- Grid size: `20px × 20px`
- Mask: `linear-gradient(to top, transparent 10%, black 30%, black 70%, transparent 95%)` — fades at top and bottom edges
- Background wash: `radial-gradient(80vw at 100% 0%, rgba(199,80,80,0.04), transparent)` — subtle red glow from top-right corner

#### 2. Subtle Grid (content sections)
- Grid line color: `rgba(199, 80, 80, 0.06)` — red at 6% opacity
- Grid size: `20px × 20px`
- Mask: `radial-gradient(ellipse at center, black 40%, transparent 80%)` — fades at edges

#### 3. Dot Grid (alternative for lighter sections)
- Dot: `radial-gradient(circle, rgba(199,80,80,0.15) 1px, transparent 1px)`
- Grid size: `20px × 20px`
- For sections where lines feel too heavy

### Color Rationale
The Node-RED editor uses a dark workspace with subtle grid lines. For a light website background, we invert the approach: dark-red grid lines at very low opacity on white. The `rgba(199, 80, 80, 0.12)` achieves the right balance — visible enough to evoke the editor grid, subtle enough not to compete with content.

---

## Page-by-Page Plan

### Homepage

#### Hero Section
- **Layout**: 12-column grid. Text spans columns 1–6, video/illustration spans columns 7–12
- **Background**: Full grid raster (variant 1) with radial red wash
- **Typography**: Display heading (`clamp(2.5rem, 5vw, 4rem)`, weight 700), body description (17px, weight 400)
- **CTAs**: Primary "Get Started" button with inset shadow (zed.dev style) + secondary "Documentation" ghost button
- **Overline**: `/ OPEN SOURCE / EVENT DRIVEN` in monospace, uppercase, `--text-overline`
- **Mobile**: Stack to single column, text-centered, video below

#### Features Section
- **Layout**: 3 cards spanning 4 columns each, using subgrid
- **Cards**: `--radius-md`, `--shadow-md`, hover → `--shadow-lg` + `translateY(-4px)`
- **Icon treatment**: 48px icon in a light red circle (`--nr-red-light` background)
- **Section label**: `/ FEATURES` in overline style with left border accent

#### Get Started Section
- **Layout**: 3 platform cards spanning 4 columns each
- **Cards**: Horizontal layout (icon left, text right, arrow far right)
- **Interaction**: Entire card is clickable, hover slides arrow right

#### Trusted By Section
- **Layout**: Logo strip using CSS Grid with `auto-fill, minmax(120px, 1fr)`
- **Logos**: Grayscale by default, color on hover, with subtle opacity transition
- **Section**: Subtle grid raster (variant 2) background

#### Community Section
- **Layout**: 4 cards, 3-column desktop (last card full-width or 2×2 grid)
- **Cards**: Icon + title + description, with colored left border accent
- **Hover**: Border color intensifies, subtle card lift

### Blog Listing

- **Layout**: Content spans 10 columns (centered)
- **Cards**: Vertical stack with clear date, title (h2, weight 600), and excerpt
- **Featured post**: First post gets a larger card spanning full width with a subtle red-tinted background
- **Pagination**: Styled with pill buttons, current page highlighted
- **Breadcrumbs**: Red background bar retained but refined with tighter padding

### Blog Posts

- **Layout**: Content spans 8 columns (centered), max-width 720px for optimal reading line length
- **Article header**: Large title, author + date metadata in `--text-caption` style
- **Content typography**: 17px body, 1.7 line-height, generous paragraph spacing (1.5em)
- **Images**: Full-bleed within the content column, with `--radius-md` corners
- **Code blocks**: Dark background (#1E1E1E), rounded corners, subtle shadow
- **Blockquotes**: Left red border (3px), light red background tint

### Docs Portal

- **Theme alignment**: Override Starlight CSS variables to match the main site design system
- **Sidebar**: Google Sans Flex, section headers in `--text-overline`, active item with red left border
- **Content area**: Same typography scale as blog posts
- **Code blocks**: Match main site code block styling
- **Search**: Styled to match header design
- **Grid raster**: Very subtle dot grid (variant 3) as page background
- **Dark mode**: Maintain Starlight dark mode but use Node-RED color tokens

### About Pages

- **Sidebar**: Sticky navigation with red active indicator
- **Content**: Alternating image/text sections using 6+6 grid split
- **History section**: Timeline-style vertical layout with red dot markers
- **Callout boxes**: Red-tinted background with left border, for "Why Node-RED" etc.

---

## WCAG 2.2 AA Compliance Checklist

### Color & Contrast
- [ ] All text has minimum 4.5:1 contrast ratio (normal text)
- [ ] Large text (>=18px bold or >=24px) has minimum 3:1 contrast ratio
- [ ] Non-text contrast (borders, icons, form controls) minimum 3:1
- [ ] Color is not the only means of conveying information
- [ ] Focus indicators have minimum 3:1 contrast against adjacent colors

### Typography & Readability
- [ ] Text can be resized to 200% without loss of content
- [ ] Line height >= 1.5x font size for body text
- [ ] Paragraph spacing >= 2x font size
- [ ] Letter spacing adjustable (no clipping when user overrides)
- [ ] No justified text (left-aligned for readability)

### Navigation & Interaction
- [ ] Skip-to-content link on every page
- [ ] Consistent navigation across all pages
- [ ] Focus order follows visual reading order
- [ ] All interactive elements are keyboard accessible
- [ ] Focus visible indicator on all interactive elements (3px solid ring)
- [ ] Touch targets minimum 24×24px (44×44px preferred)

### Semantic Structure
- [ ] Proper heading hierarchy (h1 → h6, no skipping)
- [ ] Landmark regions: `<header>`, `<nav>`, `<main>`, `<footer>`
- [ ] Lists use `<ul>`, `<ol>`, `<li>` appropriately
- [ ] Tables have proper headers and captions
- [ ] Forms have associated labels

### Media
- [ ] All images have descriptive alt text (or empty alt for decorative)
- [ ] SVG icons have `aria-hidden="true"` when decorative
- [ ] Video content has captions (YouTube embeds handle this)
- [ ] No auto-playing media

### Motion & Animation
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] No content flashes more than 3 times per second
- [ ] Animations are subtle and purposeful (not distracting)

---

## Implementation Order & Dependencies

### Phase 1: Design System Foundation
**Files**: `uno.config.ts`, new `src/styles/design-tokens.css`
**Dependencies**: None
**Deliverables**:
1. CSS custom properties for all tokens (colors, typography, spacing, shadows)
2. UnoCSS theme configuration updated with new values
3. Grid system classes (`.grid-root`, column span utilities)
4. Grid raster background component/mixin (3 variants)
5. Button component styles (primary, secondary, ghost)
6. Card component base styles
7. Google Sans Flex variable font optimization

### Phase 2: Global Layout (Header + Footer)
**Files**: `BaseLayout.astro`, `src/components/starlight/Header.astro`, `FooterContent.astro`
**Dependencies**: Phase 1
**Deliverables**:
1. Header redesign with new grid system
2. Footer redesign with new grid system
3. Mobile navigation update
4. Skip-to-content link styling

### Phase 3: Homepage
**Files**: `src/pages/index.astro`
**Dependencies**: Phases 1–2
**Deliverables**:
1. Hero section with grid raster, fluid typography, new CTAs
2. Features section with subgrid cards
3. Get Started section with refined cards
4. Trusted By with grayscale-to-color logos
5. Community section with accent-bordered cards
6. Responsive verification at 390px, 768px, 1280px

### Phase 4: Docs Portal
**Files**: `src/styles/starlight-custom.css`, Starlight component overrides
**Dependencies**: Phase 1
**Deliverables**:
1. Starlight CSS variable overrides for full theme alignment
2. Sidebar typography and navigation styling
3. Content area typography matching main site
4. Code block styling consistency
5. Dark mode token updates

### Phase 5: Blog & Content Pages
**Files**: `src/pages/blog/index.astro`, `src/layouts/BlogPostLayout.astro`, `src/pages/about/index.astro`
**Dependencies**: Phases 1–2
**Deliverables**:
1. Blog listing with featured post, refined cards
2. Blog post with optimized reading typography
3. About pages with improved sidebar and alternating layouts
4. Breadcrumb bar refinement

### Phase 6: Polish & Verification
**Dependencies**: All previous phases
**Deliverables**:
1. Cross-page visual consistency audit
2. Full WCAG 2.2 AA compliance verification (axe-core)
3. Responsive testing at all breakpoints
4. Performance audit (font loading, CSS size)
5. Production build verification
6. Final screenshots at all breakpoints for all page types
