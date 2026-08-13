export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  /**
   * Optional sub-page links rendered as a popout under the main nav
   * item. Only About uses this, and it derives the list from
   * `aboutSidebar` rather than restating it.
   */
  submenu?: NavItem[];
}

export interface AboutNavItem {
  label: string;
  href: string;
  children?: AboutNavItem[];
}

/**
 * The About section's page order — the single source of truth for both
 * the persistent rail on /about/* (`AboutSidebar.astro`) and the header's
 * about popout, which flattens this list below. They used to be two
 * hand-maintained arrays and had already drifted: neither listed
 * /about/community/slack/ or the surveys index.
 *
 * Two levels only. The 2019 / 2023 survey pages live under
 * /about/community/survey/ and are reached from the Surveys page itself;
 * listing them here would push the rail to three levels for one leaf each.
 * The page heading carries the depth instead.
 *
 * Note there is no /about/releases/ — the Jekyll site's About TOC had one,
 * but downloads now live at the top-level /releases/ page.
 */
export const aboutSidebar: AboutNavItem[] = [
  { label: 'About Node-RED', href: '/about/' },
  {
    label: 'Community',
    href: '/about/community/',
    children: [
      { label: 'Slack', href: '/about/community/slack/' },
      { label: 'Surveys', href: '/about/community/survey/' },
    ],
  },
  { label: 'Contribute', href: '/about/contribute/' },
  { label: 'Governance', href: '/about/governance/' },
  { label: 'License', href: '/about/license/' },
  { label: 'Roadmap', href: '/about/roadmap/' },
  { label: 'Code of Conduct', href: '/about/conduct/' },
  { label: 'Resources', href: '/about/resources/' },
];

export const mainNav: NavItem[] = [
  {
    label: 'about',
    href: '/about/',
    // Top level only: the popout is a flat jump list for people arriving
    // from another section. The rail owns the nesting once you're inside.
    submenu: aboutSidebar.map(({ label, href }) => ({ label, href })),
  },
  { label: 'blog', href: '/blog/' },
  { label: 'documentation', href: '/docs/' },
  { label: 'forum', href: 'https://discourse.nodered.org', external: true },
  { label: 'flows', href: 'https://flows.nodered.org', external: true },
  { label: 'github', href: 'https://github.com/node-red', external: true },
];

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/**
 * Footer columns. Four of them, because SiteFooter's grid is
 * `repeat(4, 1fr)`.
 *
 * Every destination appears exactly once. The previous version listed Forum
 * under both Project and Social, and GitHub under both Community and Social,
 * which is what made the grouping unreadable: the columns were not disjoint,
 * so there was no rule telling you which one to scan.
 *
 * The dividing line now is what kind of thing each link is, not where it
 * happens to be hosted:
 *   Project   - the software and its docs
 *   Community - places people gather and how to take part. Forum belongs
 *               here, not under Social: it is the project's main discussion
 *               venue, not a social media account.
 *   About     - what the project is, who governs it, how it is licensed
 *   Social    - accounts to follow. GitHub sits here as the org account
 *               rather than in Community, which keeps the columns balanced
 *               and leaves Contribute as Community's route into the code.
 *
 * The `About` column was titled `Resources` while also containing an item
 * called `Resources`, so the title now names the column and the item keeps
 * the page's own name.
 *
 * Typed explicitly: without the annotation, TypeScript infers a union of
 * "with external" and "without external" object shapes, and SiteFooter's
 * `link.external` access then fails to type-check.
 */
export const footerLinks: FooterColumn[] = [
  {
    title: 'Project',
    links: [
      { label: 'Download', href: '/releases/' },
      { label: 'Documentation', href: '/docs/' },
      { label: 'Blog', href: '/blog/' },
      { label: 'Flows Library', href: 'https://flows.nodered.org', external: true },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Forum', href: 'https://discourse.nodered.org', external: true },
      { label: 'Slack', href: '/about/community/slack/' },
      { label: 'Contribute', href: '/about/contribute/' },
      { label: 'Code of Conduct', href: '/about/conduct/' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'About Node-RED', href: '/about/' },
      { label: 'Governance', href: '/about/governance/' },
      { label: 'License', href: '/about/license/' },
      { label: 'Resources', href: '/about/resources/' },
    ],
  },
  {
    title: 'Social',
    links: [
      { label: 'GitHub', href: 'https://github.com/node-red', external: true },
      { label: 'Mastodon', href: 'https://social.nodered.org/@nodered', external: true },
      { label: 'X (Twitter)', href: 'https://twitter.com/nodered', external: true },
    ],
  },
];
