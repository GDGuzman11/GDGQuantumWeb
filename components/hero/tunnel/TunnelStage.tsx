'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDeck } from '@/components/deck/DeckContext';
import { isWhiteWorld, onWorld, toggleWorld } from '@/lib/world';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { isWebGLAvailable } from '@/lib/webgl';
import { isRevealStarted, onReveal } from '@/lib/reveal';
import { HeroBackdropFallback } from '../HeroBackdropFallback';
import { Grain } from './Grain';

/**
 * Site-wide dark backdrop host (Phase 3R full-dark) — a light DOM component that
 * imports NO three.js, so the route's First Load JS is unaffected and the <h1>
 * stays LCP.
 *
 * Phase 3R.2 (clarified) — the particle tunnel is the "hero ANIMATION", and it
 * is now SITE-WIDE: the canvas stays fully visible and running on EVERY section
 * (calm particles on About/Systems/Contact, not just Landing). It no longer
 * crossfades by the active index. The only thing that changes per-section is the
 * WARP, which the canvas drives internally from the shared dive signal as a
 * transient light-speed PULSE on the Landing↔About leg — calm at rest on every
 * page (see TunnelCanvas). This reverses the earlier "particle tunnel
 * Landing-only" decision at Gabe's request.
 *
 * The heavy particle-tunnel canvas (dynamic, ssr:false) mounts ONLY when ALL
 * gates pass: lg+ (≥1024px), motion on, WebGL available, and after the preloader
 * reveal (LCP guard). Otherwise the static dark backdrop stands in.
 */

const TunnelCanvas = dynamic(() => import('./TunnelCanvas'), { ssr: false });

export function TunnelStage() {
  const reduced = useReducedMotion(); // null until measured
  const deck = useDeck();
  // The morphing Core is Welcome-only. On lg+ desktop with motion (the only
  // path where the canvas mounts) the controlled GSAP deck keeps activeIndex
  // reliable; default to Welcome (0) if the deck isn't measured yet.
  const welcomeActive = (deck?.activeIndex ?? 0) === 0;

  const [lgUp, setLgUp] = useState(false);
  const [revealed, setRevealed] = useState(isRevealStarted());
  const [webgl, setWebgl] = useState(false);

  // Live discrete world state for the orb's `aria-pressed` / label. `onWorld`
  // fires on every eased step, but the WHITE↔dark intent flips at `toggleWorld`
  // time, so we read the discrete `isWhiteWorld()` and only re-render on the
  // enter/exit transition (ref-guarded) — never per eased frame.
  const [inWhite, setInWhite] = useState(false);
  const inWhiteRef = useRef(false);

  useEffect(() => {
    setWebgl(isWebGLAvailable());

    const unsubWorld = onWorld(() => {
      const white = isWhiteWorld();
      if (white !== inWhiteRef.current) {
        inWhiteRef.current = white;
        setInWhite(white);
      }
    });

    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setLgUp(mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange); // older Safari

    const unsub = onReveal(() => setRevealed(true));

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
      unsub();
      unsubWorld();
    };
  }, []);

  const canRenderCanvas = reduced === false && lgUp && webgl && revealed;

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        {/* SITE-WIDE dark gradient — as the world turns white the darkness DRAINS
            INTO the bust: a radial mask contracts toward screen centre (the bust)
            so the void appears to get sucked into the head. var(--world): 0 dark
            → 1 white. */}
        <div
          style={{
            WebkitMaskImage:
              'radial-gradient(circle at 50% 50%, #000 calc((1 - var(--world, 0)) * 150%), transparent calc((1 - var(--world, 0)) * 150% + 6%))',
            maskImage:
              'radial-gradient(circle at 50% 50%, #000 calc((1 - var(--world, 0)) * 150%), transparent calc((1 - var(--world, 0)) * 150% + 6%))',
          }}
        >
          <HeroBackdropFallback />
        </div>

        {/* SITE-WIDE particle tunnel — full opacity on every page, always running;
            the warp pulse (Landing↔About) lives inside the canvas, not here. */}
        {canRenderCanvas ? (
          <div className="absolute inset-0">
            <TunnelCanvas active welcomeActive={welcomeActive} />
          </div>
        ) : null}

        {/* Animated soft grain on top of both backdrop + canvas. */}
        <div style={{ opacity: 'calc(1 - var(--world, 0))' }}>
          <Grain animate opacity={0.07} />
        </div>
      </div>

      {/* Orb hotspot — clicking the Core toggles the dark⇄white world. A focusable
          DOM target over the orb (the canvas is pointer-events-none). Welcome-only
          and only when the orb is actually rendered. */}
      {canRenderCanvas && welcomeActive ? (
        <button
          id="core-hotspot"
          type="button"
          onClick={() => toggleWorld()}
          aria-pressed={inWhite}
          aria-label={inWhite ? 'Return to the dark world' : 'Enter the chrome-bust world'}
          className="pointer-events-auto fixed left-1/2 top-1/2 z-40 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      ) : null}
    </>
  );
}
