/**
 * STARSHELL — shared engine types + constants. Pure data, no React, no DOM.
 * The game simulates in a fixed virtual resolution; the renderer scales it to
 * fit the CRT screen.
 */

/** Virtual play-field resolution (16:9). All engine coords are in this space. */
export const GAME_W = 960;
export const GAME_H = 540;

/** Physics tuned per 60fps step; the engine integrates at a fixed sub-step. */
export const STEP_MS = 1000 / 60;
export const GRAVITY = 0.16; // downward accel per step
export const MAX_POWER = 17; // projectile launch speed cap
export const MIN_POWER = 2;
export const AIM_MAX_DIST = 240; // pointer distance that maps to MAX_POWER
export const MOVE_BUDGET = 90; // px a tank may drive left/right per turn
export const MOVE_SPEED = 1.4; // px per step while a move button is held
export const TANK_HALF_W = 13;
export const TANK_HIT_R = 16;
export const START_HEALTH = 100;

export type Side = 'player' | 'ai';

export interface Vec2 {
  x: number;
  y: number;
}

/** Weapon behaviour archetypes (composed into the 90 weapons). */
export type WeaponKind =
  | 'single'
  | 'heavy'
  | 'nuke'
  | 'cluster'
  | 'spread'
  | 'airstrike'
  | 'digger'
  | 'builder'
  | 'roller'
  | 'bouncer'
  | 'homing'
  | 'beam';

/** Explosion visual styles, so even same-behaviour weapons read differently. */
export type ExplosionStyle = 'burst' | 'ring' | 'shards' | 'sparkle' | 'plume' | 'implode';

export interface Weapon {
  id: string;
  name: string;
  kind: WeaponKind;
  blastR: number;
  damage: number;
  color: string; // unique per weapon (projectile, trail, explosion tint)
  fx: ExplosionStyle; // unique explosion look
  count: number; // sub-projectiles for cluster / spread / airstrike
  bounces: number; // for bouncer
  terrain: 'carve' | 'mound' | 'none';
}

export interface Tank {
  side: Side;
  tankId: string;
  x: number; // centre x on the terrain (y is derived from terrain height)
  health: number;
  score: number; // cumulative damage dealt
  moveLeft: number; // remaining move budget this turn
  maxMove: number; // per-turn move budget (perk-adjusted)
  dmgTakenMul: number; // armour perk (<1 = tougher)
  blastMul: number; // energy perk (>1 = bigger blasts)
  color: string;
  accent: string;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  trail: Vec2[];
  weapon: Weapon;
  bounces: number; // remaining bounces (bouncer)
  child: boolean; // spawned by a cluster (won't re-cluster)
  rolling: boolean;
  rollLeft: number; // px of rolling left (roller)
}

export type Phase = 'aim' | 'flying' | 'resolving' | 'gameover';

/** A read-only snapshot the React HUD renders from each frame. */
export interface Snapshot {
  phase: Phase;
  turn: Side;
  wind: number;
  power: number; // current aim power (0..1) for the meter
  angle: number; // current aim angle in degrees (above horizontal)
  canFire: boolean;
  weaponName: string; // the player's currently selected weapon
  weaponDamage: number; // its damage (so the player sees it differs)
  tanks: { side: Side; health: number; score: number; moveLeft: number }[];
  winner: Side | null;
}
