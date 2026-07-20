/**
 * WEAPON MODULE KIT — Apex-quality reusable sub-assemblies used by the archetype builders
 * (`archetypes.ts`). Each module returns richly-detailed primitive geometry, tier-aware and
 * TINTED to the gun's colour (glow = the gun's own colour), tagged so the existing preview +
 * viewmodel animators drive it:
 *   • 'glow' / 'coil'  → pulsing emissive
 *   • 'spin'           → rotating mechanism (rings, flywheels, gatling barrels)
 *   • 'scan'           → a light that travels a rail (userData.scan = {from,to,speed})
 *   • 'bob'            → a floating part (userData.bob = {amp,speed})
 *   • 'mag' / 'muzzle' → magazine tag / muzzle anchor
 * Same rules as the rest of the arsenal: primitives only, muzzle toward −Z. This mirrors the
 * hand-crafted premium.ts technique so every gun reaches that fidelity.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { COL, accent, box, coilStack, coneZ, cylX, cylZ, grip, metal, ventSlats } from './parts';

export interface Kit {
  tier: RenderTier;
  color: number;
  r: () => number;
  body: THREE.Material; // primary hull (archetype-chosen)
  gun: THREE.Material; // gunmetal
  dark: THREE.Material; // matte black
  steel: THREE.Material; // steel detail
  glow: THREE.Material; // accent emissive (gun colour)
  hot: THREE.Material; // hotter accent core
}

export function makeKit(color: number, tier: RenderTier, r: () => number, bodyCol = COL.titanium): Kit {
  return {
    tier,
    color,
    r,
    body: metal(bodyCol, tier),
    gun: metal(COL.gunmetal, tier),
    dark: metal(COL.matteBlack, tier),
    steel: metal(COL.steel, tier),
    glow: accent(color, tier, 2.0),
    hot: accent(color, tier, 2.9),
  };
}

// ── primitives / tags ───────────────────────────────────────────────────────────
export function muzzleAt(z: number, y = 0.02): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}
function g(mesh: THREE.Mesh, name: 'glow' | 'coil' = 'glow'): THREE.Mesh {
  mesh.name = name;
  return mesh;
}
/** A bright bar that travels along Z (the "laser across the chamber"). */
export function scanBar(k: Kit, x: number, y: number, from: number, to: number, speed: number, w = 0.02, h = 0.02): THREE.Mesh {
  const m = box(w, h, 0.04, k.hot, x, y, from);
  m.name = 'scan';
  m.userData.scan = { from, to, speed };
  return m;
}

// ── MODULES (each returns detailed parts) ────────────────────────────────────────

/** Exposed reactor core — armored housing + glowing cross-drum + end caps + side windows. */
export function reactorCore(k: Kit, x: number, y: number, z: number, s = 1): THREE.Object3D[] {
  return [
    box(0.18 * s, 0.18 * s, 0.28 * s, k.gun, x, y + 0.01, z),
    box(0.15 * s, 0.03 * s, 0.3 * s, k.dark, x, y + 0.11 * s, z),
    g(cylX(0.052 * s, 0.22 * s, k.hot, x, y + 0.02, z)),
    cylX(0.06 * s, 0.03 * s, k.steel, x + 0.11 * s, y + 0.02, z),
    cylX(0.06 * s, 0.03 * s, k.steel, x - 0.11 * s, y + 0.02, z),
    g(box(0.02, 0.09 * s, 0.16 * s, k.glow, x + 0.092 * s, y + 0.01, z)),
    g(box(0.02, 0.09 * s, 0.16 * s, k.glow, x - 0.092 * s, y + 0.01, z)),
  ];
}

/** A counter-rotating containment ring (octagon of bars + glow vanes), tagged 'spin'. */
export function containmentRing(k: Kit, radius: number, z: number, seg = 8): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'spin';
  grp.position.set(0, 0.02, z);
  const segLen = 2 * radius * Math.sin(Math.PI / seg) * 1.08;
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const b = box(segLen, 0.02, 0.024, k.steel, Math.cos(a) * radius, Math.sin(a) * radius, 0);
    b.rotation.z = a + Math.PI / 2;
    grp.add(b);
  }
  for (const a of [0, 2.2, 4.3]) grp.add(g(box(0.018, 0.05, 0.02, k.hot, Math.cos(a) * radius, Math.sin(a) * radius, 0)));
  return grp;
}

