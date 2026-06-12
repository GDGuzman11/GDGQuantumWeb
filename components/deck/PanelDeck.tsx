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
 * and EVERY transition is the cinematic light-speed "dive into the void" warp
 * (see `addDiveLeg`): the outgoing panel scales up + fades into the void while
 * the incoming panel settles in, and the WebGL particle tunnel pulses to
 * light-speed in lock-step. This applies to every leg (Welcome↔Projects and
 * Projects↔Contact). Non-adjacent jumps (nav/deep-link, e.g. 0→2) animate as
 * fast CHAINED warp legs, with the total duration capped.
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
const LOCK_BUFFER = 120; // ms added to the lock window after the tween

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

  // The live GSAP Observer (deck mode only). Held in a ref so `lockDeck` can
  // disable/enable it from outside the build effect (e.g. when the Projects
  // case study expands full-screen and needs to trap its own scroll).
  const observerRef = useRef<Observer | null>(null);
  // True while a full-screen overlay has frozen section navigation.
  const expandedRef = useRef(false);

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

  // The cinematic "dive into the void" warp — now the transition for EVERY leg
  // (Welcome↔Projects and Projects↔Contact), in either direction. The outgoing
  // panel (`els[a]`) flies INTO the void (scale up + fade) while the incoming
  // panel (`els[b]`) settles in, and a proxy tween scrubs the shared dive signal
  // 0→1 so the WebGL tunnel pulses to light-speed in lock-step. Because the
  // shader reads the pulse as `sin(dive·π)`, a 0→1 scrub gives a clean
  // calm→light-speed→calm pulse REGARDLESS of travel direction — symmetric, so
  // the same scrub serves both forward and reverse.
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
      const outEl = els[a]; // the panel we're leaving
      const inEl = els[b]; // the panel we're arriving at
      if (!outEl || !inEl) return;

      // The dive is carried by the particle WARP (the tunnel pulses to
      // light-speed); the panels just hand off cleanly underneath it. STAGGER
      // them so they're NEVER both at full opacity (which reads as a muddy
      // double-exposure): the outgoing panel scales + fades out over the first
      // ~55% as the warp builds, the incoming fades in over the last ~60% as it
      // settles. The bright mid-dive particles cover the gap.
      tl.set(outEl, { xPercent: 0, yPercent: 0, scale: 1, autoAlpha: 1, zIndex: zBase + 1 }, at);
      tl.set(inEl, { xPercent: 0, yPercent: 0, scale: 1.08, autoAlpha: 0, zIndex: zBase }, at);
      tl.to(outEl, { scale: 1.35, autoAlpha: 0, duration: dur * 0.55, ease: 'power2.in' }, at);
      tl.to(inEl, { scale: 1, autoAlpha: 1, duration: dur * 0.6, ease: 'power2.out' }, at + dur * 0.4);

      // Scrub the shared dive signal 0→1; the shader turns it into a light-speed
      // PULSE (peaks mid-dive, calm at both ends). Reset to 0 (rest) on complete.
      const proxy = { d: 0 };
      tl.to(
        proxy,
        {
          d: 1,
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
      // A full-screen overlay (Projects case study) has frozen navigation.
      if (expandedRef.current) return;
      const target = Math.max(0, Math.min(panelCount - 1, index));

      // Native mode (reduced-motion or mobile): instant scrollIntoView, no lock.
      if (deckModeRef.current === false) {
        activeRef.current = target;
        setActiveIndex(target);
        writeHash(target);
        setDive(0);
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
        setDive(0);
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
          setDive(0);
          focusPanel(target);
        },
      });

      // Every leg is the cinematic warp dive; chained legs stack progressively.
      legs.forEach(([a, b], idx) => {
        addDiveLeg(tl, a, b, idx * legDur, legDur, 20 + idx);
      });

      // Belt-and-braces lock release in case onComplete is ever pre-empted.
      lockTimer.current = window.setTimeout(
        () => {
          lockedRef.current = false;
        },
        legs.length * legDur * 1000 + LOCK_BUFFER,
      );
    },
    [panelCount, writeHash, focusPanel, parkPanels, addDiveLeg],
  );

  const goToRef = useRef(goToPanel);
  goToRef.current = goToPanel;

  // Freeze/unfreeze section navigation for a full-screen overlay (the Projects
  // case study). Disabling the Observer is essential: it captures wheel/touch
  // on `window` with preventDefault, so without this the overlay couldn't
  // scroll internally. The `<html>` overflow lock covers native-scroll mode
  // (mobile / reduced-motion) where there's no Observer to disable.
  const lockDeck = useCallback((locked: boolean) => {
    expandedRef.current = locked;
    if (locked) observerRef.current?.disable();
    else observerRef.current?.enable();
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    setDive(0);
  }, []);

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
      observerRef.current = null;
      ctx?.revert(); // clears inline transforms GSAP set on the panels
      ctx = null;
    };

    const buildDeck = () => {
      deckModeRef.current = true;
      setDeckMode(true);

      ctx = gsap.context(() => {
        parkPanels(activeRef.current); // honours deep-link start panel
        setDive(0);

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
        observerRef.current = observer;
        // A rebuild (resize across the breakpoint) while an overlay is open must
        // keep navigation frozen — re-apply the lock to the fresh Observer.
        if (expandedRef.current) observer.disable();
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
      // Navigation is frozen while a full-screen overlay is open (its own Esc
      // handler runs independently).
      if (expandedRef.current) return;
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
      if (expandedRef.current) return;
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
    () => ({ activeIndex, goToPanel, panelCount, deckMode, lockDeck }),
    [activeIndex, goToPanel, panelCount, deckMode, lockDeck],
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
