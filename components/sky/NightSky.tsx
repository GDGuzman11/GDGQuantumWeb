'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { isWebGLAvailable } from '@/lib/webgl';

/**
 * Full-screen night-sky host — a light DOM component that imports NO three.js,
 * so the route's First Load JS is unaffected. The heavy R3F scene (twinkling
 * starfield + faint distant galaxies) loads lazily and ONLY when WebGL is
 * available; otherwise a pure-CSS static starfield stands in.
 *
 * Reduced-motion: the WebGL scene still renders, but frozen (no twinkle/drift) —
 * a calm static sky, satisfying the motion-opt-out without going blank.
 */

const NightSkyCanvas = dynamic(() => import('./NightSkyCanvas'), { ssr: false });

export function NightSky() {
  const reduced = useReducedMotion(); // null until measured
  const [webgl, setWebgl] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWebgl(isWebGLAvailable());
    setMounted(true);
  }, []);

  const showCanvas = mounted && webgl;

  return (
    <div aria-hidden className="fixed inset-0 -z-0 bg-black">
      {/* Pure-CSS fallback: a faint static starfield (no-WebGL / pre-mount). */}
      <CssStarfield />

      {showCanvas ? (
        <div className="absolute inset-0">
          {/* reduced === true → frozen single frame; otherwise animate. */}
          <NightSkyCanvas animate={reduced !== true} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Cheap CSS-only starfield (layered radial-gradient dots). Always rendered as
 * the base layer so the sky is never a flat black rectangle even before — or
 * without — WebGL.
 */
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
