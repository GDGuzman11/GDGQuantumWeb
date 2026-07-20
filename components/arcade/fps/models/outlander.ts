/**
 * OUTLANDER gun dispatch — every gun maps to a detailed Apex-quality ARCHETYPE
 * (`archetypes.ts`) by CATEGORY + a per-id SEED, built tinted to its own colour with
 * seeded proportion/detail variation, so all 355 guns reach hand-crafted fidelity while
 * sharing engineering concepts within families. Premium guns get an extra prestige marker.
 * The archetypes tag parts 'glow'/'coil'/'spin'/'scan'/'bob' so the existing preview +
 * viewmodel animators drive them (no animator changes).
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import type { WeaponCategory } from '../weapons';
import { ARCHETYPES } from './archetypes';
import { makeKit, type Kit } from './kit';
import { COL } from './parts';

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A gun's default hull colour by category (archetypes may override per-part). */
const BODY_BY_CATEGORY: Record<WeaponCategory, number> = {
  assault: COL.gunmetal,
  alienAssault: 0x2a2438, // dark carapace
  mg: COL.titanium,
  sniper: COL.gunmetal,
  rpg: COL.olive,
  handgun: COL.steel,
};

/** Premium prestige marker — a floating, pulsing gem above the receiver (bob + glow),
 *  placed from the gun's own bounds so it sits correctly on any size. */
function addPremiumFlair(g: THREE.Group, k: Kit): void {
  const box3 = new THREE.Box3().setFromObject(g);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.028), k.hot);
  gem.name = 'bob';
  gem.userData.bob = { amp: 0.02, speed: 2.0 };
  gem.position.set(0, box3.max.y + 0.045, (box3.min.z + box3.max.z) / 2);
  g.add(gem);
}

/** Build any Outlander gun, seeded from its id → an Apex archetype tinted to its colour. */
export function buildOutlanderGun(category: WeaponCategory, color: number, tier: RenderTier, id: string, premium = false): THREE.Group {
  const r = rng(hashId(id) ^ 0x9e3779b9);
  const list = ARCHETYPES[category];
  const arch = list[Math.floor(r() * list.length)] ?? list[0];
  const k = makeKit(color, tier, r, BODY_BY_CATEGORY[category]);
  const g = arch(k);
  if (premium) addPremiumFlair(g, k);
  return g;
}
