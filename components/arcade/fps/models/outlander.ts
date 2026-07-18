/**
 * OUTLANDER category gun models — one procedural silhouette per weapon CATEGORY
 * (assault / alien-assault / MG / sniper / RPG / handgun), tinted to each gun's own
 * colour (from the reference sheet). The glowing accents are named 'glow' so the
 * viewmodel animates them, and every model carries a 'muzzle' node toward −Z so the
 * colour-matched muzzle flash parks correctly. This one builder serves every
 * Outlander gun — the 10 starters now and the full roster later — so no gun falls
 * back to the placeholder box.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { COL, accent, box, coneZ, cylX, cylZ, finStack, grip, metal, model } from './parts';
import type { WeaponCategory } from '../weapons';

function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}
/** A glowing accent box named so the viewmodel pulses it. */
function glowBox(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = box(w, h, d, mat, x, y, z);
  m.name = 'glow';
  return m;
}

/** ASSAULT RIFLE — balanced human rifle: receiver + handguard + energy rail + optic. */
function buildAssault(glow: THREE.Material, tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  return model([
    box(0.09, 0.09, 0.36, body, 0, 0, 0.02), // receiver
    cylZ(0.03, 0.42, dark, 0, 0.01, -0.32), // barrel
    box(0.07, 0.07, 0.22, body, 0, 0.01, -0.2), // handguard
    glowBox(0.02, 0.02, 0.26, glow, 0, 0.062, -0.04), // dorsal energy rail
    glowBox(0.055, 0.05, 0.09, glow, 0, 0.01, 0.09), // side chamber
    (() => { const m = box(0.07, 0.18, 0.1, dark, 0, -0.15, 0.06); m.name = 'mag'; return m; })(),
    grip(0.06, 0.14, 0.07, dark, 0, -0.12, 0.16),
    box(0.06, 0.08, 0.16, body, 0, -0.01, 0.28), // stock
    glowBox(0.04, 0.035, 0.12, glow, 0, 0.09, 0.02), // optic
    muzzleAt(-0.54, 0.01),
  ]);
}

/** ALIEN ASSAULT — organic/bio-mechanical: capsule core, twin prongs, big glowing heart. */
function buildAlienAssault(glow: THREE.Material, tier: RenderTier): THREE.Group {
  const body = metal(0x2a2438, tier); // dark violet-carapace
  const dark = metal(COL.matteBlack, tier);
  const prongL = cylZ(0.02, 0.36, dark, -0.045, 0.02, -0.34);
  prongL.rotation.y = 0.12;
  const prongR = cylZ(0.02, 0.36, dark, 0.045, 0.02, -0.34);
  prongR.rotation.y = -0.12;
  const finTop = box(0.02, 0.12, 0.18, body, 0, 0.09, -0.02);
  finTop.rotation.x = 0.2;
  return model([
    (() => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 5, 12), body); m.rotation.x = Math.PI / 2; m.position.z = 0.02; return m; })(), // organic core
    prongL,
    prongR,
    finTop,
    glowBox(0.05, 0.06, 0.16, glow, 0, 0.03, -0.02), // glowing heart
    glowBox(0.03, 0.03, 0.03, glow, -0.05, 0.02, -0.16), // node
    glowBox(0.03, 0.03, 0.03, glow, 0.05, 0.02, -0.16),
    grip(0.06, 0.14, 0.07, dark, 0, -0.12, 0.14),
    muzzleAt(-0.52, 0.02),
  ]);
}

/** MACHINE GUN — heavy: big receiver, thick barrel, drum feed, glowing vents, bipod. */
function buildMG(glow: THREE.Material, tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const drum = cylX(0.11, 0.09, dark, 0, -0.11, 0.08); // side drum
  const bipodL = box(0.012, 0.16, 0.012, dark, -0.05, -0.13, -0.34);
  bipodL.rotation.x = 0.3;
  const bipodR = box(0.012, 0.16, 0.012, dark, 0.05, -0.13, -0.34);
  bipodR.rotation.x = 0.3;
  return model([
    box(0.13, 0.12, 0.44, body, 0, 0, 0.02), // heavy receiver
    cylZ(0.045, 0.54, dark, 0, 0.01, -0.42), // thick barrel
    box(0.1, 0.09, 0.24, body, 0, 0.01, -0.24), // shroud
    finStack(4, 0.045, 0.02, 0.09, dark, -0.07, 0.02, -0.2), // vent slats
    finStack(4, 0.045, 0.02, 0.09, dark, 0.07, 0.02, -0.2),
    glowBox(0.02, 0.02, 0.28, glow, 0, 0.065, -0.16), // heat rail
    drum,
    glowBox(0.02, 0.06, 0.06, glow, 0.115, -0.11, 0.08), // drum core
    bipodL,
    bipodR,
    grip(0.07, 0.15, 0.08, dark, 0, -0.14, 0.18),
    box(0.08, 0.1, 0.16, body, 0, -0.01, 0.3), // stock
    muzzleAt(-0.66, 0.01),
  ]);
}

