import { OrbWorld } from '@/components/world/OrbWorld';
import { Hero } from '@/components/home/Hero';
import { SocialLinks } from '@/components/home/SocialLinks';

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
  return (
    <main id="content" className="relative min-h-[100svh] w-full bg-black">
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
