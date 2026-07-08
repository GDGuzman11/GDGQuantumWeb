/**
 * Client bridge for the DNA weapon generator. Tries the dev-only AI route first; if
 * it's absent/unavailable (production, standalone repo with no backend, offline, or no
 * API key) it degrades gracefully to the deterministic fallback generator — so the dev
 * tool always produces a coherent weapon. Returns which source produced it.
 */
import type { DesignDNA } from './dna';
import { parseWeaponBlueprint, type WeaponBlueprint } from './blueprint';
import { generateFallbackBlueprint } from './fallback';

export interface GenerateArgs {
  primary: DesignDNA;
  secondary: DesignDNA;
  existing?: string[]; // feature hashes / names to avoid
  seed?: number; // varies the fallback roll (Regenerate)
}

export interface GenerateResult {
  blueprint: WeaponBlueprint;
  source: 'ai' | 'fallback';
  note?: string;
}

/** Generate a weapon blueprint, preferring the AI route, falling back deterministically. */
export async function generateWeapon(args: GenerateArgs): Promise<GenerateResult> {
  const { primary, secondary, existing = [], seed = Date.now() } = args;
  try {
    const res = await fetch('/api/dev/weapon-gen', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ primary, secondary, existing }),
    });
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; blueprint?: unknown };
      const bp = data.ok ? parseWeaponBlueprint(data.blueprint) : null;
      if (bp) return { blueprint: bp, source: 'ai' };
    }
  } catch {
    // network/route missing — fall through to the deterministic generator
  }
  return { blueprint: generateFallbackBlueprint(primary, secondary, seed), source: 'fallback', note: 'Deterministic fallback (AI route unavailable).' };
}
