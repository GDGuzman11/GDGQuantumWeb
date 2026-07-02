import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/user';
import { ArcadeGate } from '@/components/arcade/ArcadeGate';

/**
 * "Have Fun!" — STARSHELL, a '93-pixel first-person arena shooter. Its own
 * route, so the game's bundle is fully isolated from the `/` landing's First
 * Load. Login-gated (middleware + this authoritative check); ArcadeGate hydrates
 * the player's account progress before the game mounts.
 */
export const metadata: Metadata = {
  title: 'Have Fun! · STARSHELL',
  description:
    'STARSHELL — a retro first-person arena shooter by Gabe De Guzman. Pixel-93 raycaster combat: out-gun the adaptive bots across 20 levels.',
  robots: { index: false, follow: false },
  // iPhone has no web-fullscreen API — but "Add to Home Screen" launches this route
  // STANDALONE (no Safari chrome = true fullscreen). Scoped to /arcade only.
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'STARSHELL' },
};

export default async function ArcadePage() {
  if (!(await getSessionUser())) redirect('/login?next=/arcade');
  return (
    <main
      id="content"
      className="flex min-h-[100svh] w-full flex-col items-center justify-center bg-black px-3 py-6 sm:px-6"
    >
      <ArcadeGate />
    </main>
  );
}
