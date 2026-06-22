import { headers } from 'next/headers';
import { OrbWorld } from '@/components/world/OrbWorld';
import { Hero } from '@/components/home/Hero';
import { SocialLinks } from '@/components/home/SocialLinks';
import { SeoContent } from '@/components/home/SeoContent';
import { profile } from '@/lib/profile';
import { siteUrl } from '@/lib/site-url';

/**
 * Person / ProfilePage structured data — the biggest SEO lever for a personal
 * site (rich-result + knowledge-panel eligibility). Serialized into a JSON-LD
 * script below, stamped with the per-request CSP nonce so the strict
 * `script-src` (no unsafe-inline) allows it.
 */
const profileJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  mainEntity: {
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.jobTitle,
    description: profile.description,
    url: siteUrl,
    knowsAbout: profile.knowsAbout,
    sameAs: profile.sameAs,
  },
};

/**
 * GDG site — REBUILD (started 2026-06-13).
 *
 * One full-screen WebGL world (stars + galaxies + the Helix orb) sits behind a
 * DOM hero. Choosing About/Projects flies the single camera INTO the orb so the
 * whole screen becomes its interior (components/world + components/home/Hero).
 * The backend + security (contact Server Action, Prisma, email, CSP/headers)
 * remain intact for re-wiring as the design grows.
 */
export default function Home() {
  const nonce = headers().get('x-nonce') ?? undefined;

  return (
    <main id="content" className="relative min-h-[100svh] w-full bg-black">
      {/* Person/ProfilePage structured data (crawlers read this; nonce satisfies CSP). */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />

      {/* Crawlable, server-rendered copy of the section content (the cinematic
          interiors are client-only). Visually offscreen; fully indexable. */}
      <SeoContent />

      {/* Full-screen world: night sky + Helix orb, one camera you fly into. */}
      <OrbWorld />

      {/* Hero copy + entry points, anchored low so the orb reads above it. */}
      <section className="relative z-10 flex min-h-[100svh] flex-col items-center justify-end px-6 pb-[16vh] text-center sm:pb-[14vh]">
        <Hero />
      </section>

      {/* Social marks pinned bottom-centre (safe-area aware). */}
      <footer
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <SocialLinks />
      </footer>
    </main>
  );
}