/** Twin magnetic rails + glowing conduits flanking a center barrel. */
export function railPair(k: Kit, len: number, z: number): THREE.Object3D[] {
  return [
    cylZ(0.024, len, k.dark, 0, 0.03, z),
    box(0.022, 0.032, len * 0.9, k.steel, 0.06, 0.05, z + 0.04),
    box(0.022, 0.032, len * 0.9, k.steel, -0.06, 0.05, z + 0.04),
    g(box(0.01, 0.012, len * 0.85, k.glow, 0.06, 0.072, z + 0.04), 'coil'),
    g(box(0.01, 0.012, len * 0.85, k.glow, -0.06, 0.072, z + 0.04), 'coil'),
  ];
}

/** Exposed hydraulics — twin cylinders + piston rods + glowing fluid + a spinning flywheel. */
export function hydraulicRams(k: Kit): THREE.Object3D[] {
  const fw = new THREE.Group();
  fw.name = 'spin';
  fw.position.set(0.1, -0.01, 0.16);
  fw.add(cylZ(0.062, 0.03, k.steel, 0, 0, 0, 8));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    fw.add(g(box(0.022, 0.05, 0.036, k.hot, Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.005)));
  }
  return [
    cylZ(0.046, 0.3, k.steel, 0.088, 0.07, -0.08),
    cylZ(0.046, 0.3, k.steel, -0.088, 0.07, -0.08),
    cylZ(0.02, 0.46, k.body, 0.088, 0.07, -0.22),
    cylZ(0.02, 0.46, k.body, -0.088, 0.07, -0.22),
    g(box(0.011, 0.011, 0.34, k.glow, 0.088, 0.11, -0.08), 'coil'),
    g(box(0.011, 0.011, 0.34, k.glow, -0.088, 0.11, -0.08), 'coil'),
    fw,
  ];
}

/** Vented cooling shroud with a forward spinning turbine + glowing intake. */
export function coolingTurbine(k: Kit, z: number): THREE.Object3D[] {
  const fins = new THREE.Group();
  for (let i = 0; i < 8; i++) fins.add(cylZ(0.092, 0.012, k.steel, 0, 0.03, z + 0.06 - i * 0.036, 12));
  const fan = new THREE.Group();
  fan.name = 'spin';
  fan.position.set(0, 0.03, z - 0.28);
  fan.add(cylZ(0.03, 0.02, k.steel, 0, 0, 0, 10));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bl = box(0.02, 0.07, 0.014, k.hot, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0);
    bl.rotation.z = a;
    fan.add(bl);
  }
  return [cylZ(0.07, 0.3, k.steel, 0, 0.03, z), fins, fan, g(cylZ(0.05, 0.02, k.hot, 0, 0.03, z - 0.34))];
}

/** Coil accelerator — a stack of glowing rings down the barrel + a bright core. */
export function coilAccelerator(k: Kit, len: number, z: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [cylZ(0.02, len, k.dark, 0, 0.03, z), g(box(0.02, 0.02, len * 0.7, k.hot, 0, 0.03, z))];
  const rings = 6;
  for (let i = 0; i < rings; i++) out.push(g(cylZ(0.05, 0.02, k.glow, 0, 0.03, z - len / 2 + 0.06 + (i * (len - 0.12)) / rings, 14), 'coil'));
  return out;
}

