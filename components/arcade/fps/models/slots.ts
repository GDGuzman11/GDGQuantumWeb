/**
 * SLOT-MODULE weapon system — every gun is a BASE gun (parts tagged `base:<slot>`) whose
 * slots get 1-3 of their parts REPLACED by an engineering MODULE (not overlaid): the base
 * mesh is hidden and the module is fit into its exact box via `fitToSlot` (flush, sized from
 * what it replaced — same mechanism as the old engineering bench). Each module is a distinct
 * engineering design (magnetic rail, plasma toroid, gyro stock, cooling fins…), built centred
 * at origin, tinted to the gun's colour, and tagged 'glow'/'coil'/'spin'/'scan'/'bob' so the
 * existing preview + viewmodel animators drive it. Per gun the modules are seed-picked across
 * DIFFERENT slots (free 1-2, premium 2-3) → combinatorial variety, every gun coherent + fitted.
 */
import * as THREE from 'three';
import { box, coilStack, cylX, cylZ, finStack, grip, model } from './parts';
import { type Kit, scanBar } from './kit';
import { fitToSlot, meshesByName, type FitMode } from '../fit';

export type Slot = 'barrel' | 'core' | 'mag' | 'optic' | 'shroud' | 'stock';
export type Module = (k: Kit) => THREE.Object3D;

const FIT: Record<Slot, FitMode> = { barrel: 'axisZ', core: 'fill', mag: 'fill', optic: 'footprint', shroud: 'axisZ', stock: 'fill' };

function named(o: THREE.Mesh, name: string): THREE.Mesh {
  o.name = name;
  return o;
}
function glow<T extends THREE.Object3D>(o: T): T {
  o.name = 'glow';
  return o;
}
function spinGroup(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'spin';
  return g;
}

// ── BASE ASSAULT GUN (each part tagged so a module can replace it) ────────────────
export function baseAssault(k: Kit): THREE.Group {
  return model([
    named(box(0.11, 0.11, 0.34, k.body, 0, 0, 0.04), 'base:core'), // receiver / centerpiece
    named(cylZ(0.028, 0.42, k.dark, 0, 0.01, -0.32), 'base:barrel'),
    named(box(0.075, 0.07, 0.22, k.body, 0, 0.01, -0.2), 'base:shroud'), // handguard
    named(box(0.07, 0.18, 0.1, k.dark, 0, -0.15, 0.06), 'base:mag'),
    named(box(0.045, 0.04, 0.13, k.dark, 0, 0.09, 0.02), 'base:optic'),
    named(box(0.07, 0.09, 0.18, k.body, 0, -0.01, 0.3), 'base:stock'),
    grip(0.06, 0.14, 0.07, k.dark, 0, -0.12, 0.16),
    (() => { const o = new THREE.Object3D(); o.name = 'muzzle'; o.position.set(0, 0.01, -0.56); return o; })(),
  ]);
}

// ── BARREL modules (axisZ) ────────────────────────────────────────────────────────
const railBarrel: Module = (k) => model([
  cylZ(0.02, 0.5, k.dark, 0, 0, 0),
  box(0.018, 0.026, 0.46, k.steel, 0.05, 0.02, 0),
  box(0.018, 0.026, 0.46, k.steel, -0.05, 0.02, 0),
  named(box(0.009, 0.01, 0.44, k.glow, 0.05, 0.038, 0), 'coil'),
  named(box(0.009, 0.01, 0.44, k.glow, -0.05, 0.038, 0), 'coil'),
  scanBar(k, 0, 0.05, -0.22, 0.22, 1.8, 0.02, 0.016),
]);
const coilBarrel: Module = (k) => {
  const parts: THREE.Object3D[] = [cylZ(0.018, 0.5, k.dark, 0, 0, 0), glow(box(0.016, 0.016, 0.4, k.hot, 0, 0, 0))];
  for (let i = 0; i < 6; i++) parts.push(named(cylZ(0.042, 0.02, k.glow, 0, 0, -0.2 + i * 0.08, 14), 'coil'));
  return model(parts);
};
const longBarrel: Module = (k) => model([
  cylZ(0.026, 0.62, k.dark, 0, 0, 0),
  box(0.055, 0.055, 0.1, k.steel, 0, 0, -0.28), // muzzle brake
  glow(box(0.014, 0.04, 0.02, k.hot, 0, 0.05, -0.24)), // front sight
]);
const teslaBarrel: Module = (k) => {
  const p: THREE.Object3D[] = [cylZ(0.02, 0.42, k.dark, 0, 0, 0.02)];
  for (const s of [-1, 1]) p.push(cylZ(0.008, 0.24, k.steel, s * 0.04, 0.05, -0.14));
  p.push(glow(box(0.06, 0.02, 0.02, k.hot, 0, 0.08, -0.24)), glow(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), k.hot).translateZ(-0.24)));
  return model(p);
};

