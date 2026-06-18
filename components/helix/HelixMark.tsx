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

export function HelixMark({ className }: { className?: string }) {
  return (
    <div
      className={[
        'pointer-events-none aspect-square w-[min(46vmin,400px)]',
        className ?? '',
      ].join(' ')}
    >
      <HelixLogo className="h-full w-full" />
    </div>
  );
}