/** Recoil-dampener buffer towers with glowing coil springs + a spinning governor. */
export function recoilTowers(k: Kit): THREE.Object3D[] {
  const gov = new THREE.Group();
  gov.name = 'spin';
  gov.position.set(0, 0.14, 0.06);
  gov.add(cylZ(0.05, 0.024, k.steel, 0, 0, 0, 6));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    gov.add(g(box(0.018, 0.06, 0.026, k.hot, Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0)));
  }
  return [
    cylZ(0.04, 0.26, k.steel, 0.075, 0.11, 0.26),
    cylZ(0.04, 0.26, k.steel, -0.075, 0.11, 0.26),
    tagCoil(coilStack(6, 0.035, 0.03, k.glow, 0.075, 0.11, 0.16)),
    tagCoil(coilStack(6, 0.035, 0.03, k.glow, -0.075, 0.11, 0.16)),
    gov,
  ];
}
function tagCoil(o: THREE.Object3D): THREE.Object3D {
  o.name = 'coil';
  o.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.name = 'coil'; });
  return o;
}

/** Rotating gatling barrel cluster (tagged 'spin'). */
export function gatlingBarrels(k: Kit, count: number, radius: number, len: number, z: number): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'spin';
  grp.position.set(0, 0.03, z);
  grp.add(cylZ(radius * 1.1, 0.05, k.steel, 0, 0, len / 2, count));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    grp.add(cylZ(0.018, len, k.dark, Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  grp.add(g(cylZ(radius * 0.4, len * 0.9, k.hot, 0, 0, 0)));
  return grp;
}

/** Side drum magazine (across X) with a glowing core window. */
export function drumMag(k: Kit, x: number, y: number, z: number, s = 1): THREE.Object3D[] {
  const d = cylX(0.11 * s, 0.09, k.dark, x, y, z);
  d.name = 'mag';
  return [d, g(box(0.02, 0.06 * s, 0.06 * s, k.glow, x + 0.05, y, z))];
}

/** Belt-feed — a linked ammo belt spilling from a side box. */
export function beltFeed(k: Kit, x: number, y: number, z: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [box(0.12, 0.14, 0.16, k.dark, x, y, z)];
  for (let i = 0; i < 6; i++) out.push(box(0.02, 0.03, 0.02, k.steel, x - 0.05 + i * 0.012, y + 0.08 + i * 0.008, z - 0.05 - i * 0.01));
  out.push(g(box(0.02, 0.08, 0.1, k.glow, x + 0.06, y, z)));
  return out;
}

/** Fat launch tube (RPG) + rear exhaust cone + glowing warhead tip. */
export function siegeTube(k: Kit, radius: number): THREE.Object3D[] {
  return [
    cylZ(radius, 0.56, k.body, 0, 0, 0),
    coneZ(radius * 1.3, radius * 0.6, 0.14, k.dark, 0, 0, 0.32),
    g(coneZ(radius * 0.35, radius * 0.95, 0.16, k.hot, 0, 0, -0.32)),
    cylZ(radius * 1.06, 0.04, k.steel, 0, 0, 0.16),
    cylZ(radius * 1.06, 0.04, k.steel, 0, 0, -0.12),
  ];
}

/** Vented shroud with glowing heat slats. */
export function ventedShroud(k: Kit, z: number, len: number): THREE.Object3D[] {
  return [
    box(0.1, 0.09, len, k.body, 0, 0.01, z),
    tagGlowGroup(ventSlats(4, 0.045, 0.02, 0.09, k.glow, 0.07, 0.03, z + len * 0.2)),
    tagGlowGroup(ventSlats(4, 0.045, 0.02, 0.09, k.glow, -0.07, 0.03, z + len * 0.2)),
  ];
}
function tagGlowGroup(o: THREE.Object3D): THREE.Object3D {
  o.name = 'glow';
  o.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.name = 'glow'; });
  return o;
}

/** Heavy scope/optic housing + glowing lens. */
export function opticHousing(k: Kit, y: number, z: number, big = false): THREE.Object3D[] {
  const r = big ? 0.05 : 0.03;
  return [cylZ(r * 1.6, big ? 0.22 : 0.15, k.dark, 0, y, z), g(box(r, r, 0.02, k.hot, 0, y, z - (big ? 0.12 : 0.08)))];
}

