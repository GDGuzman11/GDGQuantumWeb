/**
 * WEAPON ARCHETYPES — Apex-quality engineering concepts. Each archetype composes the
 * `kit.ts` modules into a full, richly-detailed gun with a SIGNATURE moving mechanism +
 * seeded proportion/detail variation. Every Outlander gun maps to one archetype by
 * CATEGORY + SEED (see `buildOutlanderGun`), tinted to its own colour — so all 355 guns
 * reach the hand-crafted premium tier while sharing engineering concepts within families.
 *
 * Phase 1: 2 archetypes per category (12). Expanded toward ~26-30 in later phases.
 */
import * as THREE from 'three';
import type { WeaponCategory } from '../weapons';
import { COL, box, coneZ, cylZ, grip, metal, model } from './parts';
import {
  armorPlates,
  beltFeed,
  bipod,
  biomechCore,
  coilAccelerator,
  containmentRing,
  crystalCluster,
  drumMag,
  energyCell,
  gatlingBarrels,
  gripTrigger,
  hydraulicRams,
  type Kit,
  muzzleAt,
  opticHousing,
  railPair,
  reactorCore,
  scanBar,
  siegeTube,
  stockAssembly,
  tendrils,
  ventedShroud,
} from './kit';

export type Archetype = (k: Kit) => THREE.Group;

// ── ASSAULT ──────────────────────────────────────────────────────────────────────
/** Magnetic-rail reactor: exposed reactor feeding twin rails, counter-rotating rings. */
function railReactorAR(k: Kit): THREE.Group {
  const len = 0.5 + k.r() * 0.12;
  const parts: THREE.Object3D[] = [box(0.16, 0.15, 0.34, k.gun, 0, 0, 0.06)];
  parts.push(...reactorCore(k, 0, 0.01, 0.07, 0.9));
  parts.push(...railPair(k, len, -0.3));
  parts.push(containmentRing(k, 0.082, -0.12), containmentRing(k, 0.068, -0.28, 6));
  parts.push(...armorPlates(k, 0.05), ...opticHousing(k, 0.16, 0.02), ...energyCell(k, 0, -0.17, 0.1));
  parts.push(...gripTrigger(k, 0.2), ...stockAssembly(k, 'strut', 0.36));
  parts.push(scanBar(k, 0, 0.075, -0.5, -0.1, 1.8, 0.03, 0.02), muzzleAt(-0.3 - len / 2 - 0.04, 0.03));
  return model(parts);
}
/** Exposed hydraulics: heavy receiver, twin rams, spinning pump flywheel. */
function hydraulicAR(k: Kit): THREE.Group {
  const parts: THREE.Object3D[] = [box(0.17, 0.16, 0.42, metal(COL.burntSteel, k.tier), 0, 0, 0.05), cylZ(0.03, 0.5 + k.r() * 0.1, k.dark, 0, 0.02, -0.3)];
  parts.push(box(0.1, 0.1, 0.1, k.steel, 0, 0.02, -0.53));
  parts.push(...hydraulicRams(k));
  const mag = box(0.09, 0.2, 0.13, k.dark, 0, -0.16, 0.1);
  mag.name = 'mag';
  parts.push(mag, ...opticHousing(k, 0.14, 0.05), ...gripTrigger(k, 0.2), ...stockAssembly(k, 'solid', 0.34), muzzleAt(-0.6));
  return model(parts);
}

// ── ALIEN ASSAULT ─────────────────────────────────────────────────────────────────
/** Biomech organic: living core, tendrils, twin bio-prongs. */
function biomechAR(k: Kit): THREE.Group {
  const parts: THREE.Object3D[] = [...biomechCore(k, 0.02)];
  const prongL = cylZ(0.02, 0.34, k.dark, -0.045, 0.02, -0.32);
  const prongR = cylZ(0.02, 0.34, k.dark, 0.045, 0.02, -0.32);
  prongL.rotation.y = 0.1;
  prongR.rotation.y = -0.1;
  parts.push(prongL, prongR, ...tendrils(k, 4, -0.05));
  parts.push(grip(0.06, 0.14, 0.07, k.dark, 0, -0.12, 0.14), muzzleAt(-0.5, 0.02));
  return model(parts);
}
/** Crystalline rifter: dark carapace, glowing crystal shards, coil accelerator. */
function crystalAR(k: Kit): THREE.Group {
  const parts: THREE.Object3D[] = [box(0.12, 0.12, 0.36, metal(0x2a2438, k.tier), 0, 0, 0.04)];
  parts.push(...crystalCluster(k, 0.02), ...coilAccelerator(k, 0.36, -0.28));
  parts.push(grip(0.06, 0.14, 0.07, k.dark, 0, -0.12, 0.14), ...stockAssembly(k, 'skeleton', 0.32), muzzleAt(-0.5, 0.03));
  return model(parts);
}

