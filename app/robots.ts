import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

/**
 * robots.txt (App Router metadata route). Allows all crawlers and points to the
 * sitemap. The site is a single page (`/`) — the panel hashes (#home/#systems/
 * #contact) are in-page anchors, not separate crawlable URLs, so only `/` is
 * advertised.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
