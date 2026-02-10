export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export const mainNav: NavItem[] = [
  { label: 'home', href: '/' },
  { label: 'about', href: '/about/' },
  { label: 'blog', href: '/blog/' },
  { label: 'documentation', href: '/docs/' },
  { label: 'forum', href: 'https://discourse.nodered.org', external: true },
  { label: 'flows', href: 'https://flows.nodered.org', external: true },
  { label: 'github', href: 'https://github.com/node-red/node-red', external: true },
];

export const footerLinks = [
  {
    title: 'Project',
    links: [
      { label: 'Documentation', href: '/docs/' },
      { label: 'Blog', href: '/blog/' },
      { label: 'Forum', href: 'https://discourse.nodered.org' },
      { label: 'Flows Library', href: 'https://flows.nodered.org' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Slack', href: '/about/community/slack/' },
      { label: 'GitHub', href: 'https://github.com/node-red/node-red' },
      { label: 'Contribute', href: '/about/contribute/' },
      { label: 'Code of Conduct', href: '/about/conduct/' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'About Node-RED', href: '/about/' },
      { label: 'Governance', href: '/about/governance/' },
      { label: 'License', href: '/about/license/' },
      { label: 'Resources', href: '/about/resources/' },
    ],
  },
];

export const aboutSidebar = [
  { label: 'About Node-RED', href: '/about/' },
  { label: 'Community', href: '/about/community/' },
  { label: 'Contribute', href: '/about/contribute/' },
  { label: 'Governance', href: '/about/governance/' },
  { label: 'License', href: '/about/license/' },
  { label: 'Releases', href: '/about/releases/' },
  { label: 'Code of Conduct', href: '/about/conduct/' },
];