/** SNIPER RIFLE — long slim receiver, very long barrel, big scope + energy core. */
function buildSniper(glow: THREE.Material, tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  return model([
    box(0.07, 0.08, 0.5, body, 0, 0, 0.06), // long receiver
    cylZ(0.025, 0.72, dark, 0, 0.01, -0.52), // very long barrel
    box(0.06, 0.05, 0.2, body, 0, 0.01, -0.3), // handguard
    cylZ(0.05, 0.22, dark, 0, 0.12, 0.02), // scope tube
    glowBox(0.035, 0.035, 0.02, glow, 0, 0.12, -0.09), // scope lens
    glowBox(0.05, 0.05, 0.13, glow, 0, 0.02, 0.14), // energy core
    (() => { const m = box(0.05, 0.13, 0.07, dark, 0, -0.12, 0.1); m.name = 'mag'; return m; })(),
    grip(0.05, 0.13, 0.06, dark, 0, -0.1, 0.2),
    box(0.06, 0.09, 0.2, body, 0, -0.01, 0.34), // stock
    muzzleAt(-0.86, 0.01),
  ]);
}

/** RPG — fat launch tube, rear exhaust cone, glowing warhead, sight. */
function buildRPG(glow: THREE.Material, tier: RenderTier): THREE.Group {
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  return model([
    cylZ(0.09, 0.56, body, 0, 0, 0), // launch tube
    coneZ(0.12, 0.06, 0.14, dark, 0, 0, 0.32), // rear exhaust cone
    coneZ(0.03, 0.085, 0.16, glow, 0, 0, -0.32), // glowing warhead tip
    box(0.06, 0.05, 0.14, dark, 0, -0.02, -0.06), // sight housing
    glowBox(0.03, 0.04, 0.1, glow, 0, 0.11, -0.02), // optic
    grip(0.06, 0.15, 0.08, dark, 0, -0.15, 0.06),
    box(0.05, 0.06, 0.08, dark, 0, -0.09, 0.14), // trigger group
    muzzleAt(-0.42, 0),
  ]);
}

/** HANDGUN — compact slide, short barrel, grip, energy chamber. */
function buildHandgun(glow: THREE.Material, tier: RenderTier): THREE.Group {
  const body = metal(COL.steel, tier);
  const dark = metal(COL.matteBlack, tier);
  return model([
    box(0.05, 0.07, 0.22, body, 0, 0.03, -0.02), // slide
    cylZ(0.02, 0.08, dark, 0, 0.035, -0.16), // barrel
    glowBox(0.03, 0.03, 0.07, glow, 0, 0.02, 0.03), // energy chamber
    glowBox(0.015, 0.015, 0.02, glow, 0, 0.075, -0.08), // front sight dot
    (() => { const m = grip(0.05, 0.14, 0.06, dark, 0, -0.08, 0.06); return m; })(),
    (() => { const m = box(0.035, 0.1, 0.04, dark, 0, -0.08, 0.06); m.name = 'mag'; return m; })(),
    muzzleAt(-0.22, 0.035),
  ]);
}

const CATEGORY_BUILDERS: Record<WeaponCategory, (glow: THREE.Material, tier: RenderTier) => THREE.Group> = {
  assault: buildAssault,
  alienAssault: buildAlienAssault,
  mg: buildMG,
  sniper: buildSniper,
  rpg: buildRPG,
  handgun: buildHandgun,
};

/** Build any Outlander gun from its category, tinted to its own colour. */
export function buildOutlanderGun(category: WeaponCategory, color: number, tier: RenderTier): THREE.Group {
  const glow = accent(color, tier, 1.6);
  return CATEGORY_BUILDERS[category](glow, tier);
}
