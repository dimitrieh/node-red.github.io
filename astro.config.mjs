// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import UnoCSS from '@unocss/astro';

import sitemap from '@astrojs/sitemap';

// Pagefind bundles jemalloc compiled for 4 KB pages; ARM64 hosts with 16 KB
// pages (e.g. the sandbox we develop in) crash with "Unsupported system page
// size". Set DISABLE_PAGEFIND=1 to skip search-index generation locally.
// Production CI on 4 KB hosts leaves this unset and gets full Pagefind.
const disablePagefind = process.env.DISABLE_PAGEFIND === '1';

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
      ...(disablePagefind ? { pagefind: false } : {}),
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
    // Top-level legacy aliases (Jekyll redirect_from)
    '/slack': 'https://nodered.org/slack',
    '/slack/': '/about/community/slack/',
    '/community/': '/about/community/',
    '/conduct/': '/about/conduct/',
    '/2019survey': '/about/community/survey/2019/',
    '/2023survey': '/about/community/survey/2023/',
    // Legacy docs/hardware/* (now /docs/getting-started/*)
    '/docs/hardware/raspberrypi': '/docs/getting-started/raspberrypi/',
    '/docs/hardware/beagleboneblack': '/docs/getting-started/beaglebone/',
    '/docs/hardware/arduino': '/docs/faq/interacting-with-arduino/',
    // Legacy docs/platforms/* (now /docs/getting-started/*)
    '/docs/platforms/docker': '/docs/getting-started/docker/',
    '/docs/platforms/docker-custom': '/docs/getting-started/docker-custom/',
    '/docs/platforms/android': '/docs/getting-started/android/',
    '/docs/platforms/aws': '/docs/getting-started/aws/',
    '/docs/platforms/azure': '/docs/getting-started/azure/',
    '/docs/platforms/bluemix': '/docs/getting-started/ibmcloud/',
    '/docs/platforms/flowforge': '/docs/getting-started/flowfuse/',
    '/docs/platforms/windows': '/docs/getting-started/windows/',
    '/docs/getting-started/flowforge': '/docs/getting-started/flowfuse/',
    // Legacy docs flat URLs (now nested under user-guide/runtime)
    '/docs/configuration': '/docs/user-guide/runtime/configuration/',
    '/docs/embedding': '/docs/user-guide/runtime/embedding/',
    '/docs/security': '/docs/user-guide/runtime/securing-node-red/',
    '/docs/writing-functions': '/docs/user-guide/writing-functions/',
    '/docs/node-red-admin': '/docs/user-guide/node-red-admin/',
    '/docs/user-guide/configuration': '/docs/user-guide/runtime/configuration/',
    '/docs/user-guide/embedding': '/docs/user-guide/runtime/embedding/',
    '/docs/user-guide/logging': '/docs/user-guide/runtime/logging/',
    // Tutorials moved from getting-started/
    '/docs/getting-started/first-flow': '/docs/tutorials/first-flow/',
    '/docs/getting-started/second-flow': '/docs/tutorials/second-flow/',
    '/docs/getting-started/adding-nodes': '/docs/user-guide/runtime/adding-nodes/',
    // Three install pages collapsed into one
    '/docs/getting-started/installation': '/docs/getting-started/local/',
    '/docs/getting-started/running': '/docs/getting-started/local/',
    '/docs/getting-started/upgrading': '/docs/getting-started/local/',
    // /docs/api/ui/* camelCase URLs are preserved natively by Starlight
    // (e.g. /docs/api/ui/autoComplete/). No redirect needed — keeping a
    // lowercase->camelCase entry would shadow the real page with a stub.
    // RSS feed moved from /feed.xml to /blog/rss/
    '/feed.xml': '/blog/rss/',
  },
});
