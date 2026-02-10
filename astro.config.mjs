// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

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
          autogenerate: { directory: 'docs/getting-started' },
        },
        {
          label: 'User Guide',
          autogenerate: { directory: 'docs/user-guide' },
        },
        {
          label: 'Creating Nodes',
          autogenerate: { directory: 'docs/creating-nodes' },
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'docs/api' },
        },
        {
          label: 'Developing Flows',
          autogenerate: { directory: 'docs/developing-flows' },
        },
        {
          label: 'Developing',
          autogenerate: { directory: 'docs/developing' },
        },
        {
          label: 'Tutorials',
          autogenerate: { directory: 'docs/tutorials' },
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
            href: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Roboto+Slab:wght@400;700&family=Ubuntu+Mono&display=swap',
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
  },
});
