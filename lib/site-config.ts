/**
 * Single source of truth for brand + panel metadata.
 * The "Systems" panel label is intentionally a swappable constant — change
 * SYSTEMS_LABEL here and it updates everywhere (nav, headings, etc.).
 */

export const SYSTEMS_LABEL = 'Systems' as const;

export type PanelId = 'home' | 'about' | 'systems' | 'contact';

export interface Panel {
  /** Two-digit display index, e.g. "01". */
  index: string;
  /** Human-readable nav label. */
  label: string;
  /** Stable identifier. */
  id: PanelId;
  /** Deep-link hash (without the leading "#"). */
  hash: PanelId;
}

export const siteConfig = {
  brand: 'GDG QUANTUM',
  description:
    'GDG Quantum — a premium studio building considered digital systems.',
  panels: [
    { index: '01', label: 'Landing', id: 'home', hash: 'home' },
    { index: '02', label: 'About', id: 'about', hash: 'about' },
    { index: '03', label: SYSTEMS_LABEL, id: 'systems', hash: 'systems' },
    { index: '04', label: 'Contact', id: 'contact', hash: 'contact' },
  ] satisfies Panel[],
} as const;

export type SiteConfig = typeof siteConfig;
