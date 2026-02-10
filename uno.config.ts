import { defineConfig, presetWind, presetIcons } from 'unocss';

export default defineConfig({
  presets: [presetWind(), presetIcons()],
  theme: {
    colors: {
      'nr-red': '#aa6767',
      'nr-red-hover': '#7F4545',
      'nr-red-dark': '#6F0808',
      'nr-breadcrumb': '#aa4444',
      'nr-toc-accent': '#B68181',
      'nr-bg-dark': '#333',
      'nr-bg-light': '#eee',
      'nr-bg-content': '#fff',
      'nr-bg-code': '#564848',
      'nr-text': '#555',
      'nr-text-muted': '#999',
      'nr-text-light': '#eee',
      'nr-link': '#aa4444',
      'nr-code-text': '#533',
      'nr-code-bg': '#F3E7E7',
    },
    fontFamily: {
      heading: ['Roboto Slab', 'serif'],
      body: ['Open Sans', 'sans-serif'],
      mono: ['Ubuntu Mono', 'monospace'],
    },
  },
});
