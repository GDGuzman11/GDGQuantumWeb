'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useDeck } from '@/components/deck/DeckContext';

/**
 * Per-panel entrance reveal. Wrap a panel's content; its `[data-reveal]`
 * elements rise + fade in ONCE, the first time the panel becomes active.
 *
 * Trigger: primarily the deck's active index (DeckContext) — when
 * `activeIndex === index` the panel has been snapped to, so it reveals. An
 * IntersectionObserver is a deliberate SECOND trigger: in native-scroll mode
 * (mobile / reduced-motion fallback per the deck's design) the active index
 * isn't updated by manual scrolling, so IO ensures content still reveals when
 * the panel is scrolled into view. Whichever fires first wins; a guard makes it
 * fire exactly once (no re-trigger on revisit).
 *
 * Reduced-motion: no hide, no animation — the natural markup is the final
 * state (instant), satisfying the correctness requirement in CLAUDE.md §2.
 *
 * Content is hidden via JS only (after mount), so SSR / no-JS output stays
 * fully visible. The hide is invisible to users because non-active panels are
 * off-screen (translated out in deck mode, below the fold in native mode).
 */

type PanelRevealProps = {
  /** This panel's 0-based deck index. */
  index: number;
  children: ReactNode;
  className?: string;
};

export function PanelReveal({ index, children, className }: PanelRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const deck = useDeck();
  const activeIndex = deck?.activeIndex ?? 0;

  // Stable reveal fn shared between the IO setup and the activeIndex watcher.
  const revealRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Reduced-motion: leave everything visible; mark done so the watcher no-ops.
    if (reduced) {
      revealRef.current = () => {};
      return;
    }

    const marked = gsap.utils.toArray<HTMLElement>(
      el.querySelectorAll('[data-reveal]'),
    );
    const items = marked.length ? marked : [el];

    // Pre-hide (off-screen, so invisible to the user).
    gsap.set(items, { autoAlpha: 0, y: 28 });

    let done = false;
    let ctx: gsap.Context | null = null;

    const reveal = () => {
      if (done) return;
      done = true;
      io.disconnect();
      ctx = gsap.context(() => {
        gsap.to(items, {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.1,
        });
      }, el);
    };
    revealRef.current = reveal;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            reveal();
          }
        }
      },
      { threshold: [0, 0.35, 0.6] },
    );
    io.observe(el);

    // If the panel is already the active one at mount (e.g. a deep-link), reveal.
    if (deck && deck.activeIndex === index) reveal();

    return () => {
      io.disconnect();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Primary trigger: this panel became the active panel in the deck.
  useEffect(() => {
    if (activeIndex === index) revealRef.current();
  }, [activeIndex, index]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
