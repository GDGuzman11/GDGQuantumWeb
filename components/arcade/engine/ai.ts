/**
 * Aiming AI. Brute-forces a firing solution (launch angle + power) by simulating
 * cheap trajectories and keeping the one that lands nearest the target, then
 * injects error scaled by difficulty so easy AIs miss believably.
 */
import { GAME_H, GAME_W, GRAVITY, MAX_POWER, MIN_POWER, type Tank, type Vec2 } from './types';
import { heightAt, type Terrain } from './terrain';

export type Difficulty = 'easy' | 'normal' | 'hard';

/** Per-difficulty aim error (radians of angle jitter + power jitter fraction). */
const ERROR: Record<Difficulty, { ang: number; pow: number }> = {
  easy: { ang: 0.22, pow: 0.22 },
  normal: { ang: 0.1, pow: 0.1 },
  hard: { ang: 0.028, pow: 0.04 },
};

export interface Shot {
  dir: Vec2; // unit launch direction
  power: number;
}

/** Simulate where a shot lands; returns the landing x (or offscreen sentinel). */
function simulateLandingX(
  terrain: Terrain,
  from: Vec2,
  dir: Vec2,
  power: number,
  wind: number,
): number {
  let x = from.x;
  let y = from.y;
  let vx = dir.x * power;
  let vy = dir.y * power;
  for (let i = 0; i < 600; i++) {
    vx += wind;
    vy += GRAVITY;
    x += vx;
    y += vy;
    if (x < -40 || x > GAME_W + 40) return x;
    if (y >= heightAt(terrain, x)) return x;
    if (y > GAME_H + 40) return x;
  }
  return x;
}

export function computeAiShot(
  terrain: Terrain,
  shooter: Tank,
  target: Tank,
  wind: number,
  difficulty: Difficulty,
  random: () => number,
): Shot {
  const from: Vec2 = { x: shooter.x, y: heightAt(terrain, shooter.x) - 18 };
  const targetX = target.x;
  const facingLeft = targetX < shooter.x;

  let best: Shot | null = null;
  let bestErr = Infinity;
  // Sweep angles (above horizontal) and powers; pick the closest landing.
  for (let angDeg = 12; angDeg <= 80; angDeg += 3) {
    const a = (angDeg * Math.PI) / 180;
    const dir: Vec2 = { x: Math.cos(a) * (facingLeft ? -1 : 1), y: -Math.sin(a) };
    for (let p = MIN_POWER + 2; p <= MAX_POWER; p += 0.6) {
      const landX = simulateLandingX(terrain, from, dir, p, wind);
      const err = Math.abs(landX - targetX);
      if (err < bestErr) {
        bestErr = err;
        best = { dir, power: p };
      }
    }
  }

  const e = ERROR[difficulty];
  const chosen = best ?? {
    dir: { x: facingLeft ? -0.7 : 0.7, y: -0.7 },
    power: MAX_POWER * 0.6,
  };
  // Inject difficulty error: rotate the dir + scale the power.
  const baseAng = Math.atan2(chosen.dir.y, chosen.dir.x);
  const ang = baseAng + (random() * 2 - 1) * e.ang;
  const power = Math.max(
    MIN_POWER,
    Math.min(MAX_POWER, chosen.power * (1 + (random() * 2 - 1) * e.pow)),
  );
  return { dir: { x: Math.cos(ang), y: Math.sin(ang) }, power };
}
