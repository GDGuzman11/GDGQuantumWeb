import type { Metadata, Viewport } from 'next';
import { inter, instrumentSerif } from '@/lib/fonts';
import { siteConfig } from '@/lib/site-config';
import { siteUrl } from '@/lib/site-url';
import { profile } from '@/lib/profile';
import './globals.css';

// Identity-forward title/description so the site ranks for Gabe by name AND for
// his craft (recruiters/VCs/partners searching either). The brand still leads.
const title = `${siteConfig.brand} · ${profile.name} · AI & Full-Stack Developer`;
const description = profile.description;

export const metadata: Metadata = {
  // metadataBase makes the relative OG/Twitter image + canonical URLs absolute.
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s · ${siteConfig.brand}`,
  },
  description,
  applicationName: siteConfig.brand,
  keywords: [
    'Gabe De Guzman',
    'GDG Quantum',
    'AI developer',
    'full-stack developer',
    'Helix AI assistant',
    'local-first AI',
    'PostgreSQL',
    'Linux',
    'WebGL developer',
    'Next.js',
    'Three.js',
    'software developer portfolio',
  ],
  authors: [{ name: profile.name }],
  creator: profile.name,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'profile',
    url: '/',
    siteName: siteConfig.brand,
    title,
    description,
    // app/opengraph-image.tsx is picked up automatically; declaring it here is
    // not required, but locale + type are.
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
  manifest: '/manifest.webmanifest',
};

/**
 * Dark theme-color so the mobile browser chrome (address bar) matches the
 * full-dark site instead of flashing white. viewport is the Next 14 home for
 * themeColor (moved out of metadata).
 */
export const viewport: Viewport = {
  themeColor: '#06070a',
  colorScheme: 'dark',
  // Phase 9 — extend the layout under the notch/rounded corners so the
  // env(safe-area-inset-*) values become non-zero and our `.pad-x` /
  // `.pad-top-safe` / `.pad-bottom-safe` helpers can keep content clear of them.
  viewportFit: 'cover',
};

/**
 * Render dynamically so the per-request CSP nonce (set in middleware.ts) is
 * stamped onto Next's inline bootstrap scripts. Without this the page would be
 * statically prerendered with no nonce, and the strict `script-src` (no
 * unsafe-inline) would block hydration in production. The heavy work is in
 * static, CDN-cacheable client chunks; only this small HTML shell is per-request.
 */
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      {/* Phase 3R full-dark — the dark token scope is applied on <body> so the
          whole tree (panels, chrome, backdrop, base bg) inherits the dark tokens
          and a dark background, preventing any light flash. The particle tunnel
          remains a Landing-only centerpiece. */}
      <body data-theme="dark">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded focus:border focus:border-hairline focus:bg-bg focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:text-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