// ── CORE modules (fill) ───────────────────────────────────────────────────────────
const reactorCoreM: Module = (k) => model([
  box(0.16, 0.16, 0.24, k.gun, 0, 0, 0),
  box(0.13, 0.03, 0.26, k.dark, 0, 0.095, 0),
  glow(cylX(0.048, 0.2, k.hot, 0, 0.01, 0)),
  cylX(0.055, 0.028, k.steel, 0.1, 0.01, 0),
  cylX(0.055, 0.028, k.steel, -0.1, 0.01, 0),
  glow(box(0.018, 0.08, 0.14, k.glow, 0.085, 0, 0)),
  glow(box(0.018, 0.08, 0.14, k.glow, -0.085, 0, 0)),
]);
const plasmaToroidM: Module = (k) => {
  const ring = spinGroup();
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 10, 24), k.glow));
  ring.userData.spin = { speed: 1.8, axis: 'z' };
  return model([box(0.15, 0.16, 0.22, k.gun, 0, 0, 0), ring, glow(new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 12), k.hot))]);
};
const energyChamberM: Module = (k) => model([
  box(0.14, 0.15, 0.24, k.body, 0, 0, 0),
  glow(box(0.1, 0.09, 0.14, k.hot, 0, 0.01, 0)),
  glow(box(0.02, 0.1, 0.16, k.glow, 0.075, 0, 0)),
  glow(box(0.02, 0.1, 0.16, k.glow, -0.075, 0, 0)),
]);

// ── MAG modules (fill) ─────────────────────────────────────────────────────────────
const pelletDrumM: Module = (k) => model([
  named(cylX(0.1, 0.09, k.dark, 0, 0, 0), 'mag'),
  glow(box(0.02, 0.06, 0.06, k.glow, 0.05, 0, 0)),
  cylX(0.11, 0.02, k.steel, 0.05, 0, 0),
  cylX(0.11, 0.02, k.steel, -0.05, 0, 0),
]);
const harmonicaM: Module = (k) => {
  const p: THREE.Object3D[] = [named(box(0.22, 0.09, 0.09, k.dark, 0, 0, 0), 'mag')];
  for (let i = 0; i < 5; i++) p.push(glow(box(0.02, 0.05, 0.05, k.glow, -0.08 + i * 0.04, 0, 0)));
  p.push(scanBar(k, 0, 0.055, -0.09, 0.09, 2.2, 0.03, 0.02));
  return model(p);
};

// ── OPTIC modules (footprint) ───────────────────────────────────────────────────────
const scopeM: Module = (k) => model([cylZ(0.04, 0.18, k.dark, 0, 0.01, 0), glow(box(0.03, 0.03, 0.02, k.hot, 0, 0.01, -0.09))]);
const pantographM: Module = (k) => {
  const p: THREE.Object3D[] = [box(0.05, 0.04, 0.09, k.dark, 0, 0.04, 0)];
  for (const s of [-1, 1]) { const arm = box(0.008, 0.09, 0.008, k.steel, s * 0.02, 0, 0); arm.rotation.x = s * 0.4; p.push(arm); }
  p.push(glow(box(0.025, 0.025, 0.02, k.hot, 0, 0.07, -0.03)));
  return model(p);
};
const rangefinderM: Module = (k) => model([
  box(0.05, 0.045, 0.12, k.dark, 0, 0.02, 0),
  box(0.09, 0.012, 0.012, k.steel, 0, 0.05, -0.02),
  glow(box(0.02, 0.02, 0.02, k.hot, 0, 0.02, -0.06)),
]);

// ── SHROUD modules (axisZ) ──────────────────────────────────────────────────────────
const coolingFinM: Module = (k) => model([
  box(0.09, 0.08, 0.2, k.body, 0, 0.01, 0),
  finStack(6, 0.03, 0.14, 0.06, k.steel, 0, 0.06, 0.075),
  glow(box(0.02, 0.02, 0.18, k.hot, 0, 0.11, 0)), // glowing heat rail
]);
const bellowsM: Module = (k) => {
  const p: THREE.Object3D[] = [box(0.08, 0.08, 0.2, k.body, 0, 0.01, 0)];
  for (let i = 0; i < 5; i++) p.push(box(0.1 - (i % 2) * 0.02, 0.09 - (i % 2) * 0.02, 0.02, k.steel, 0, 0.01, -0.08 + i * 0.04));
  p.push(glow(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 12), k.hot).translateY(0.06).translateZ(0.06)));
  return model(p);
};

