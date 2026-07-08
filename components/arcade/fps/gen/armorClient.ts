/**
 * Client bridge for the DNA armour-set generator. Deterministic today (the fallback
 * fusion), structured async so an AI route can slot in later exactly like the weapon
 * generator without changing the screen.
 */
import type { DesignDNA } from './dna';
import type { GenDivisionId } from './divisions';
import { generateArmorSet } from './armorFallback';
import type { ArmorSetBlueprint } from './armorBlueprint';

export interface ArmorGenArgs {
  primary: DesignDNA;
  secondary: DesignDNA;
  division: GenDivisionId;
  seed?: number;
}

export interface ArmorGenResult {
  blueprint: ArmorSetBlueprint;
  source: 'ai' | 'fallback';
}

export async function generateArmorBlueprint(args: ArmorGenArgs): Promise<ArmorGenResult> {
  const blueprint = generateArmorSet(args.primary, args.secondary, args.division, args.seed ?? Date.now());
  return { blueprint, source: 'fallback' };
}
