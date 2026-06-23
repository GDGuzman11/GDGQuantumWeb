import type { Metadata } from 'next';
import { ArcadeGame } from '@/components/arcade/ArcadeGame';

/**
 * "Have Fun!" — STARSHELL arcade. Its own route, so the game's bundle is fully
 * isolated from the `/` landing's First Load (per-route code splitting). The
 * game component is a client component; its heavy engine only instantiates on
 * user action, and the canvas/loop run client-side only.
 */
export const metadata: Metadata = {
  title: 'Have Fun! · STARSHELL',
  description:
    'STARSHELL — a retro asteroid-field artillery game by Gabe De Guzman. Aim your shot, mind the wind, and out-gun the AI.',
};

export default function ArcadePage() {
  return (
    <main
      id="content"
      className="flex min-h-[100svh] w-full flex-col items-center justify-center bg-black px-3 py-6 sm:px-6"
    >
      <ArcadeGame />
    </main>
  );
}
