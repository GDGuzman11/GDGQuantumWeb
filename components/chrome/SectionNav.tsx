'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { siteConfig } from '@/lib/site-config';
import { useDeck } from '@/components/deck/DeckContext';

/**
 * Numbered section nav (01–04) + a vertical progress indicator.
 *
 * Phase 2: the active item now reflects the DECK's real active index (via
 * DeckContext), replacing the Phase 1 hash-only heuristic, and clicks route
 * through `goToPanel()` (the single input entry point) rather than native
 * anchor jumps. `aria-current` and the progress bar follow the active panel.
 *
 * If the deck context isn't available yet (pre-mount / isolated render) we
 * gracefully fall back to reading the URL hash so the rail still highlights
 * sensibly and links still work as plain anchors.
 *
 * Hidden on small screens (shown as a fixed rail from lg up).
 */
export function SectionNav() {
  const { panels } = siteConfig;
  const deck = useDeck();

  // Hash fallback for when there's no deck (pre-mount or no provider).
  const [hashIndex, setHashIndex] = useState(0);
  useEffect(() => {
    if (deck) return; // deck drives the active index; no need to read the hash
    const read = () => {
      const hash = window.location.hash.replace('#', '');
      const i = panels.findIndex((p) => p.hash === hash);
      if (i >= 0) setHashIndex(i);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [deck, panels]);

  const activeIndex = deck ? deck.activeIndex : hashIndex;

  const handleNav =
    (index: number) => (e: MouseEvent<HTMLAnchorElement>) => {
      if (!deck) return; // native anchor jump
      e.preventDefault();
      deck.goToPanel(index);
    };

  const progress = panels.length > 1 ? activeIndex / (panels.length - 1) : 0;

  // Phase 3R full-dark — the site is dark on every section, so the rail always
  // uses the dark token scope (light numerals/lines/progress on dark), carried
  // explicitly so legibility never depends on an ancestor attribute.
  return (
    <nav
      aria-label="Sections"
      data-theme="dark"
      className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
    >
      <ol className="flex flex-col gap-5">
        {panels.map((panel, i) => {
          const isActive = i === activeIndex;
          return (
            <li key={panel.id}>
              <a
                href={`#${panel.hash}`}
                onClick={handleNav(i)}
                aria-current={isActive ? 'true' : undefined}
                className="group flex items-center justify-end gap-3 focus-visible:outline-none"
              >
                <span
                  className={[
                    'font-sans text-[0.7rem] tracking-[0.15em] transition-colors duration-300 ease-out',
                    isActive
                      ? 'text-ink'
                      : 'text-muted group-hover:text-ink group-focus-visible:text-ink',
                  ].join(' ')}
                >
                  <span className="tabular-nums">{panel.index}</span>{' '}
                  <span
                    className={[
                      'inline-block transition-opacity duration-300 ease-out',
                      isActive
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
                    ].join(' ')}
                  >
                    {panel.label}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={[
                    'h-px transition-all duration-300 ease-out',
                    isActive
                      ? 'w-7 bg-ink'
                      : 'w-4 bg-hairline group-hover:w-7 group-hover:bg-ink group-focus-visible:w-7 group-focus-visible:bg-ink',
                  ].join(' ')}
                />
              </a>
            </li>
          );
        })}
      </ol>

      {/* Progress indicator */}
      <div className="mt-6 ml-auto h-16 w-px bg-hairline" aria-hidden>
        <div
          className="w-px bg-accent transition-[height] duration-500 ease-out"
          style={{ height: `${progress * 100}%` }}
        />
      </div>
    </nav>
  );
}
