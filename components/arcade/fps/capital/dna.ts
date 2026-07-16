/**
 * CAPITAL SHIP DNA — the "Star Destroyer" generator genome. A seeded roll produces a
 * CapitalDNA spec (PRIMARY 70% / SECONDARY 30% doctrine, per the Capital Ship prompt)
 * that drives the procedural ship in model.ts: silhouette, command-tower placement,
 * engine/turret/bay counts, colours, and a generated name + classification.
 *
 * Deterministic given the seed → a design can be baked + assigned to a level (like the
 * campaign map seeds). Zero-asset: this only picks numbers; the geometry is procedural.
 */
import { rng } from '../rand';

export type CapitalDNAType =
  | 'heavyIndustrial'
  | 'orbitalSiege'
  | 'livingFortress'
  | 'machineCathedral'
  | 'carrier'
  | 'deepSpaceHunter'
  | 'executionVessel'
  | 'voidFortress'
  | 'mobileFactory'
  | 'gravaticManipulator';

export type HullShape = 'blade' | 'slab' | 'spine' | 'trident' | 'cathedral';
export type BridgePos = 'fore' | 'aft' | 'dorsal' | 'spinal';

export interface CapitalDNA {
  seed: number;
  primary: CapitalDNAType;
  secondary: CapitalDNAType;
  name: string;
  classification: string;
  hull: HullShape;
  bridge: BridgePos;
  length: number; // world units (map is ~200 → ~quarter of the sky)
  engines: number;
  turrets: number;
  bays: number;
  accent: number; // faction glow colour
  body: number; // hull colour
}

export const DNA_TYPES: CapitalDNAType[] = ['heavyIndustrial', 'orbitalSiege', 'livingFortress', 'machineCathedral', 'carrier', 'deepSpaceHunter', 'executionVessel', 'voidFortress', 'mobileFactory', 'gravaticManipulator'];
export const HULLS: HullShape[] = ['blade', 'slab', 'spine', 'trident', 'cathedral'];
export const BRIDGES: BridgePos[] = ['fore', 'aft', 'dorsal', 'spinal'];
const ACCENTS = [0xff3a48, 0xff7a2a, 0x49a6ff, 0xb15cff, 0x63ff84, 0xffc24a, 0x7fe8ff];
const BODIES = [0x2a2f38, 0x33383f, 0x3a3a44, 0x2e3a45, 0x44403a, 0x2f3a36];
const PRE = ['Iron', 'Void', 'Ash', 'Grave', 'Storm', 'Black', 'Dread', 'Siege', 'Wrath', 'Null', 'Cinder', 'Doom', 'Rust', 'Pale'];
const SUF = ['maw', 'crown', 'spire', 'fist', 'hymn', 'reaver', 'warden', 'harbinger', 'sovereign', 'requiem', 'colossus', 'bastion', 'gallows', 'anvil'];
const CLASS_BY_DNA: Record<CapitalDNAType, string> = {
  heavyIndustrial: 'Siege Dreadnought',
  orbitalSiege: 'Bombardment Platform',
  livingFortress: 'Fortress Hulk',
  machineCathedral: 'Cathedral-Class',
  carrier: 'Deployment Carrier',
  deepSpaceHunter: 'Hunter-Killer',
  executionVessel: 'Execution Barge',
  voidFortress: 'Void Bastion',
  mobileFactory: 'Forgeship',
  gravaticManipulator: 'Gravitic Manipulator',
};

/** Roll a deterministic CapitalDNA from a seed. */
export function rollCapitalDNA(seed: number): CapitalDNA {
  const r = rng(seed ^ 0xca9);
  const pick = <T>(a: T[]): T => a[Math.floor(r() * a.length)];
  const primary = pick(DNA_TYPES);
  let secondary = pick(DNA_TYPES);
  if (secondary === primary) secondary = DNA_TYPES[(DNA_TYPES.indexOf(primary) + 1) % DNA_TYPES.length];
  return {
    seed,
    primary,
    secondary,
    name: `${pick(PRE)}${pick(SUF)}`,
    classification: CLASS_BY_DNA[primary],
    hull: pick(HULLS),
    bridge: pick(BRIDGES),
    length: 130 + Math.floor(r() * 60),
    engines: 2 + Math.floor(r() * 4),
    turrets: 6 + Math.floor(r() * 10),
    bays: 1 + Math.floor(r() * 3),
    accent: pick(ACCENTS),
    body: pick(BODIES),
  };
}
