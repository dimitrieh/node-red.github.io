# Team Activity Log

Each teammate appends a one-line entry at every commit and major decision.

Format: `<ISO-timestamp> <role>: <message>`

---

2026-05-12T18:50Z orchestrator: protocol drafted, 5 teammates to be dispatched in parallel
2026-05-12T19:05Z orchestrator: 5 teammates dispatched (ux, architecture, a11y, parity, devil) in background
2026-05-12T19:05Z orchestrator: ENVIRONMENT NOTE — this ARM64 sandbox has 16KB page size; Pagefind's bundled jemalloc crashes with "Unsupported system page size". `npx astro build` completes page generation (216 HTMLs in dist/) but exits non-zero at the Pagefind step. WORKAROUND: ignore the Pagefind crash; pages are generated and `npx astro preview --host 0.0.0.0 --port <yourport>` works. Architecture teammate: please track an upstream fix (Pagefind / jemalloc 4KB-only) but don't block on solving it locally. Other teammates: treat `npx astro build` exit-0 through page generation, not through Pagefind, as "green".
2026-05-12T19:20Z arch: astro check CLEAN — all 40 TS errors fixed (152c046). Layouts use conditional spread for description; scripts narrow undefined results; playwright/vitest configs corrected; starlight Header drops unused imports.
2026-05-12T19:25Z devil: initial report posted (devils-advocate.md). Key findings: (1) 137 versioned API docs at /docs/api/modules/v/* dropped (94 confirmed 404s); (2) homepage drops contributors gallery, npm version badge, blog feed, Stack Overflow, sponsor block, and 35 of 47 trusted-by logos; (3) PROGRESS Phase 1 "removed UnoCSS" is false — still in package.json + astro.config + uno.config.ts + footer icons; (4) Starlight Header GitHub link still points to node-red/node-red, inconsistent with main nav (PROGRESS Parity Phase 2 only half-done); (5) missing redirects for /docs/platforms/aws|azure|android and /docs/hardware/arduino. None warrant revert; ~8h to close.
2026-05-12T19:18Z devil: extra finding — /about/ landing page renders NO <h1> (about index.astro doesn't include a heading wrapper, unlike [...slug].astro). a11y or UX teammate fix.
2026-05-12T19:20Z devil: shift complete (task #6). 5 commits posted under devil: prefix. Final report covers 6 sections: steelmanning master, claim audit, hidden regressions, worth-it analysis, prioritised recs, cross-checks of observed in-flight UX dark-mode work. No code edited. At shift end, no other -report.md files were committed; only architecture's 152c046 landed. Migration verdict: net positive, premature to call "complete", ~8h closing work needed.
2026-05-12T19:23Z ux: add dark-mode design tokens + semantic surface aliases (cc70fec)
2026-05-12T19:23Z ux: improve mobile menu UX + extract breadcrumb to global (5644bf8)
2026-05-12T19:24Z ux: thread semantic tokens through about + blog post layouts (4523099)
2026-05-12T19:24Z ux: enrich blog listing cards with overline date + read CTA (1e5e78a)
2026-05-12T19:24Z ux: thread semantic tokens through homepage + tablet 2-col layouts (f1b18ef)
2026-05-12T19:30Z arch: env-gated pagefind (69a538b) — astro build now ~30s vs 8+min, all 211 pages emit, sitemap-index.xml + sitemap-0.xml present (210 URLs). Added robots.txt (481b4a2) and skipped pagefind integration tests when DISABLE_PAGEFIND=1 (543b66d). Both `npx astro check` AND `DISABLE_PAGEFIND=1 npx astro build` exit 0.
2026-05-12T19:32Z arch: UnoCSS decision — KEEP. Still required by 3 files (Header.astro, FooterContent.astro, BaseLayout.astro use bg-nr-*, i-simple-icons-*, w-5 h-5, lt-lg:). PROGRESS.md Phase 1 claim "Removed UnoCSS" is FALSE; uno.config.ts still on disk, integration still in astro.config.mjs. Documented in architecture-report.md.
2026-05-12T19:35Z devil: post-shift cross-critique of architecture-report.md committed (d446b14). Architecture report independently confirmed UnoCSS finding and surfaced a major item I missed: BaseLayout drops Twitter card + Open Graph meta tags from old Jekyll site — real social-share/SEO regression. Promoted to P0 #5 in devils-advocate.md. Critique of 5 UX commits added too: dark-mode is scope creep; no homepage content restoration yet. Two of my P2 items closed by arch (astro check + Pagefind env-gate). a11y and parity reports still pending.