/** Energy cell magazine with a glowing charge window. */
export function energyCell(k: Kit, x: number, y: number, z: number): THREE.Object3D[] {
  const cell = box(0.1, 0.21, 0.14, k.dark, x, y, z);
  cell.name = 'mag';
  return [cell, g(box(0.055, 0.15, 0.02, k.glow, x, y, z + 0.08)), box(0.11, 0.03, 0.15, k.steel, x, y - 0.11, z)];
}

/** Grip + trigger guard. */
export function gripTrigger(k: Kit, z: number): THREE.Object3D[] {
  return [grip(0.072, 0.17, 0.085, k.dark, 0, -0.15, z), box(0.05, 0.02, 0.09, k.dark, 0, -0.065, z - 0.04)];
}

/** Armored stock assembly (style-varied). */
export function stockAssembly(k: Kit, style: 'solid' | 'skeleton' | 'strut', z: number): THREE.Object3D[] {
  if (style === 'skeleton') {
    return [box(0.03, 0.02, 0.2, k.dark, 0, 0.07, z), box(0.03, 0.02, 0.2, k.dark, 0, -0.08, z), box(0.03, 0.16, 0.03, k.dark, 0, -0.005, z + 0.11)];
  }
  if (style === 'strut') {
    return [box(0.095, 0.15, 0.24, k.body, 0, -0.01, z), box(0.03, 0.03, 0.18, k.steel, 0, 0.08, z - 0.02), box(0.075, 0.17, 0.035, k.dark, 0, -0.01, z + 0.13)];
  }
  return [box(0.09, 0.14, 0.2, k.body, 0, -0.01, z), box(0.075, 0.16, 0.03, k.dark, 0, -0.01, z + 0.12)];
}

/** Deployed bipod under the barrel. */
export function bipod(k: Kit, z: number): THREE.Object3D[] {
  const l = box(0.012, 0.16, 0.012, k.dark, -0.05, -0.13, z);
  const r = box(0.012, 0.16, 0.012, k.dark, 0.05, -0.13, z);
  l.rotation.x = 0.35;
  r.rotation.x = 0.35;
  return [l, r];
}

/** Armor side plates on the receiver. */
export function armorPlates(k: Kit, z: number): THREE.Object3D[] {
  return [box(0.022, 0.14, 0.26, k.body, 0.092, -0.01, z), box(0.022, 0.14, 0.26, k.body, -0.092, -0.01, z)];
}

// ── ALIEN modules (organic / crystalline) ────────────────────────────────────────

/** Organic biomech core — capsule mass + glowing heart + pod nodes, tagged for pulse. */
export function biomechCore(k: Kit, z: number): THREE.Object3D[] {
  const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 6, 12), k.body);
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0.01, z);
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), k.hot);
  heart.name = 'glow';
  heart.position.set(0, 0.02, z + 0.04);
  const out: THREE.Object3D[] = [core, heart];
  for (let i = 0; i < 4; i++) out.push(g(new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), k.glow).translateX((k.r() * 2 - 1) * 0.09).translateY((k.r() * 2 - 1) * 0.06).translateZ(z + (k.r() * 2 - 1) * 0.18)));
  return out;
}

/** Angular crystal cluster (glowing shards), tagged 'glow'. */
export function crystalCluster(k: Kit, z: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.03 + k.r() * 0.03), k.hot);
    s.name = 'glow';
    s.position.set((k.r() * 2 - 1) * 0.06, 0.02 + k.r() * 0.06, z + (k.r() * 2 - 1) * 0.16);
    s.rotation.set(k.r() * 3, k.r() * 3, k.r() * 3);
    out.push(s);
  }
  return out;
}

/** Writhing tendrils (thin angled capsules). */
export function tendrils(k: Kit, count: number, z: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (let i = 0; i < count; i++) {
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.18 + k.r() * 0.14, 4, 8), k.dark);
    t.position.set((k.r() * 2 - 1) * 0.07, (k.r() * 2 - 1) * 0.05, z - 0.1 - k.r() * 0.2);
    t.rotation.set(k.r() * 2 - 1, k.r() * 2 - 1, k.r() * 2 - 1);
    out.push(t);
  }
  return out;
}
