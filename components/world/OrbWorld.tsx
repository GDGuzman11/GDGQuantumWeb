'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { isWebGLAvailable } from '@/lib/webgl';

/**
 * Full-screen unified world host (stars + galaxies + Helix orb in one canvas).
 * Light DOM wrapper that imports NO three.js; the heavy canvas loads lazily and
 * only when WebGL is available, otherwise a pure-CSS static starfield stands in.
 *
 * Reduced-motion: the scene still renders, frozen (no twinkle/drift), and the
 * dive jumps rather than flies (handled by the Hero controller).
 */
const OrbWorldCanvas = dynamic(() => import('./OrbWorldCanvas'), { ssr: false });

export function OrbWorld() {
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWebgl(isWebGLAvailable());
    setMounted(true);
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 z-0 bg-black">
      <CssStarfield />
      {mounted && webgl ? (
        <div className="absolute inset-0">
          <OrbWorldCanvas animate={reduced !== true} />
        </div>
      ) : null}
    </div>
  );
}

/** Cheap CSS-only static starfield (no-WebGL / pre-mount base layer). */
function CssStarfield() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: '#000005',
        backgroundImage: [
          'radial-gradient(1.5px 1.5px at 20% 30%, rgba(255,255,255,0.7), transparent)',
          'radial-gradient(1.5px 1.5px at 70% 65%, rgba(200,220,255,0.6), transparent)',
          'radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.5), transparent)',
          'radial-gradient(1px 1px at 85% 20%, rgba(255,245,220,0.6), transparent)',
          'radial-gradient(1px 1px at 55% 45%, rgba(255,255,255,0.5), transparent)',
          'radial-gradient(1.5px 1.5px at 10% 70%, rgba(255,255,255,0.6), transparent)',
        ].join(','),
      }}
    />
  );
}
