'use client';

import dynamic from 'next/dynamic';

/**
 * Centered Helix "Ethereal Halo" logo over the night sky. Loaded ssr:false —
 * HelixLogo renders its own transparent WebGL canvas and touches document/window,
 * so it must stay out of SSR and the route's First Load JS (its own async chunk).
 *
 * pointer-events-none: it's a decorative brand mark, not interactive.
 */
const HelixLogo = dynamic(() => import('./HelixLogo'), { ssr: false });

export function HelixMark() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <HelixLogo className="h-[min(72vmin,560px)] w-[min(72vmin,560px)]" />
    </div>
  );
}
