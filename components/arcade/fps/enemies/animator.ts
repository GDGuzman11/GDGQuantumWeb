/**
 * Transform-based enemy animator (no skeletal rig). Each class has its OWN gait
 * timing/posture so you read it from movement alone — Scout springy + fast, Tank
 * a slow heavy stomp with a swaying torso, Berserker hunched + frantic, Marksman/
 * Commander steady. Also a death topple. Honors the model's base hip height
 * (`userData.hipY`) and its built-in hunch so scaled classes don't collapse.
 */
import type { Object3D } from 'three';
import type { EnemyParts } from './models/trooper';
import type { EnemyClass } from './types';

interface AnimDef {
  gait: number; // stride frequency
  swing: number; // leg/arm swing amplitude
  bob: number; // torso bob height
  hunch: number; // forward torso lean (rad)
  twist: number; // idle torso sway (rad)
}
const ANIM: Record<EnemyClass, AnimDef> = {
  rifleman: { gait: 2.0, swing: 0.6, bob: 0.05, hunch: 0, twist: 0 },
  scout: { gait: 3.3, swing: 0.95, bob: 0.08, hunch: 0.08, twist: 0 }, // fast, springy
  breacher: { gait: 1.8, swing: 0.5, bob: 0.06, hunch: 0.15, twist: 0 },
  marksman: { gait: 1.6, swing: 0.4, bob: 0.03, hunch: 0, twist: 0 }, // steady
  suppressor: { gait: 1.3, swing: 0.45, bob: 0.05, hunch: 0, twist: 0 }, // methodical
  engineer: { gait: 1.9, swing: 0.5, bob: 0.04, hunch: 0, twist: 0 },
  tank: { gait: 0.95, swing: 0.35, bob: 0.08, hunch: 0, twist: 0.5 }, // slow stomp, torso sway
  elite: { gait: 2.4, swing: 0.7, bob: 0.05, hunch: 0, twist: 0 },
  commander: { gait: 1.5, swing: 0.4, bob: 0.03, hunch: 0, twist: 0 }, // calm
  berserker: { gait: 3.0, swing: 0.85, bob: 0.1, hunch: 0.35, twist: 0 }, // hunched, frantic
  artillery: { gait: 0, swing: 0, bob: 0, hunch: 0, twist: 0 }, // static emplacement (no parts → no-op)
  jetpack: { gait: 2.2, swing: 0.5, bob: 0.06, hunch: 0.12, twist: 0 }, // airborne fighter
};

export function poseEnemy(model: Object3D, cls: EnemyClass, moving: boolean, aiming: boolean, step: number, hitFlash: number, now: number): void {
  const P = model.userData.parts as EnemyParts | undefined;
  if (!P) return;
  const A = ANIM[cls];
  const hipY = (model.userData.hipY as number) ?? 0.9;

  const ph = step * A.gait; // gait phase
  // Legs stride opposite each other (bigger, readable steps — no more gliding).
  const swing = moving ? Math.sin(ph) * A.swing * 1.25 : 0;
  P.legL.rotation.x = swing;
  P.legR.rotation.x = -swing;

  // Arms counter-swing the legs (unless the weapon is up).
  if (aiming) {
    P.armR.rotation.x = -1.35;
    P.armL.rotation.x = -1.1;
  } else {
    P.armR.rotation.x = -swing * 0.85 - 0.1;
    P.armL.rotation.x = swing * 0.85 - 0.1;
  }

  // Body: two dips per stride (foot-plants), a side-to-side weight sway, and a lean into
  // the walk — reads like real footfalls (COD-ish) instead of a sliding sprite.
  const bob = moving ? Math.abs(Math.sin(ph)) * (A.bob + 0.06) : Math.sin(now * 0.002) * 0.012;
  P.torso.position.y = hipY + bob;
  P.torso.rotation.x = A.hunch + (moving ? 0.09 : 0) + (hitFlash > 0 ? 0.25 * Math.min(1, hitFlash / 0.12) : 0);
  P.torso.rotation.z = moving ? Math.sin(ph) * 0.07 : 0; // hip/shoulder sway
  P.torso.rotation.y = (A.twist ? Math.sin(now * 0.0016) * A.twist * 0.12 : 0) + (moving ? Math.sin(ph) * 0.05 : 0);
}

/** Death topple — tips the model over its feet. Caller manages visibility/timing. */
export function poseDeath(model: Object3D, deadT: number): void {
  model.rotation.x = -Math.min(1, deadT / 0.5) * 1.45;
}
