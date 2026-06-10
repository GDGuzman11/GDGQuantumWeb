import type { Metadata } from 'next';
import { inter, instrumentSerif } from '@/lib/fonts';
import { siteConfig } from '@/lib/site-config';
import './globals.css';

export const metadata: Metadata = {
  title: siteConfig.brand,
  description: siteConfig.description,
};

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
