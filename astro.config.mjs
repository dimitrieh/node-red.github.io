// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import UnoCSS from '@unocss/astro';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://nodered.org',
  vite: {
    server: {
      allowedHosts: true,
    },
    preview: {
      allowedHosts: true,
    },
  },
  integrations: [
    UnoCSS(),
    starlight({
      title: 'Node-RED',
      logo: {
        src: './src/assets/node-red-icon.png',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/node-red/node-red' },
        { icon: 'discourse', label: 'Forum', href: 'https://discourse.nodered.org' },
      ],
      customCss: ['./src/styles/starlight-custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [{ autogenerate: { directory: 'docs/getting-started' } }],
        },
        {
          label: 'User Guide',
          items: [{ autogenerate: { directory: 'docs/user-guide' } }],
        },
        {
          label: 'Creating Nodes',
          items: [{ autogenerate: { directory: 'docs/creating-nodes' } }],
        },
        {
          label: 'API Reference',
          items: [{ autogenerate: { directory: 'docs/api' } }],
        },
        {
          label: 'Developing Flows',
          items: [{ autogenerate: { directory: 'docs/developing-flows' } }],
        },
        {
          label: 'Developing',
          items: [{ autogenerate: { directory: 'docs/developing' } }],
        },
        {
          label: 'Tutorials',
          items: [{ autogenerate: { directory: 'docs/tutorials' } }],
        },
        { label: 'FAQ', slug: 'docs/faq' },
        { label: 'Telemetry', slug: 'docs/telemetry' },
      ],
      components: {
        // Override components for Node-RED branding
        Header: './src/components/starlight/Header.astro',
        Footer: './src/components/starlight/Footer.astro',
        PageFrame: './src/components/starlight/PageFrame.astro',
      },
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            href: '/favicon.ico',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: true,
          },
        },
        {
          tag: 'link',
          attrs: {
            href: 'https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,100..900&family=Ubuntu+Mono&display=swap',
            rel: 'stylesheet',
          },
        },
      ],
    }),
    sitemap(),
  ],
  redirects: {
    '/slack': 'https://nodered.org/slack',
    '/docs/hardware/raspberrypi': '/docs/getting-started/raspberrypi',
    '/docs/hardware/beagleboneblack': '/docs/getting-started/beaglebone',
    '/docs/platforms/docker': '/docs/getting-started/docker',
    '/docs/api/ui/autocomplete': '/docs/api/ui/autoComplete',
    '/docs/api/ui/editablelist': '/docs/api/ui/editableList',
    '/docs/api/ui/searchbox': '/docs/api/ui/searchBox',
    '/docs/api/ui/treelist': '/docs/api/ui/treeList',
    '/docs/api/ui/typedinput': '/docs/api/ui/typedInput',
    '/feed.xml': '/blog/rss/',
  },
});
