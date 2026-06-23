import { Inter, Instrument_Serif, Press_Start_2P } from 'next/font/google';

/**
 * Self-hosted via next/font (downloaded at build time, served from our origin).
 * `adjustFontFallback` defaults to true, generating a size-adjusted fallback
 * face to minimise CLS while the web font loads. Exposed as CSS variables and
 * mapped to Tailwind `font-sans` / `font-serif` in tailwind.config.ts.
 */

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', 'arial'],
});

export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-serif',
  fallback: ['Georgia', 'serif'],
});

/** Retro pixel face for the "Have Fun!" arcade (mapped to Tailwind font-pixel). */
export const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-pixel',
  fallback: ['ui-monospace', 'monospace'],
});
