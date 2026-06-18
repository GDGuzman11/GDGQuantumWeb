import { NightSky } from '@/components/sky/NightSky';
import { Hero } from '@/components/home/Hero';
import { SocialLinks } from '@/components/home/SocialLinks';

/**
 * GDG site — REBUILD (started 2026-06-13).
 *
 * The previous cinematic snap-deck frontend (preloader, GSAP Observer deck,
 * particle tunnel, Projects showcase, Contact panel) has been retired from the
 * page; the rebuild starts from a clean black night sky. The backend + security
 * (contact Server Action, Prisma, email, CSP/headers) remain intact for re-wiring
 * as the new design takes shape.
 *
 * Landing = a calm, sparkling night sky with faint, randomly-shaped distant
 * galaxies (components/sky/NightSky), the Helix "Ethereal Halo" logo, and an
 * intro statement that doubles as the opening / About (components/home/Intro).
 */
export default function Home() {
  return (
    <main id="content" className="relative min-h-[100svh] w-full bg-black">
      <NightSky />

      <section className="relative z-10 mx-auto flex min-h-[100svh] max-w-3xl items-center justify-center px-6 py-20 text-center">
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
