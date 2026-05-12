import { defineConfig, presetWind, presetIcons } from 'unocss';

export default defineConfig({
  presets: [
    presetWind(),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  theme: {
    colors: {
      nr: {
        red: '#C75050',
        'red-hover': '#A63D3D',
        'red-dark': '#8B2E2E',
        'red-light': '#F5E6E6',
        'red-subtle': 'rgba(199, 80, 80, 0.06)',
        black: '#1A1A1A',
        'bg-dark': '#1E1E1E',
        'bg-darker': '#161616',
        'bg-light': '#f5f5f5',
        'bg-content': '#fff',
        text: '#2D2D2D',
        'text-muted': '#525252',
        'text-secondary': '#8A8A8A',
        'text-light': '#f0f0f0',
        link: '#C75050',
        'code-text': '#D4394B',
        'code-bg': '#FFF5F5',
        border: '#E5E5E5',
        'border-light': '#F0F0F0',
      },
    },
    fontFamily: {
      sans: ['Google Sans Flex', 'system-ui', '-apple-system', 'sans-serif'],
      heading: ['Google Sans Flex', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['Ubuntu Mono', 'Cascadia Code', 'Fira Code', 'monospace'],
    },
    breakpoints: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1200px',
      '2xl': '1440px',
    },
  },
  shortcuts: {
    'nr-breadcrumbs': 'bg-nr-red min-h-[50px] flex items-center',
    'nr-breadcrumbs-inner': 'max-w-[1200px] mx-auto px-5 w-full text-white font-heading text-[16px] flex list-none',
    'nr-breadcrumbs-link': 'text-white no-underline hover:underline hover:text-white',
    'nr-section-heading': 'border-b-3 border-nr-red pb-3',
  },
});
