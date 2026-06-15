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
 * gates pass: motion on, WebGL available, after the preloader reveal (LCP guard),
 * AND the device is "capable" (Phase 9). The capability gate replaced the hard
 * `lg+` (≥1024px) requirement so phones/tablets get signs of life too:
 *   • DESKTOP tier (≥1024px) → the full scene, unchanged (tunnel + Core +
 *     ChromeBust white-world + full cinematic post-grade).
 *   • MOBILE tier (≥360px and not low-end) → a MOBILE-TUNED scene: fewer
 *     particles, a lower-detail Core, DPR capped at 1.5, and a stripped post
 *     pipeline (small bloom only — no GodRays / ChromaticAberration / Vignette).
 *     Phase 9 (Gabe follow-up): the dark↔white world-toggle + ChromeBust reveal
 *     now ship on mobile too, TUNED — the bust drops the stencil galaxy +
 *     ContactShadows and uses a lower-res Environment (see ChromeBust). Tapping
 *     the Core orb triggers the same world-flip the desktop gets.
 *   • Below the floor, low-end (deviceMemory < 4), reduced-motion, no-WebGL, or
 *     pre-reveal → the static dark backdrop stands in (no canvas, no orb).
 */

const TunnelCanvas = dynamic(() => import('./TunnelCanvas'), { ssr: false });

type Tier = 'desktop' | 'mobile' | null;

export function TunnelStage() {
  const reduced = useReducedMotion(); // null until measured
  const deck = useDeck();

  const [lgUp, setLgUp] = useState(false);
  const [aboveFloor, setAboveFloor] = useState(false);
  const [lowEnd, setLowEnd] = useState(false);
  const [revealed, setRevealed] = useState(isRevealStarted());
  const [webgl, setWebgl] = useState(false);
  // On the MOBILE tier the GSAP deck is inactive (native scroll), so
  // `deck.activeIndex` never updates and can't gate the Welcome-only Core.
  // Track it from the scroll position instead so the orb still fades out once
  // the visitor scrolls past the hero (keeps it from sitting behind Projects /
  // Contact content).
  const [mobileWelcome, setMobileWelcome] = useState(true);

  // Live discrete world state for the orb's `aria-pressed` / label. `onWorld`
  // fires on every eased step, but the WHITE↔dark intent flips at `toggleWorld`
  // time, so we read the discrete `isWhiteWorld()` and only re-render on the
  // enter/exit transition (ref-guarded) — never per eased frame.
  const [inWhite, setInWhite] = useState(false);
  const inWhiteRef = useRef(false);

  useEffect(() => {
    setWebgl(isWebGLAvailable());

    // Low-end heuristic: very memory-constrained phones get the static backdrop
    // even though WebGL exists, so we never ship a tuned scene that can't hold
    // CWV on them. `deviceMemory` is Chromium-only and coarse (rounded down to
    // 0.25/0.5/1/2/4/8); when absent (Safari/Firefox) we don't penalise — the
    // DPR cap + reduced scene keep those safe.
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof mem === 'number' && mem < 4) setLowEnd(true);

    const unsubWorld = onWorld(() => {
      const white = isWhiteWorld();
      if (white !== inWhiteRef.current) {
        inWhiteRef.current = white;
        setInWhite(white);
      }
    });

    // Two breakpoints: the desktop tier (≥1024px → full scene) and the capable
    // floor (≥360px → mobile-tuned scene). Below the floor → static backdrop.
    const mqLg = window.matchMedia('(min-width: 1024px)');
    const mqFloor = window.matchMedia('(min-width: 360px)');
    const onChange = () => {
      setLgUp(mqLg.matches);
      setAboveFloor(mqFloor.matches);
    };
    onChange();
    if (mqLg.addEventListener) {
      mqLg.addEventListener('change', onChange);
      mqFloor.addEventListener('change', onChange);
    } else {
      mqLg.addListener(onChange); // older Safari
      mqFloor.addListener(onChange);
    }

    // Mobile Welcome tracking (native scroll): orb on while within ~the first
    // viewport, off below. rAF-throttled, passive — negligible cost.
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setMobileWelcome(window.scrollY < window.innerHeight * 0.6),
      );
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const unsub = onReveal(() => setRevealed(true));

    return () => {
      if (mqLg.removeEventListener) {
        mqLg.removeEventListener('change', onChange);
        mqFloor.removeEventListener('change', onChange);
      } else {
        mqLg.removeListener(onChange);
        mqFloor.removeListener(onChange);
      }
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      unsub();
      unsubWorld();
    };
  }, []);

  // Capability tier (Phase 9). Desktop ≥1024px → full scene; ≥360px and not
  // low-end → mobile-tuned scene; otherwise the static dark backdrop.
  const tier: Tier =
    reduced === false && webgl && revealed && !lowEnd
      ? lgUp
        ? 'desktop'
        : aboveFloor
          ? 'mobile'
          : null
      : null;
  const canRenderCanvas = tier !== null;
  const mobile = tier === 'mobile';

  // The morphing Core is Welcome-only. On the desktop deck `activeIndex` is
  // reliable; on the mobile tier it isn't (native scroll), so use the
  // scroll-derived flag there.
  const welcomeActive = mobile ? mobileWelcome : (deck?.activeIndex ?? 0) === 0;

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
            <TunnelCanvas active welcomeActive={welcomeActive} mobile={mobile} />
          </div>
        ) : null}

        {/* Animated soft grain on top of both backdrop + canvas. */}
        <div style={{ opacity: 'calc(1 - var(--world, 0))' }}>
          <Grain animate opacity={0.07} />
        </div>
      </div>

      {/* Orb hotspot — clicking/tapping the Core toggles the dark⇄white world. A
          focusable DOM target over the orb (the canvas is pointer-events-none).
          Welcome-only and only when the orb is actually rendered. Phase 9 (Gabe
          follow-up): the world-flip → ChromeBust reveal now ships on the MOBILE
          tier too (TUNED — see ChromeBust), so the hotspot renders on BOTH tiers.
          It's gated to `canRenderCanvas` (the bust path is active whenever the
          canvas mounts), so a tap always does something — never a dead tap. */}
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
