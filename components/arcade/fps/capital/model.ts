/**
 * CAPITAL SHIP MODEL — builds a HUGE procedural "Star Destroyer" from primitives, driven
 * by a CapitalDNA roll. Zero-asset: boxes + cylinders + emissive materials only. The ship
 * runs along +Z (nose at -Z), centred at the origin; the caller positions/scales it above
 * the arena. A LIMITED set of animated sub-assemblies (turrets rotate, reactor + engines
 * pulse) is stashed on `userData.anim` and driven by `animateCapital`.
 *
 * Silhouette, tower placement, and engine/turret/bay counts all come from the DNA so no
 * two generations look alike.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { accent, box, cylY, cylZ, metal } from '../models/parts';
import { rng } from '../rand';
import type { CapitalDNA } from './dna';

export interface CapitalAnim {
  turrets: THREE.Object3D[]; // rotate on Y
  reactor: THREE.MeshStandardMaterial[]; // pulse emissive
  engines: THREE.MeshStandardMaterial[]; // pulse exhaust
  t: number;
}

export function buildCapital(dna: CapitalDNA, tier: RenderTier): THREE.Group {
  const r = rng(dna.seed ^ 0x5ca1);
  const armor = metal(dna.body, tier, 0.6, 0.7);
  const dark = metal(0x14161b, tier, 0.7, 0.5);
  const steel = metal(0x363b43, tier, 0.45, 0.9);
  const glow = accent(dna.accent, tier, 1.6);
  const reactorMat = accent(dna.accent, tier, 2.4) as THREE.MeshStandardMaterial;
  const engineMat = accent(0x8fd8ff, tier, 2.0) as THREE.MeshStandardMaterial;

  const g = new THREE.Group();
  const anim: CapitalAnim = { turrets: [], reactor: [reactorMat], engines: [engineMat], t: 0 };

  const L = dna.length;
  const W = L * 0.32;
  const H = L * 0.12;

  // ── MAIN HULL (silhouette by DNA) ───────────────────────────────────────────
  if (dna.hull === 'blade') {
    // Tapered wedge, wide aft → pointed nose.
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const w = W * (1 - t * 0.85);
      const h = H * (1 - t * 0.5);
      g.add(box(w, h, L / 7 + 0.5, armor, 0, 0, L / 2 - (i + 0.5) * (L / 7)));
    }
  } else if (dna.hull === 'trident') {
    for (const sx of [-1, 0, 1]) {
      const off = sx * W * 0.34;
      const len = sx === 0 ? L : L * 0.8;
      g.add(box(W * 0.26, H * 0.8, len, armor, off, 0, (L - len) / 2 * -1 * 0 + (sx === 0 ? 0 : L * 0.05)));
      g.add(box(W * 0.1, H * 0.4, len * 0.5, glow, off, 0, -len * 0.28)); // prong tip glow rails
    }
  } else if (dna.hull === 'spine') {
    g.add(box(W * 0.22, H * 1.4, L, steel, 0, 0, 0)); // tall central spine
    for (const sx of [-1, 1]) g.add(box(W * 0.55, H * 0.5, L * 0.72, armor, sx * W * 0.36, -H * 0.2, 0)); // wings
  } else if (dna.hull === 'cathedral') {
    g.add(box(W, H, L, armor, 0, 0, 0)); // slab base
    for (let i = 0; i < 5; i++) g.add(box(W * 0.08, H * (2 + r() * 2), W * 0.12, dark, (i - 2) * W * 0.18, H * 1.2, -L * 0.1 + i * L * 0.12)); // dorsal spires
  } else {
    // slab
    g.add(box(W, H, L, armor, 0, 0, 0));
    g.add(box(W * 0.5, H * 0.7, L * 0.4, steel, 0, 0, -L * 0.34)); // nose block
  }

  // ── ARMOR PLATES + STRUCTURAL RIBS (dorsal) ─────────────────────────────────
  const segs = 9;
  for (let i = 0; i < segs; i++) {
    const z = L / 2 - (i + 0.5) * (L / segs);
    const w = (dna.hull === 'blade' ? W * (1 - (i / segs) * 0.7) : W) * 0.9;
    g.add(box(w, 0.6, L / segs - 1.2, dark, 0, H / 2, z)); // plate seam
    g.add(box(w + 1.5, H * 0.9, 0.5, steel, 0, 0, z + L / segs / 2)); // rib
    if (i % 2 === 0) g.add(box(w * 0.7, 0.3, L / segs - 3, glow, 0, H / 2 + 0.4, z)); // dorsal light strip
  }

  // ── COMMAND TOWER / BRIDGE (by DNA) ─────────────────────────────────────────
  const towerZ = dna.bridge === 'fore' ? -L * 0.3 : dna.bridge === 'aft' ? L * 0.32 : 0;
  const towerY = H * 0.6;
  const tw = W * 0.3;
  const th = dna.bridge === 'spinal' ? H * 2.4 : H * 1.6;
  g.add(box(tw, th, tw * 1.4, steel, 0, towerY + th / 2, towerZ));
  g.add(box(tw * 0.8, th * 0.4, 0.4, glow, 0, towerY + th * 0.7, towerZ - tw * 0.7)); // bridge windows
  g.add(cylY(0.4, th * 0.7, dark, tw * 0.3, towerY + th, towerZ)); // sensor mast
  g.add(box(1.2, 0.6, 1.2, glow, tw * 0.3, towerY + th * 1.35, towerZ)); // mast beacon

  // ── ENGINES (rear cluster, glowing) ─────────────────────────────────────────
  for (let i = 0; i < dna.engines; i++) {
    const ex = (i - (dna.engines - 1) / 2) * (W / dna.engines) * 0.9;
    g.add(cylZ(H * 0.32, H * 1.2, dark, ex, 0, L / 2 + H * 0.5)); // nacelle
    g.add(cylZ(H * 0.26, H * 0.3, engineMat, ex, 0, L / 2 + H * 1.0)); // exhaust glow
  }

  // ── HANGAR / LAUNCH BAYS (ventral, glowing openings) ────────────────────────
  for (let i = 0; i < dna.bays; i++) {
    const bz = (i - (dna.bays - 1) / 2) * L * 0.22;
    g.add(box(W * 0.28, 0.6, L * 0.14, glow, 0, -H / 2 - 0.3, bz)); // bay mouth
    g.add(box(W * 0.32, 1.4, L * 0.16, dark, 0, -H / 2 - 0.1, bz)); // bay frame
  }

  // ── TURRETS (scattered, animated) ───────────────────────────────────────────
  for (let i = 0; i < dna.turrets; i++) {
    const t = new THREE.Group();
    const sx = (r() * 2 - 1) * W * 0.42;
    const sz = (r() * 2 - 1) * L * 0.42;
    t.position.set(sx, H / 2 + 0.8, sz);
    t.add(cylY(1.6, 0.9, steel, 0, 0, 0)); // base ring
    t.add(box(2.2, 1.4, 2.6, dark, 0, 0.9, 0)); // housing
    t.add(cylZ(0.4, 4, dark, 0, 0.9, -2)); // twin barrels
    t.add(cylZ(0.4, 4, dark, 0.7, 0.9, -2));
    t.add(box(0.5, 0.5, 0.5, glow, 0, 1.5, -0.5)); // targeting glow
    g.add(t);
    anim.turrets.push(t);
  }

  // ── REACTOR CORE (dorsal, animated pulse) ───────────────────────────────────
  g.add(cylY(H * 0.5, 1.0, dark, 0, H * 0.55, L * 0.08)); // housing ring
  const reactorCore = new THREE.Mesh(new THREE.SphereGeometry(H * 0.38, 16, 12), reactorMat);
  reactorCore.position.set(0, H * 0.7, L * 0.08);
  g.add(reactorCore);

  // ── SENSOR TOWERS + NAV LIGHTS ──────────────────────────────────────────────
  for (const sx of [-1, 1]) {
    g.add(cylY(0.5, H * 1.6, steel, sx * W * 0.4, H * 0.9, -L * 0.15));
    g.add(box(1, 1, 1, glow, sx * W * 0.4, H * 1.7, -L * 0.15));
  }
  for (let i = 0; i < 10; i++) {
    const z = L / 2 - i * (L / 10);
    g.add(box(0.5, 0.5, 0.5, glow, W / 2, -H / 4, z)); // starboard edge lights
    g.add(box(0.5, 0.5, 0.5, glow, -W / 2, -H / 4, z));
  }

  g.userData.anim = anim;
  return g;
}

/** Per-frame animation: rotate turrets, pulse the reactor + engines. Call each frame. */
export function animateCapital(model: THREE.Object3D, dt: number, now: number): void {
  const a = model.userData.anim as CapitalAnim | undefined;
  if (!a) return;
  a.t += dt;
  for (let i = 0; i < a.turrets.length; i++) a.turrets[i].rotation.y = Math.sin(now * 0.0004 + i) * 0.9;
  const pulse = 1.8 + Math.sin(now * 0.003) * 0.6;
  for (const m of a.reactor) m.emissiveIntensity = pulse;
  for (const m of a.engines) m.emissiveIntensity = 1.6 + Math.sin(now * 0.006) * 0.4;
}
