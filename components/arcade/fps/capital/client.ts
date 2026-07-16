/**
 * Client bridge for the Capital Ship generator. Tries the dev-only AI route; degrades to
 * the deterministic roll when it's absent/offline/keyless (production, standalone repo,
 * or no ANTHROPIC_API_KEY) — so the dev tool always produces a coherent, buildable ship.
 */
import type { CapitalDNAType } from './dna';
import { type CapitalSpec, fallbackCapitalSpec, parseCapitalSpec } from './spec';

export interface GenerateCapitalArgs {
  primary: CapitalDNAType;
  secondary: CapitalDNAType;
  existing?: string[]; // ship names to avoid (variety)
  seed?: number;
}
export interface GenerateCapitalResult {
  spec: CapitalSpec;
  source: 'ai' | 'fallback';
  note?: string;
}

export async function generateCapital(args: GenerateCapitalArgs): Promise<GenerateCapitalResult> {
  const seed = args.seed ?? Date.now();
  const fallback = (note?: string): GenerateCapitalResult => {
    const fb = fallbackCapitalSpec(seed);
    fb.primary = args.primary;
    fb.secondary = args.secondary;
    return { spec: fb, source: 'fallback', note };
  };
  try {
    const res = await fetch('/api/dev/capital-gen', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ primary: args.primary, secondary: args.secondary, seed, existing: args.existing ?? [] }),
    });
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; spec?: unknown };
      if (data.ok && data.spec) {
        const spec = parseCapitalSpec(data.spec, seed);
        if (spec) {
          spec.primary = args.primary;
          spec.secondary = args.secondary;
          return { spec, source: 'ai' };
        }
      }
    } else if (res.status === 503) {
      return fallback('No API key — deterministic design.');
    }
  } catch {
    /* offline / no route / production 404 → fallback below */
  }
  return fallback();
}