// ── STOCK modules (fill) ────────────────────────────────────────────────────────────
const recoilSpringM: Module = (k) => {
  const spring = coilStack(6, 0.03, 0.03, k.glow, 0, 0.03, 0.06);
  spring.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.name = 'coil'; });
  spring.name = 'coil';
  return model([box(0.07, 0.09, 0.18, k.body, 0, 0, 0), cylZ(0.035, 0.2, k.steel, 0, 0.03, 0), spring]);
};
const gyroM: Module = (k) => {
  const ring = spinGroup();
  ring.userData.spin = { speed: 2.4, axis: 'z' };
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), k.glow));
  ring.position.set(0, 0.03, 0);
  return model([box(0.07, 0.09, 0.18, k.body, 0, 0, 0), ring, glow(new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), k.hot).translateY(0.03))]);
};
const crankM: Module = (k) => {
  const crank = spinGroup();
  crank.userData.spin = { speed: 3.0, axis: 'z' };
  crank.add(cylZ(0.03, 0.03, k.steel, 0, 0, 0, 8), named(box(0.014, 0.05, 0.02, k.hot, 0, 0.03, 0.01), 'glow'));
  crank.position.set(0.05, 0.02, 0.02);
  return model([box(0.08, 0.09, 0.18, k.body, 0, 0, 0), crank, cylZ(0.015, 0.14, k.dark, 0.05, -0.02, 0)]);
};
const hydraulicM: Module = (k) => {
  const fw = spinGroup();
  fw.userData.spin = { speed: 2.6, axis: 'z' };
  fw.add(cylZ(0.04, 0.02, k.steel, 0, 0, 0, 8));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; fw.add(glow(box(0.014, 0.03, 0.02, k.hot, Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0.004))); }
  fw.position.set(0.045, 0, 0.02);
  return model([box(0.07, 0.09, 0.18, k.body, 0, 0, 0), cylZ(0.03, 0.16, k.steel, -0.04, 0.03, 0), glow(box(0.008, 0.008, 0.12, k.glow, -0.04, 0.06, 0)), fw]);
};

/** Modules that can replace each slot, per category (Assault built first). */
export const CATEGORY_SLOTS: Partial<Record<string, Record<Slot, Module[]>>> = {
  assault: {
    barrel: [railBarrel, coilBarrel, longBarrel, teslaBarrel],
    core: [reactorCoreM, plasmaToroidM, energyChamberM],
    mag: [pelletDrumM, harmonicaM],
    optic: [scopeM, pantographM, rangefinderM],
    shroud: [coolingFinM, bellowsM],
    stock: [recoilSpringM, gyroM, crankM, hydraulicM],
  },
};

const BASE_GUNS: Partial<Record<string, (k: Kit) => THREE.Group>> = {
  assault: baseAssault,
};

/** Replace a slot's base mesh(es) with a module, fit into the exact box it vacated. */
function replaceSlot(gun: THREE.Group, slot: Slot, mod: Module, k: Kit): void {
  const bases = meshesByName(gun, [`base:${slot}`]);
  if (!bases.length) return;
  const target = new THREE.Box3();
  for (const m of bases) target.union(new THREE.Box3().setFromObject(m));
  for (const m of bases) m.visible = false;
  const pm = mod(k);
  fitToSlot(pm, target, FIT[slot]);
  pm.name = `eng:${slot}`;
  gun.add(pm);
}

/** Whether the slot system covers this category yet (else the caller falls back). */
export function hasSlots(category: string): boolean {
  return !!CATEGORY_SLOTS[category];
}

/** Build a gun from its base + a seeded 1-3 (premium 2-3) module replacements across
 *  DIFFERENT slots. Returns null if the category isn't slotted yet. */
export function buildSlotted(category: string, k: Kit, r: () => number, premium: boolean): THREE.Group | null {
  const slots = CATEGORY_SLOTS[category];
  const base = BASE_GUNS[category];
  if (!slots || !base) return null;
  const gun = base(k);
  const names = (Object.keys(slots) as Slot[]).filter((s) => slots[s].length > 0);
  // shuffle slots by seed
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  const count = premium ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2); // premium 2-3, free 1-2
  for (const slot of names.slice(0, Math.min(count, names.length))) {
    const opts = slots[slot];
    replaceSlot(gun, slot, opts[Math.floor(r() * opts.length)], k);
  }
  return gun;
}
