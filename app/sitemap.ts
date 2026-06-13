import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

/**
 * sitemap.xml (App Router metadata route).
 *
 * GDG Quantum is a single-page experience: the three panels (Welcome / Projects
 * / Contact) live at `/` and are reached by in-page hash anchors, not by
 * distinct routes. Hash fragments (`/#systems`) are NOT independent SEO URLs, so
 * the sitemap lists only the canonical `/`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
