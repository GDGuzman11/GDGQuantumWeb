'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { isWebGLAvailable } from '@/lib/webgl';
import { isRevealStarted, onReveal } from '@/lib/reveal';
import { useDeck } from '@/components/deck/DeckContext';

/**
 * DOM host for the Projects particle-scene centerpiece — a light component that
 * imports NO three.js, so the route's First Load JS is unaffected (three stays
 * in its own async chunk via the dynamic import below).
 *
 * The heavy canvas mounts ONLY when ALL gates pass: lg+ (≥1024px), motion on,
 * WebGL available, and after the preloader reveal. Because those gates also
 * guarantee the deck is in its controlled (non-native-scroll) mode, the deck's
 * `activeIndex` is a reliable signal — we pass `active = (activeIndex === 1)` so
 * the scene animates only while Projects is the active panel and freezes (zero
 * GPU) elsewhere. Otherwise nothing renders here: the site-wide tunnel + static
 * dark backdrop already cover the panel.
 *
 * Lives behind the Projects copy (Panel `layer` slot, z-0 under the z-10 text)
 * and above the fixed site-wide tunnel.
 */

const ProjectsSceneCanvas = dynamic(() => import('./ProjectsSceneCanvas'), {
  ssr: false,
});

const PROJECTS_INDEX = 1; // Welcome 0 · Projects 1 · Contact 2

export function ProjectsSceneStage() {
  const reduced = useReducedMotion(); // null until measured
  const deck = useDeck();

  const [lgUp, setLgUp] = useState(false);
  const [revealed, setRevealed] = useState(isRevealStarted());
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    setWebgl(isWebGLAvailable());

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
    };
  }, []);

  const canRenderCanvas = reduced === false && lgUp && webgl && revealed;
  if (!canRenderCanvas) return null;

  return (
    <div aria-hidden className="absolute inset-0">
      <ProjectsSceneCanvas active={deck?.activeIndex === PROJECTS_INDEX} />
    </div>
  );
}
