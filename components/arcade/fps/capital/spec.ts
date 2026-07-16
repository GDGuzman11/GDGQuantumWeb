/**
 * CAPITAL SPEC — the full "Star Destroyer" design the AI route returns: the model-driving
 * DNA fields (a CapitalSpec IS-A CapitalDNA, so buildCapital takes it directly) PLUS the
 * cinematic text blocks from the Capital Ship prompt's OUTPUT section (lore, engineering,
 * arrival, weapons, audio, deployment…). `parseCapitalSpec` validates + clamps whatever
 * the model returned back into a coherent, buildable ship.
 */
import type { CapitalDNA } from './dna';
import { BRIDGES, DNA_TYPES, HULLS, rollCapitalDNA } from './dna';

export interface CapitalSpec extends CapitalDNA {
  lore?: string;
  silhouette?: string;
  engineering?: string;
  arrival?: string;
  weapons?: string;
  audio?: string;
  deployment?: string;
  departure?: string;
  whyUnique?: string;
}

const clampInt = (v: unknown, lo: number, hi: number, d: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : d;
};
const colorInt = (v: unknown, d: number): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.min(0xffffff, Math.round(v)));
  if (typeof v === 'string') {
    const n = parseInt(v.replace('#', ''), 16);
    if (Number.isFinite(n)) return Math.max(0, Math.min(0xffffff, n));
  }
  return d;
};
const str = (v: unknown, d: string): string => (typeof v === 'string' && v.trim() ? v.trim() : d);
function oneOf<T>(v: unknown, arr: readonly T[], d: T): T {
  return (arr as readonly unknown[]).includes(v) ? (v as T) : d;
}

/** Validate + clamp a raw AI object (or anything) into a buildable CapitalSpec. Missing
 *  or out-of-range fields fall back to a deterministic roll of the same seed. */
export function parseCapitalSpec(raw: unknown, seed: number): CapitalSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const base = rollCapitalDNA(seed);
  return {
    seed,
    primary: oneOf(o.primary, DNA_TYPES, base.primary),
    secondary: oneOf(o.secondary, DNA_TYPES, base.secondary),
    name: str(o.name, base.name),
    classification: str(o.classification, base.classification),
    hull: oneOf(o.hull, HULLS, base.hull),
    bridge: oneOf(o.bridge, BRIDGES, base.bridge),
    length: clampInt(o.length, 110, 200, base.length),
    engines: clampInt(o.engines, 2, 6, base.engines),
    turrets: clampInt(o.turrets, 4, 18, base.turrets),
    bays: clampInt(o.bays, 1, 4, base.bays),
    accent: colorInt(o.accent, base.accent),
    body: colorInt(o.body, base.body),
    lore: str(o.lore, ''),
    silhouette: str(o.silhouette, ''),
    engineering: str(o.engineering, ''),
    arrival: str(o.arrival, ''),
    weapons: str(o.weapons, ''),
    audio: str(o.audio, ''),
    deployment: str(o.deployment, ''),
    departure: str(o.departure, ''),
    whyUnique: str(o.whyUnique, ''),
  };
}

/** A spec straight from the deterministic roll (the fallback / offline path). */
export function fallbackCapitalSpec(seed: number): CapitalSpec {
  return { ...rollCapitalDNA(seed), lore: '', engineering: '', arrival: '', weapons: '', audio: '', deployment: '', departure: '', whyUnique: '' };
}
