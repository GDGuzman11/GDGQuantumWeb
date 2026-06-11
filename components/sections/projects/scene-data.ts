/**
 * Projects scene data — three-light geometry helpers for the particle-morph
 * centerpiece (Phase: Projects cinematic scenes, galaxy-first slice).
 *
 * Imports NOTHING from three so it stays cheap and testable; it only builds
 * plain `Float32Array`s that the canvas uploads as buffer attributes. The morph
 * engine holds two position buffers (from → to) and lerps between them in the
 * vertex shader, so every "scene" is just another target `Float32Array` of the
 * SAME particle count. Today there is one real scene (galaxy) plus the
 * disperse/scatter cloud used for the intro and the click re-form; the T-Rex /
 * Vitruvian / android image-sampled scenes drop into this same contract later.
 */

/** Fixed particle pool. Tunable 30k–80k; 50k reads crisp at ~60fps on desktop. */
export const PARTICLE_COUNT = 50000;

/** Galaxy disk radius in world units (camera sits at z≈6, fov 60). */
export const GALAXY_RADIUS = 3.8;

/** Scene ids. Extended with 'trex' | 'vitruvian' | 'android' in later slices. */
export type SceneId = 'galaxy';

/** Cheap gaussian-ish noise in roughly [-1, 1] (sum of uniforms). */
function randn(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

/**
 * Per-particle STATIC attributes (never morph): a random seed used for
 * size/twinkle/colour variation. Built once and shared across all scenes.
 */
export function buildSeeds(count = PARTICLE_COUNT): Float32Array {
  const aRand = new Float32Array(count);
  for (let i = 0; i < count; i++) aRand[i] = Math.random();
  return aRand;
}

/**
 * Procedural spiral galaxy: a few logarithmic arms + a brighter central bulge,
 * laid mostly in the XY plane with a thin (thicker-at-core) Z so it reads as a
 * dimensional disk when tilted. Returns the target positions and a per-particle
 * `colorT` (0 at the core → 1 at the rim) used to tint core white-gold → amber.
 */
export function buildGalaxy(count = PARTICLE_COUNT): {
  positions: Float32Array;
  colorT: Float32Array;
} {
  const positions = new Float32Array(count * 3);
  const colorT = new Float32Array(count);

  const ARMS = 4;
  const TWIST = 2.6; // radians of sweep per radius unit
  const BULGE_FRACTION = 0.16; // share of particles forming the bright core

  for (let i = 0; i < count; i++) {
    if (Math.random() < BULGE_FRACTION) {
      // Spherical-ish central bulge (bright core under additive blending).
      const br = 0.75 * Math.sqrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3 + 0] = br * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = br * Math.sin(phi) * Math.sin(theta) * 0.85;
      positions[i * 3 + 2] = br * Math.cos(phi) * 0.6;
      colorT[i] = (br / 0.75) * 0.25; // core stays bright
      continue;
    }

    // Disk: radius concentrated toward the centre.
    const t = Math.random();
    const r = GALAXY_RADIUS * Math.pow(t, 0.62);
    const arm = i % ARMS;
    const armAngle = (arm / ARMS) * Math.PI * 2;
    // Arms tighten toward the rim, fuzzier toward the core.
    const spread = 0.32 * (1 - r / GALAXY_RADIUS) + 0.05;
    const angle = armAngle + r * TWIST + randn() * spread;

    positions[i * 3 + 0] = Math.cos(angle) * r + randn() * 0.04;
    positions[i * 3 + 1] = Math.sin(angle) * r + randn() * 0.04;
    // Thin disk, thicker bulge near the core.
    const thick = 0.45 * Math.exp(-r * 0.9) + 0.04;
    positions[i * 3 + 2] = randn() * thick;
    colorT[i] = Math.min(1, r / GALAXY_RADIUS);
  }

  return { positions, colorT };
}

/**
 * Disperse/scatter cloud filling the viewport box — the intro "particles all
 * over the page, flashing" state and the click re-form bookend. Wider than the
 * galaxy so the convergence reads as a gather-from-everywhere.
 */
export function buildDisperse(count = PARTICLE_COUNT): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() * 2 - 1) * 6.8;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * 4.6;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * 3.0;
  }
  return positions;
}