// ── MACHINE GUN ────────────────────────────────────────────────────────────────────
/** Gatling rotary: spinning barrel cluster, drum feed, cooling shroud, bipod. */
function gatlingMG(k: Kit): THREE.Group {
  const parts: THREE.Object3D[] = [box(0.16, 0.15, 0.34, k.body, 0, 0, 0.12)];
  parts.push(gatlingBarrels(k, 6, 0.05, 0.5 + k.r() * 0.1, -0.3));
  parts.push(...drumMag(k, 0, -0.14, 0.12, 1.2), ...bipod(k, -0.34), ...gripTrigger(k, 0.22), ...stockAssembly(k, 'solid', 0.34));
  parts.push(muzzleAt(-0.62, 0.03));
  return model(parts);
}
/** Belt-fed reactor: exposed reactor, spilling ammo belt, heavy vented barrel. */
function beltReactorMG(k: Kit): THREE.Group {
  const parts: THREE.Object3D[] = [box(0.18, 0.16, 0.42, k.gun, 0, 0, 0.06), cylZ(0.045, 0.54, k.dark, 0, 0.01, -0.36)];
  parts.push(...reactorCore(k, 0, 0.01, 0.08, 0.8), ...beltFeed(k, 0.12, -0.12, 0.1), ...ventedShroud(k, -0.2, 0.24));
  parts.push(...bipod(k, -0.42), ...gripTrigger(k, 0.2), ...stockAssembly(k, 'strut', 0.36), muzzleAt(-0.66));
  return model(parts);
}

// ── SNIPER ──────────────────────────────────────────────────────────────────────────
/** Magnetic rail long: long twin rails + rear capacitor, big scope. */
function railSniper(k: Kit): THREE.Group {
  const len = 0.72 + k.r() * 0.14;
  const parts: THREE.Object3D[] = [box(0.09, 0.1, 0.5, k.gun, 0, 0, 0.08)];
  parts.push(...railPair(k, len, -0.5), ...reactorCore(k, 0, 0.02, 0.28, 0.6), ...opticHousing(k, 0.13, 0.02, true));
  parts.push(...gripTrigger(k, 0.22), ...stockAssembly(k, 'strut', 0.4));
  parts.push(scanBar(k, 0.06, 0.072, -0.85, -0.15, 1.4, 0.02, 0.02), muzzleAt(-0.5 - len / 2 - 0.03, 0.03));
  return model(parts);
}
/** Coil precision: long barrel wrapped in accelerator coils + energy core, big scope. */
function coilSniper(k: Kit): THREE.Group {
  const len = 0.74 + k.r() * 0.14;
  const parts: THREE.Object3D[] = [box(0.08, 0.09, 0.52, k.body, 0, 0, 0.08)];
  parts.push(...coilAccelerator(k, len, -0.5), ...opticHousing(k, 0.13, 0.04, true));
  const core = box(0.05, 0.05, 0.13, k.hot, 0, 0.02, 0.16);
  core.name = 'glow';
  parts.push(core, ...gripTrigger(k, 0.24), ...stockAssembly(k, 'solid', 0.4), muzzleAt(-0.5 - len / 2 - 0.03, 0.03));
  return model(parts);
}

