/**
 * Canonical public origin for SEO metadata (metadataBase, canonical URLs,
 * sitemap, robots, OG/Twitter image URLs).
 *
 * Driven by NEXT_PUBLIC_SITE_URL so it is correct once the production domain is
 * wired in Phase 7 (Vercel env). Falls back to localhost in dev. Trailing
 * slashes are trimmed so callers can safely template `${siteUrl}/path`.
 *
 * NOTE: this is a PUBLIC origin (intentionally NEXT_PUBLIC_) — it is not a
 * secret. No sensitive value is exposed here.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = 'http://localhost:3000';
  const value = raw && raw.length > 0 ? raw : fallback;
  return value.replace(/\/+$/, '');
}

export const siteUrl = resolveSiteUrl();
