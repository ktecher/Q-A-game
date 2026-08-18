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
        // Class names are unchanged so the ~240 existing font-ar-*/font-en-* usages
        // re-skin without edits. Handjet covers Arabic AND numerals in a pixel face;
        // Press Start 2P has no Arabic coverage so it is Latin-only.
        'ar-body': ['Handjet', 'Tajawal', 'Segoe UI Arabic', 'Geeza Pro', 'sans-serif'],
        'ar-ui': ['Handjet', 'Tajawal', 'Segoe UI', 'SF Arabic', 'sans-serif'],
        // MUST stay quoted: `2P` is not a valid CSS identifier (it starts with a
        // digit), so an unquoted `Press Start 2P` is an invalid family name and
        // the browser silently skips it — every Latin label was falling through
        // to Handjet, which is far narrower at the same px size.
        'en-body': ['"Press Start 2P"', 'Handjet', 'monospace'],
      },
      keyframes: {
        // Arcade motion — every one uses steps(), never smooth easing.
        blink: {
          '0%, 49%':   { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.45' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        pixfall: {
          '0%':   { transform: 'translateY(-40px)' },
          '100%': { transform: 'translateY(820px)' },
        },
      },
      animation: {
        blink: 'blink 1.1s steps(1) infinite',
        flash: 'flash 1.2s steps(2) infinite',
        bob: 'bob 2s steps(6) infinite',
        pixfall: 'pixfall 4.4s steps(20) infinite',
      },
    },
  },
  plugins: [
    rtlPlugin,
  ],
};
