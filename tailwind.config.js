import rtlPlugin from 'tailwindcss-rtl';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ink (background) and cream (text) swap with theme via CSS vars in index.css.
        // DEFAULT supports Tailwind's /<alpha-value> syntax via rgb tuple;
        // numbered variants (50/60/80) are SEPARATE named colors that may differ
        // from a simple alpha (in light mode the cards stay solid white, not transparent grey).
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          80: 'var(--color-ink-80)',
          60: 'var(--color-ink-60)',
          50: 'var(--color-ink-50)',
        },
        cream: {
          DEFAULT: 'rgb(var(--cream-rgb) / <alpha-value>)',
          60: 'var(--color-cream-60)',
          45: 'var(--color-cream-45)',
          30: 'var(--color-cream-30)',
        },
        // Accents — sapphire/crimson stay fixed (work on both themes).
        sapphire: {
          deep: '#0E2949',
          DEFAULT: '#173D6E',
          light: '#3A7BC8',
        },
        gold: {
          // Theme-aware AND opacity-aware: bright on dark, deeper bronze on light.
          // /<alpha-value> works for text-gold/40, bg-gold/15 etc.
          dark: 'rgb(var(--gold-dark-rgb) / <alpha-value>)',
          DEFAULT: 'rgb(var(--gold-rgb) / <alpha-value>)',
          light: 'rgb(var(--gold-light-rgb) / <alpha-value>)',
          glow: 'rgba(212, 162, 76, 0.35)',
        },
        crimson: {
          dark: '#9B2D3A',
          DEFAULT: '#C44150',
        },
        // Muted Majlis-Luxe accents for category tiles
        accent: {
          sapphire: '#0F2A4D',
          royal: '#2A5A98',
          bronze: '#9B7434',
          antique: '#A8853B',
          wine: '#6E1F28',
          aubergine: '#311548',
        },
      },
      fontFamily: {
        'ar-body': ['Amiri', 'Segoe UI Arabic', 'Geeza Pro', 'Noto Naskh Arabic', 'serif'],
        'ar-ui': ['Tajawal', 'Segoe UI', 'SF Arabic', 'system-ui', 'sans-serif'],
        'en-display': ['Cormorant Garamond', 'Georgia', 'serif'],
        'en-body': ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 24px rgba(212, 162, 76, 0.35)',
        // Capped from 60px to 32px — large shadows cause expensive repaints on hover.
        'gold-glow-lg': '0 0 32px rgba(212, 162, 76, 0.5)',
        'majlis': '0 8px 32px rgba(0, 0, 0, 0.45)',
        'inset-gold': 'inset 0 0 0 1px rgba(212, 162, 76, 0.3)',
      },
      borderColor: {
        'gold-faint': 'var(--color-gold-faint)',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':       { opacity: '0.4', transform: 'scale(1.4)' },
        },
        'firework-burst': {
          '0%':   { transform: 'scale(0.2)', opacity: '0' },
          '10%':  { transform: 'scale(0.6)', opacity: '1' },
          '55%':  { transform: 'scale(2.4)', opacity: '0.95' },
          '100%': { transform: 'scale(3.6)', opacity: '0' },
        },
        'paper-fall': {
          '0%':   { transform: 'translateY(-30px) translateX(0) rotate(0deg) rotateX(0deg)', opacity: '0' },
          '8%':   { opacity: '1' },
          '90%':  { opacity: '1' },
          '100%': {
            transform:
              'translateY(720px) translateX(var(--drift, 30px)) rotate(720deg) rotateX(540deg)',
            opacity: '0',
          },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        'firework-burst': 'firework-burst 2.4s ease-out infinite',
        'paper-fall': 'paper-fall 5.5s linear infinite',
      },
    },
  },
  plugins: [
    rtlPlugin,
  ],
};
