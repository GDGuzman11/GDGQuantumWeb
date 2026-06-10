import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Wired to CSS variables defined in app/globals.css — never hard-code hex.
        bg: 'var(--bg)',
        ink: 'var(--ink)',
        accent: 'var(--accent)',
        muted: 'var(--muted)',
        hairline: 'var(--hairline)',
      },
      fontFamily: {
        // next/font injects these CSS variables (see lib/fonts.ts).
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
