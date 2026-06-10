'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import { DeckProvider } from './DeckContext';
import { siteConfig } from '@/lib/site-config';
import { setDive } from '@/lib/warp';

gsap.registerPlugin(Observer);

// useLayoutEffect warns when run during SSR; this component is "use client" but
// still server-renders its markup. Fall back to useEffect on the server.
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * GSAP Observer panel deck — Phase 2 snap engine, reworked for Phase 3R's
 * DIRECTIONAL transitions.
 *
 * ONE gesture still moves EXACTLY one panel and `goToPanel(index)` is still the
 * single entry point (wheel/trackpad/touch via Observer, keyboard, nav clicks,
 * hash deep-links). What changed: the deck-mode layout is no longer a single
 * vertical translated track — panels are ABSOLUTELY STACKED (`absolute inset-0`)
 * and each transition is a GSAP timeline that slides the outgoing panel out and
 * the incoming panel in along that pair's axis:
 *
 *   0↔1 vertical (down) · 1↔2 horizontal (side) · 2↔3 vertical (up)
 *
 * The visual direction comes from the PAIR, not the gesture (a wheel-down/Up
 * Observer event maps to "next panel", whose direction is looked up). Non-
 * adjacent jumps (nav/deep-link, e.g. 0→3) animate as fast CHAINED legs so each
 * leg still reads in its own direction, with the total duration capped.
 *
 * Two fallbacks remain first-class (unchanged behaviour):
 *  1. prefers-reduced-motion → deck DISABLED: panels in normal document flow,
 *     NATIVE scroll, goToPanel() = instant scrollIntoView, no lock, no anim.
 *  2. Mobile (< MOBILE_BP) → ALSO native scroll (transform decks fight iOS
 *     Safari's toolbar + touch momentum). goToPanel() still lands nav/deep-links.
 *
 * The deck-vs-native decision is recomputed on resize/orientation and on live
 * reduce-motion toggles, rebuilding cleanly across the breakpoint.
 */

const MOBILE_BP = 768; // px — below this we use native scroll (see header)
const TRANSITION = 0.9; // s — within the 0.6–1.2s motion language
const JUMP_CAP = 1.15; // s — total cap for chained non-adjacent jumps
const EASE = 'power2.inOut'; // ease, no bounce/spin
const LOCK_BUFFER = 120; // ms added to the lock window after the tween

type Axis = 'x' | 'y';

/**
 * Per-adjacent-pair transition geometry. `fwdSign` is the percent sign the
 * INCOMING panel enters from when travelling FORWARD (increasing index):
 *   down → +y (incoming from below), side → +x (incoming from the right),
 *   up   → −y (incoming from above). Reverse travel flips the sign.
 */
const PAIR: Record<string, { axis: Axis; fwdSign: number }> = {
  '0-1': { axis: 'y', fwdSign: 1 }, // down
  '1-2': { axis: 'x', fwdSign: 1 }, // side
  '2-3': { axis: 'y', fwdSign: -1 }, // up
};

function axisProp(axis: Axis): 'xPercent' | 'yPercent' {
  return axis === 'x' ? 'xPercent' : 'yPercent';
}

function legGeometry(from: number, to: number) {
  const lo = Math.min(from, to);
  const pair = PAIR[`${lo}-${lo + 1}`] ?? { axis: 'y' as Axis, fwdSign: 1 };
  const forward = to > from;
  const enter = (forward ? pair.fwdSign : -pair.fwdSign) * 100;
  return { axis: pair.axis, enter, exit: -enter };
}

type PanelDeckProps = {
  /** The panels (one per section), rendered in deck-index order. */
  panels: ReactNode[];
  /**
   * Fixed-position chrome (TopBar, SectionNav). Rendered INSIDE the
   * DeckProvider so it can consume the deck context, but OUTSIDE the deck root
   * so it isn't clipped or transformed.
   */
  chrome?: ReactNode;
  /**
   * Fixed, full-viewport backdrop (the Landing particle-tunnel host). Rendered
   * inside the DeckProvider, behind the content (z-0), so it reads the active
   * index for its opacity crossfade.
   */
  backdrop?: ReactNode;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function PanelDeck({ panels, chrome, backdrop }: PanelDeckProps) {
  const panelCount = panels.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // activeIndex drives chrome (nav highlight / aria-current / tunnel opacity)
  // and is the source of truth for "which panel". A ref mirror lets event
  // handlers read the live value without re-binding listeners on every change.
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);

  // True while animating between panels — input is locked meanwhile.
  const lockedRef = useRef(false);
  const lockTimer = useRef<number | null>(null);

  // "deck mode" = controlled GSAP transitions. When false we're in native
  // scroll mode (reduced-motion or mobile). null until measured so SSR markup
  // is mode-agnostic and we don't flash the wrong layout.
  const [deckMode, setDeckMode] = useState<boolean | null>(null);
  const deckModeRef = useRef<boolean | null>(null);

  const panelEls = useCallback(() => panelRefs.current, []);

  const indexFromHash = useCallback((): number => {
    if (typeof window === 'undefined') return 0;
    const hash = window.location.hash.replace('#', '');
    const i = siteConfig.panels.findIndex((p) => p.hash === hash);
    return i >= 0 ? i : 0;
  }, []);

  const writeHash = useCallback((index: number) => {
    const hash = siteConfig.panels[index]?.hash;
    if (!hash) return;
    const next = `#${hash}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next);
    }
  }, []);

  // Park every panel: target at rest (0,0, on top); the rest off-screen below.
  // Used at init and after each transition so only the active panel is visible.
  const parkPanels = useCallback((target: number) => {
    panelEls().forEach((el, i) => {
      if (!el) return;
      // scale + autoAlpha are reset too (not just translate) so the dive leg's
      // scale/opacity treatment of the Landing/About panels never leaves one
      // stuck huge or invisible after the transition settles.
      if (i === target)
        gsap.set(el, { xPercent: 0, yPercent: 0, scale: 1, autoAlpha: 1, zIndex: 10 });
      else
        gsap.set(el, { xPercent: 0, yPercent: 110, scale: 1, autoAlpha: 1, zIndex: 0 });
    });
  }, [panelEls]);

  // Move focus to the active panel container (tabindex=-1) so keyboard focus is
  // never stranded — UNLESS focus is inside a form field (Contact). Scroll is
  // suppressed; the deck/native layer already positions the panel.
  const focusPanel = useCallback((index: number) => {
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        active.isContentEditable)
    ) {
      return;
    }
    const id = siteConfig.panels[index]?.id;
    if (!id) return;
    document.getElementById(id)?.focus({ preventScroll: true });
  }, []);

  // Phase 3R.2 — the Landing↔About (0↔1) "dive into the void". Replaces that
  // pair's slide with a coordinated dive: the Landing panel flies INTO the void
  // (scale up + fade) while About settles in — and the reverse on the way back —
  // and a proxy tween scrubs the shared dive signal 0→1 (or 1→0) so the WebGL
  // tunnel warps to light-speed in lock-step. Other pairs keep their slides.
  const addDiveLeg = useCallback(
    (
      tl: gsap.core.Timeline,
      a: number,
      b: number,
      at: number,
      dur: number,
      zBase: number,
    ) => {
      const els = panelEls();
      const landing = els[0];
      const about = els[1];
      if (!landing || !about) return;
      const forward = b > a; // 0→1 dive in; 1→0 pull back out
      const outEl = forward ? landing : about; // the panel we're leaving
      const inEl = forward ? about : landing; // the panel we're arriving at

      // The "dive into the void" is carried by the particle WARP (the tunnel
      // pulses to light-speed); the panels just hand off cleanly underneath it.
      // STAGGER them so they're NEVER both at full opacity (which read as a muddy
      // double-exposure of both headlines): the outgoing panel scales + fades out
      // over the first ~55% as the warp builds, the incoming fades in over the
      // last ~60% as it settles. The bright mid-dive particles cover the gap.
      tl.set(outEl, { xPercent: 0, yPercent: 0, scale: 1, autoAlpha: 1, zIndex: zBase + 1 }, at);
      tl.set(inEl, { xPercent: 0, yPercent: 0, scale: 1.08, autoAlpha: 0, zIndex: zBase }, at);
      tl.to(outEl, { scale: 1.35, autoAlpha: 0, duration: dur * 0.55, ease: 'power2.in' }, at);
      tl.to(inEl, { scale: 1, autoAlpha: 1, duration: dur * 0.6, ease: 'power2.out' }, at + dur * 0.4);

      // Scrub the shared dive signal in lock-step; the shader turns it into a
      // light-speed PULSE (peaks mid-dive, calm at both ends).
      const proxy = { d: forward ? 0 : 1 };
      tl.to(
        proxy,
        {
          d: forward ? 1 : 0,
          duration: dur,
          ease: 'power1.inOut',
          onUpdate: () => setDive(proxy.d),
        },
        at,
      );
    },
    [panelEls],
  );

  /**
   * THE single entry point. Clamps, respects the input lock, and dispatches to
   * either the directional GSAP transition or a native instant jump per mode.
   */
  const goToPanel = useCallback(
    (index: number, opts?: { immediate?: boolean }) => {
      const target = Math.max(0, Math.min(panelCount - 1, index));

      // Native mode (reduced-motion or mobile): instant scrollIntoView, no lock.
      if (deckModeRef.current === false) {
        activeRef.current = target;
        setActiveIndex(target);
        writeHash(target);
        setDive(target === 0 ? 0 : 1);
        document
          .getElementById(siteConfig.panels[target].id)
          ?.scrollIntoView({ behavior: 'auto' });
        return;
      }

      if (deckModeRef.current !== true) return;
      if (lockedRef.current) return;
      const from = activeRef.current;
      if (target === from) return;

      // Commit active state at the START so chrome + tunnel opacity begin their
      // crossfade in sync with the move.
      activeRef.current = target;
      setActiveIndex(target);
      writeHash(target);

      // Immediate (deep-link land): no animation, just park on target.
      if (opts?.immediate) {
        parkPanels(target);
        setDive(target === 0 ? 0 : 1);
        focusPanel(target);
        return;
      }

      const dir = target > from ? 1 : -1;
      const legs: Array<[number, number]> = [];
      for (let i = from; i !== target; i += dir) legs.push([i, i + dir]);
      const legDur =
        legs.length === 1
          ? TRANSITION
          : Math.min(TRANSITION, JUMP_CAP / legs.length);

      lockedRef.current = true;
      if (lockTimer.current) window.clearTimeout(lockTimer.current);

      const tl = gsap.timeline({
        onComplete: () => {
          lockedRef.current = false;
          parkPanels(target);
          setDive(target === 0 ? 0 : 1);
          focusPanel(target);
        },
      });

      legs.forEach(([a, b], idx) => {
        const els = panelEls();
        const incoming = els[b];
        const outgoing = els[a];
        if (!incoming || !outgoing) return;
        const at = idx * legDur;

        // Landing↔About (0↔1) gets the cinematic dive instead of a slide.
        if (Math.min(a, b) === 0 && Math.max(a, b) === 1) {
          addDiveLeg(tl, a, b, at, legDur, 20 + idx);
          return;
        }

        const { axis, enter, exit } = legGeometry(a, b);
        const p = axisProp(axis);

        // Place the incoming panel at its enter offset (other axis zeroed) and
        // stack it above the outgoing one; each chained leg sits higher.
        tl.set(incoming, { xPercent: 0, yPercent: 0, [p]: enter, zIndex: 20 + idx }, at);
        tl.set(outgoing, { zIndex: 19 + idx }, at);
        tl.to(incoming, { [p]: 0, duration: legDur, ease: EASE }, at);
        tl.to(outgoing, { [p]: exit, duration: legDur, ease: EASE }, at);
      });

      // Belt-and-braces lock release in case onComplete is ever pre-empted.
      lockTimer.current = window.setTimeout(
        () => {
          lockedRef.current = false;
        },
        legs.length * legDur * 1000 + LOCK_BUFFER,
      );
    },
    [panelCount, writeHash, focusPanel, parkPanels, panelEls, addDiveLeg],
  );

  const goToRef = useRef(goToPanel);
  goToRef.current = goToPanel;

  // ---- Mode setup + GSAP Observer lifecycle ----------------------------------
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let observer: Observer | null = null;
    let ctx: gsap.Context | null = null;

    const computeMode = () =>
      !prefersReducedMotion() && window.innerWidth >= MOBILE_BP;

    const teardown = () => {
      observer?.kill();
      observer = null;
      ctx?.revert(); // clears inline transforms GSAP set on the panels
      ctx = null;
    };

    const buildDeck = () => {
      deckModeRef.current = true;
      setDeckMode(true);

      ctx = gsap.context(() => {
        parkPanels(activeRef.current); // honours deep-link start panel
        setDive(activeRef.current === 0 ? 0 : 1);

        observer = Observer.create({
          target: window,
          type: 'wheel,touch,pointer',
          onUp: () => goToRef.current(activeRef.current + 1),
          onDown: () => goToRef.current(activeRef.current - 1),
          wheelSpeed: -1, // natural: wheel-down => onUp => next panel
          tolerance: 10,
          preventDefault: true,
          lockAxis: true,
        });
      }, root);
    };

    const buildNative = () => {
      deckModeRef.current = false;
      setDeckMode(false);
      setDive(activeRef.current === 0 ? 0 : 1);
      document
        .getElementById(siteConfig.panels[activeRef.current].id)
        ?.scrollIntoView({ behavior: 'auto' });
    };

    const init = () => {
      activeRef.current = indexFromHash();
      setActiveIndex(activeRef.current);
      if (computeMode()) buildDeck();
      else buildNative();
    };

    init();

    let resizeRaf = 0;
    const onResize = () => {
      window.cancelAnimationFrame(resizeRaf);
      resizeRaf = window.requestAnimationFrame(() => {
        const shouldDeck = computeMode();
        if (shouldDeck !== (deckModeRef.current === true)) {
          teardown();
          if (shouldDeck) buildDeck();
          else buildNative();
        } else if (shouldDeck) {
          // Same mode — re-pin positions (percent transforms are resolution-
          // independent, so this is mostly belt-and-braces).
          parkPanels(activeRef.current);
        }
      });
    };

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMqChange = () => onResize();

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (mq.addEventListener) mq.addEventListener('change', onMqChange);
    else mq.addListener(onMqChange);

    return () => {
      window.cancelAnimationFrame(resizeRaf);
      if (lockTimer.current) window.clearTimeout(lockTimer.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (mq.removeEventListener) mq.removeEventListener('change', onMqChange);
      else mq.removeListener(onMqChange);
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Keyboard --------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
        return;
      }

      let handled = true;
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          goToRef.current(activeRef.current + 1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          goToRef.current(activeRef.current - 1);
          break;
        case 'Home':
          goToRef.current(0);
          break;
        case 'End':
          goToRef.current(panelCount - 1);
          break;
        case ' ':
          goToRef.current(activeRef.current + (e.shiftKey ? -1 : 1));
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelCount]);

  // ---- Hash deep-links + back/forward ---------------------------------------
  useEffect(() => {
    const onHashOrPop = () => {
      const i = indexFromHash();
      if (i !== activeRef.current) goToRef.current(i);
    };
    window.addEventListener('hashchange', onHashOrPop);
    window.addEventListener('popstate', onHashOrPop);
    return () => {
      window.removeEventListener('hashchange', onHashOrPop);
      window.removeEventListener('popstate', onHashOrPop);
    };
  }, [indexFromHash]);

  const ctxValue = useMemo(
    () => ({ activeIndex, goToPanel, panelCount, deckMode }),
    [activeIndex, goToPanel, panelCount, deckMode],
  );

  const isDeck = deckMode === true;

  return (
    <DeckProvider value={ctxValue}>
      {chrome}
      {backdrop}
      <div
        ref={rootRef}
        className={
          isDeck
            ? 'fixed inset-0 z-10 overflow-hidden overscroll-none'
            : 'relative z-10 w-full'
        }
      >
        <main
          id="content"
          className={isDeck ? 'relative h-[100svh] w-full' : 'relative w-full'}
        >
          {panels.map((panel, i) => (
            <div
              key={siteConfig.panels[i]?.id ?? i}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              className={
                isDeck
                  ? 'absolute inset-0 h-[100svh] w-full will-change-transform'
                  : 'relative w-full'
              }
            >
              {panel}
            </div>
          ))}
        </main>
      </div>
    </DeckProvider>
  );
}
