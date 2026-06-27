/**
 * Transform-based enemy animator (no skeletal rig) — poses the model's named
 * joints each frame from the bot's state. Phase 1: a shared core cycle (walk leg
 * swing + arm counter-swing, aim pose, idle breathing, hit flinch). Phase 4 adds
 * per-class timing/posture so each class reads from movement alone.
 */
import type { Object3D } from 'three';
import type { EnemyParts } from './models/trooper';

export function poseEnemy(model: Object3D, moving: boolean, aiming: boolean, step: number, hitFlash: number, now: number): void {
  const P = model.userData.parts as EnemyParts | undefined;
  if (!P) return;

  // Legs: alternating swing while moving, planted otherwise.
  const swing = moving ? Math.sin(step * 2) * 0.6 : 0;
  P.legL.rotation.x = swing;
  P.legR.rotation.x = -swing;

  // Arms: raise the weapon forward when engaging, else counter-swing with the gait.
  if (aiming) {
    P.armR.rotation.x = -1.35;
    P.armL.rotation.x = -1.1;
  } else {
    P.armR.rotation.x = -swing * 0.5 - 0.1;
    P.armL.rotation.x = swing * 0.5 - 0.1;
  }

  // Torso: bob with strides, gentle breathing at rest, flinch on hit.
  const bob = moving ? Math.abs(Math.sin(step * 2)) * 0.05 : Math.sin(now * 0.002) * 0.012;
  P.torso.position.y = 0.9 + bob;
  P.torso.rotation.x = hitFlash > 0 ? 0.25 * Math.min(1, hitFlash / 0.12) : P.torso.rotation.x * 0.7;
}
