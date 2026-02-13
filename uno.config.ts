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
        'bg-dark': '#1E1E1E',
        'bg-light': '#f5f5f5',
        'bg-content': '#fff',
        text: '#2D2D2D',
        'text-muted': '#6B6B6B',
        'text-light': '#f0f0f0',
        link: '#C75050',
        'code-text': '#D4394B',
        'code-bg': '#FFF5F5',
      },
    },
    fontFamily: {
      sans: ['Open Sans', 'sans-serif'],
      heading: ['Roboto Slab', 'serif'],
      mono: ['Ubuntu Mono', 'monospace'],
    },
    breakpoints: {
      sm: '480px',
      md: '768px',
      lg: '900px',
      xl: '1000px',
      '2xl': '1100px',
      '3xl': '1200px',
    },
  },
  shortcuts: {
    'nr-breadcrumbs': 'bg-nr-red min-h-[50px] flex items-center',
    'nr-breadcrumbs-inner': 'max-w-[1200px] mx-auto px-5 w-full text-white font-heading text-[16px] flex list-none',
    'nr-breadcrumbs-link': 'text-white no-underline hover:underline hover:text-white',
    'nr-card': 'bg-white rounded-lg shadow-sm transition-shadow duration-200 hover:shadow-md',
    'nr-btn': 'inline-block rounded-lg font-heading text-[15px] font-semibold no-underline transition-all duration-200',
    'nr-btn-primary': 'nr-btn bg-nr-red text-white px-6 py-2.5 shadow-[0_2px_8px_rgba(199,80,80,0.3)] hover:bg-nr-red-hover hover:shadow-[0_4px_12px_rgba(199,80,80,0.4)] hover:translate-y-[-1px] hover:no-underline',
    'nr-btn-secondary': 'nr-btn bg-white/10 text-white border-2 border-white/30 px-8 py-3.5 hover:bg-white/20 hover:border-white/50 hover:no-underline',
    'nr-section-heading': 'border-b-3 border-nr-red pb-3',
  },
});