// ── RPG ──────────────────────────────────────────────────────────────────────────────
/** Siege-tube reactor: fat tube, reactor deck, containment ring, warhead glow. */
function siegeReactorRPG(k: Kit): THREE.Group {
  const parts: THREE.Object3D[] = [...siegeTube(k, 0.088 + k.r() * 0.02)];
  parts.push(...reactorCore(k, 0, 0.11, 0.02, 0.55), containmentRing(k, 0.11, -0.12, 8));
  parts.push(...opticHousing(k, 0.16, -0.02), grip(0.06, 0.15, 0.08, k.dark, 0, -0.15, 0.06), muzzleAt(-0.42));
  return model(parts);
}
/** Triple-barrel: three launch tubes, glowing warhead tips, rear exhaust. */
function tripleBarrelRPG(k: Kit): THREE.Group {
  const parts: THREE.Object3D[] = [];
  for (const off of [0, -0.06, 0.06] as const) {
    parts.push(cylZ(0.05, 0.52, k.body, off, off === 0 ? 0.05 : -0.03, 0));
    parts.push((() => { const m = coneZ(0.02, 0.055, 0.12, k.hot, off, off === 0 ? 0.05 : -0.03, -0.3); m.name = 'glow'; return m; })());
  }
  parts.push(coneZ(0.13, 0.06, 0.14, k.dark, 0, 0, 0.32), box(0.06, 0.05, 0.14, k.dark, 0, -0.06, -0.04));
  parts.push(grip(0.06, 0.15, 0.08, k.dark, 0, -0.16, 0.06), ...opticHousing(k, 0.14, 0), muzzleAt(-0.4));
  return model(parts);
}

// ── HANDGUN ────────────────────────────────────────────────────────────────────────
/** Energy slide: compact slide, glowing chamber, coil-wrapped barrel. */
function energySlideHG(k: Kit): THREE.Group {
  const len = 0.2 + k.r() * 0.06;
  const parts: THREE.Object3D[] = [box(0.05, 0.075, len, metal(COL.steel, k.tier), 0, 0.03, -0.02), cylZ(0.02, 0.08, k.dark, 0, 0.035, -len * 0.7)];
  const chamber = box(0.035, 0.04, len * 0.5, k.hot, 0, 0.02, 0);
  chamber.name = 'glow';
  for (let i = 0; i < 3; i++) parts.push((() => { const m = cylZ(0.03, 0.012, k.glow, 0, 0.035, -len * 0.4 - i * 0.05, 12); m.name = 'coil'; return m; })());
  parts.push(chamber, grip(0.05, 0.14, 0.06, k.dark, 0, -0.08, 0.06));
  const mag = box(0.035, 0.1, 0.04, k.dark, 0, -0.08, 0.06);
  mag.name = 'mag';
  parts.push(mag, scanBar(k, 0, 0.06, -len * 0.6, len * 0.2, 2.6, 0.02, 0.02), muzzleAt(-len * 0.9, 0.035));
  return model(parts);
}
/** Heavy revolver: spinning cylinder, heavy frame + barrel. */
function revolverHG(k: Kit): THREE.Group {
  const parts: THREE.Object3D[] = [box(0.055, 0.07, 0.2, k.body, 0, 0.02, -0.02), cylZ(0.024, 0.14, k.dark, 0, 0.03, -0.14)];
  const cyl = new THREE.Group();
  cyl.name = 'spin';
  cyl.position.set(0, 0.02, 0.02);
  const drum = cylZ(0.045, 0.06, k.steel, 0, 0, 0, 6);
  cyl.add(drum);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cyl.add((() => { const m = cylZ(0.008, 0.062, k.glow, Math.cos(a) * 0.028, Math.sin(a) * 0.028, 0); m.name = 'glow'; return m; })()); }
  parts.push(cyl, grip(0.055, 0.15, 0.07, k.dark, 0, -0.09, 0.05), muzzleAt(-0.22, 0.03));
  return model(parts);
}

/** Archetypes available per category (Phase 1: 2 each; expands later). */
export const ARCHETYPES: Record<WeaponCategory, Archetype[]> = {
  assault: [railReactorAR, hydraulicAR],
  alienAssault: [biomechAR, crystalAR],
  mg: [gatlingMG, beltReactorMG],
  sniper: [railSniper, coilSniper],
  rpg: [siegeReactorRPG, tripleBarrelRPG],
  handgun: [energySlideHG, revolverHG],
};
