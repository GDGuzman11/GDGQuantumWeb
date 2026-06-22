/**
 * Single source of truth for brand + panel metadata.
 * The "Systems" panel label is intentionally a swappable constant — change
 * SYSTEMS_LABEL here and it updates everywhere (nav, headings, etc.).
 */

export const SYSTEMS_LABEL = 'Projects' as const;

export type PanelId = 'home' | 'systems' | 'contact';

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
  description: 'A premium studio building considered digital systems.',
  panels: [
    { index: '01', label: 'Welcome', id: 'home', hash: 'home' },
    { index: '02', label: SYSTEMS_LABEL, id: 'systems', hash: 'systems' },
    { index: '03', label: 'Contact', id: 'contact', hash: 'contact' },
  ] satisfies Panel[],
} as const;

export type SiteConfig = typeof siteConfig;
