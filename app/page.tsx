import { NightSky } from '@/components/sky/NightSky';

/**
 * GDG site — REBUILD (started 2026-06-13).
 *
 * The previous cinematic snap-deck frontend (preloader, GSAP Observer deck,
 * particle tunnel, Projects showcase, Contact panel) has been retired from the
 * page; the rebuild starts from a clean black night sky. The backend + security
 * (contact Server Action, Prisma, email, CSP/headers) remain intact for re-wiring
 * as the new design takes shape.
 *
 * Step 1: a calm, sparkling night sky with faint, randomly-shaped distant
 * galaxies (see components/sky/NightSky).
 */
export default function Home() {
  return (
    <main
      id="content"
      className="relative h-[100svh] w-full overflow-hidden bg-black"
    >
      <NightSky />
    </main>
  );
}
