'use client';

import type { MouseEvent } from 'react';
import { siteConfig } from '@/lib/site-config';
import { useDeck } from '@/components/deck/DeckContext';

/**
 * Fixed top bar: hex mark + GDG QUANTUM wordmark + nav links to the four
 * panels.
 *
 * Phase 2: clicks are intercepted and routed through the deck's `goToPanel()`
 * (the single input entry point) instead of relying on the browser's native
 * anchor jump — the href is kept so the links remain real, deep-linkable, and
 * keyboard/screen-reader friendly, but in deck mode we preventDefault and let
 * the Observer deck animate. In native mode (reduced-motion / mobile) goToPanel
 * does an instant scrollIntoView. If the deck context isn't present yet
 * (pre-mount), we fall back to default anchor behaviour.
 *
 * Inline nav links hide below `md` (the numbered SectionNav handles mobile
 * wayfinding); the wordmark always remains.
 *
 * Phase 3R full-dark — the site is dark on every section, so the bar always
 * uses the dark token scope (light chrome on dark). It carries `data-theme="dark"`
 * explicitly (rather than relying on inheriting <body>'s scope) so its legibility
 * never depends on an ancestor attribute.
 */
export function TopBar() {
  const deck = useDeck();

  const handleNav =
    (index: number) => (e: MouseEvent<HTMLAnchorElement>) => {
      if (!deck) return; // no provider → native anchor jump
      e.preventDefault();
      deck.goToPanel(index);
    };

  return (
    <header data-theme="dark" className="fixed inset-x-0 top-0 z-40">
      <div className="flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16">
        <a
          href="#home"
          onClick={handleNav(0)}
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
        >
          <HexMark />
          <span className="font-sans text-sm uppercase tracking-[0.22em] text-ink transition-colors duration-500 ease-out">
            {siteConfig.brand}
          </span>
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {siteConfig.panels.map((panel, i) => (
              <li key={panel.id}>
                <a
                  href={`#${panel.hash}`}
                  onClick={handleNav(i)}
                  aria-current={deck?.activeIndex === i ? 'true' : undefined}
                  className="font-sans text-xs uppercase tracking-[0.16em] text-muted transition-colors duration-300 ease-out hover:text-ink focus-visible:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg aria-[current]:text-ink"
                >
                  {panel.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function HexMark() {
  return (
    <svg
      width="20"
      height="22"
      viewBox="0 0 20 22"
      fill="none"
      aria-hidden
      className="text-ink transition-[transform,color] duration-300 ease-out group-hover:rotate-[30deg]"
    >
      <path
        d="M10 1 18.66 6v10L10 21 1.34 16V6L10 1Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
