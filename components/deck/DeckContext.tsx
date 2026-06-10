'use client';

import { createContext, useContext } from 'react';

/**
 * Shared state for the GSAP Observer panel deck.
 *
 * `goToPanel(index)` is the SINGLE entry point through which every input —
 * wheel/trackpad/touch (Observer), keyboard, nav clicks, and hash deep-links —
 * requests a panel change. Chrome (TopBar / SectionNav) consumes this context
 * to drive the deck on click and to read the real active index (replacing the
 * Phase 1 hash-only heuristic). The deck (PanelDeck) is the sole provider.
 */
export interface DeckContextValue {
  /** Index of the currently active panel (0-based). */
  activeIndex: number;
  /**
   * Request a transition to `index`. The deck clamps to [0, panelCount-1],
   * ignores requests during a locked transition, and honours reduced-motion /
   * mobile native-scroll fallbacks. Safe to call before the deck mounts.
   * @param opts.immediate skip the animated transition (used for deep-links).
   */
  goToPanel: (index: number, opts?: { immediate?: boolean }) => void;
  /** Total number of panels. */
  panelCount: number;
  /**
   * Which engine is live: `true` = controlled GSAP directional deck, `false` =
   * native-scroll fallback (reduced-motion / mobile), `null` = not yet measured.
   * Consumers like the tunnel backdrop use this to decide whether `activeIndex`
   * is a reliable opacity driver (it is NOT in native mode, where manual scroll
   * doesn't update the active index).
   */
  deckMode: boolean | null;
}

const DeckContext = createContext<DeckContextValue | null>(null);

export const DeckProvider = DeckContext.Provider;

/**
 * Read the deck. Returns null when used outside a provider so chrome can be
 * rendered in isolation (e.g. tests) without throwing; callers guard for null.
 */
export function useDeck(): DeckContextValue | null {
  return useContext(DeckContext);
}
