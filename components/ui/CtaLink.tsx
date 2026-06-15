'use client';

import Link from 'next/link';
import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { siteConfig } from '@/lib/site-config';
import { useDeck } from '@/components/deck/DeckContext';

type CtaLinkProps = {
  href: string;
  children: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'children'>;

/**
 * Primary call-to-action: accent-coloured label with a hairline underline
 * that thickens to the accent on hover/focus. Hand-built primitive — no
 * external UI kit. Animation is restrained (colour/underline only); the
 * GSAP underline-draw lands in Phase 3.
 *
 * Phase 2: when this CTA points at an in-page panel hash (e.g. `#contact`)
 * and a deck is present, the click is routed through the deck's `goToPanel()`
 * — the single input entry point — instead of letting Next's router do a
 * native scrollIntoView. That native jump would scroll the `overflow-hidden`
 * deck root programmatically, desyncing the GSAP track transform and the
 * active index (no slide, stuck nav indicator, compounding offset on later
 * clicks). The href is kept on the element so the CTA stays real,
 * deep-linkable, and keyboard/screen-reader friendly (same rationale as
 * TopBar). If there's no deck (pre-mount / no provider) or the href isn't a
 * panel hash, the native `<Link>` behaves exactly as before.
 */
export function CtaLink({
  href,
  children,
  className = '',
  onClick,
  ...rest
}: CtaLinkProps) {
  const deck = useDeck();

  // Resolve an in-page panel hash (e.g. "#contact") to its panel index.
  const panelIndex = href.startsWith('#')
    ? siteConfig.panels.findIndex((panel) => panel.hash === href.slice(1))
    : -1;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Compose, don't clobber: honour a caller-supplied onClick first.
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Only intercept when a deck exists AND the href is a real panel hash.
    if (!deck || panelIndex < 0) return; // else: native anchor / Link behaviour
    e.preventDefault();
    deck.goToPanel(panelIndex);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={[
        'group inline-flex min-h-[44px] items-center gap-2 font-sans text-sm uppercase tracking-[0.18em] text-accent',
        'transition-colors duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg',
        className,
      ].join(' ')}
      {...rest}
    >
      <span className="relative pb-1">
        {children}
        <span
          aria-hidden
          data-cta-underline
          className="absolute inset-x-0 bottom-0 h-px bg-hairline transition-colors duration-300 ease-out group-hover:bg-accent group-focus-visible:bg-accent"
        />
      </span>
      <span
        aria-hidden
        className="translate-x-0 transition-transform duration-300 ease-out group-hover:translate-x-1"
      >
        &rarr;
      </span>
    </Link>
  );
}
