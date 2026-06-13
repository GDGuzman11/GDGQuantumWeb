import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

/**
 * Web app manifest (App Router metadata route → /manifest.webmanifest).
 * Dark theme to match the full-dark site so the install/splash chrome doesn't
 * flash light.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.brand,
    short_name: 'GDG Quantum',
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#06070a',
    theme_color: '#06070a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
