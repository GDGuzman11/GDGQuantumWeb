/**
 * STARSHELL core engine — turn state machine + projectile physics + damage.
 * Framework-agnostic: the React shell feeds it input and reads snapshots; the
 * renderer draws from its public fields. Phase 1 = one weapon, health KO; the
 * weapon registry + scoring-over-N-rounds arrive in later phases.
 */
import {
  AIM_MAX_DIST,
  GAME_H,
  GAME_W,
  GRAVITY,
  MAX_POWER,
  MIN_POWER,
  MOVE_BUDGET,
  MOVE_SPEED,
  START_HEALTH,
  STEP_MS,
  TANK_HIT_R,
  type Phase,
  type Projectile,
  type Side,
  type Snapshot,
  type Tank,
  type Vec2,
} from './types';
import { carve, generateTerrain, heightAt, rng, type Terrain } from './terrain';
import { computeAiShot, type Difficulty } from './ai';

const BLAST_R = 38;
const MAX_DMG = 42;
/** Slope resistance: climbing rise (px per move step) above this is impassable. */
const MAX_CLIMB = 3.4;
/** Extra fuel multiplier per px of uphill rise. */
const SLOPE_FUEL = 2.6;

export interface EngineOpts {
  seed: number;
  difficulty: Difficulty;
  rough?: number;
  wind?: number;
}

export class ArcadeEngine {
  terrain: Terrain;
  tanks: [Tank, Tank]; // [player, ai]
  proj: Projectile | null = null;
  phase: Phase = 'aim';
  turnIndex = 0; // 0 = player, 1 = ai
  wind: number;
  winner: Side | null = null;
  difficulty: Difficulty;
  /** Last explosion, for the renderer to flash (cleared after it reads it). */
  blast: { x: number; y: number; r: number; t: number } | null = null;

  private rand: () => number;
  private acc = 0;

  constructor(opts: EngineOpts) {
    this.rand = rng(opts.seed ^ 0x9e3779b9);
    this.terrain = generateTerrain(opts.seed, opts.rough ?? 1);
    this.difficulty = opts.difficulty;
    this.wind = opts.wind ?? (this.rand() * 2 - 1) * 0.05;
    this.tanks = [
      this.makeTank('player', GAME_W * 0.16, '#7fdfff', '#bdefff'),
      this.makeTank('ai', GAME_W * 0.84, '#ff5d7a', '#ffb3c2'),
    ];
  }

  private makeTank(side: Side, x: number, color: string, accent: string): Tank {
    return {
      side,
      x,
      health: START_HEALTH,
      score: 0,
      moveLeft: MOVE_BUDGET,
      color,
      accent,
    };
  }

  get current(): Tank {
    return this.tanks[this.turnIndex];
  }
  get opponent(): Tank {
    return this.tanks[this.turnIndex ^ 1];
  }
  /** Muzzle position of a tank (a little above the hull). */
  muzzle(t: Tank): Vec2 {
    return { x: t.x, y: heightAt(this.terrain, t.x) - 16 };
  }

  /** Map a pointer position to an aim direction + power (distance-based). */
  aimFromPointer(px: number, py: number): { dir: Vec2; power: number } {
    const m = this.muzzle(this.current);
    let dx = px - m.x;
    let dy = py - m.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Power scales with pointer distance; direction is the unit vector.
    const power =
      MIN_POWER + (MAX_POWER - MIN_POWER) * Math.min(1, dist / AIM_MAX_DIST);
    return { dir: { x: dx / dist, y: dy / dist }, power };
  }

  /**
   * Drive the current tank horizontally (dir = -1 left, +1 right). Slope-aware:
   * climbing a rise costs extra fuel and a steep enough wall is impassable;
   * downhill is cheap.
   */
  move(dir: -1 | 1): void {
    if (this.phase !== 'aim') return;
    const t = this.current;
    if (t.moveLeft <= 0) return;
    const x = t.x;
    const nx = Math.max(20, Math.min(GAME_W - 20, x + dir * MOVE_SPEED));
    const dx = Math.abs(nx - x);
    if (dx < 0.01) return;
    // rise > 0 means the surface gets higher (smaller y) ahead → uphill.
    const rise = heightAt(this.terrain, x) - heightAt(this.terrain, nx);
    if (rise > MAX_CLIMB) return; // too steep to climb
    const cost = dx * (1 + Math.max(0, rise) * SLOPE_FUEL);
    if (cost > t.moveLeft) return;
    t.moveLeft -= cost;
    t.x = nx;
  }

  /** Launch a projectile from the current tank. */
  fire(dir: Vec2, power: number): void {
    if (this.phase !== 'aim') return;
    const m = this.muzzle(this.current);
    const p = Math.max(MIN_POWER, Math.min(MAX_POWER, power));
    this.proj = {
      x: m.x,
      y: m.y,
      vx: dir.x * p,
      vy: dir.y * p,
      alive: true,
      trail: [],
    };
    this.phase = 'flying';
  }

  /** AI takes its shot (called by the shell on the AI's turn). */
  aiFire(): void {
    if (this.phase !== 'aim' || this.current.side !== 'ai') return;
    const shot = computeAiShot(
      this.terrain,
      this.current,
      this.opponent,
      this.wind,
      this.difficulty,
      this.rand,
    );
    this.fire(shot.dir, shot.power);
  }

  /** Advance the simulation by real elapsed ms (fixed sub-stepping). */
  update(dtMs: number): void {
    if (this.phase !== 'flying' || !this.proj) return;
    this.acc += Math.min(dtMs, 100);
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS;
      this.stepProjectile();
      if (this.phase !== 'flying') break;
    }
  }

  private stepProjectile(): void {
    const p = this.proj;
    if (!p) return;
    p.vx += this.wind;
    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 60) p.trail.shift();

    // Off the sides/bottom → fizzle, no hit.
    if (p.x < -60 || p.x > GAME_W + 60 || p.y > GAME_H + 60) {
      this.endTurn();
      return;
    }
    // Direct tank hit?
    const foe = this.opponent;
    const foeY = heightAt(this.terrain, foe.x) - 10;
    if (Math.hypot(p.x - foe.x, p.y - foeY) < TANK_HIT_R) {
      this.explode(p.x, p.y);
      return;
    }
    // Terrain hit?
    if (p.y >= heightAt(this.terrain, p.x)) {
      this.explode(p.x, p.y);
    }
  }

  private explode(x: number, y: number): void {
    carve(this.terrain, x, y, BLAST_R);
    this.blast = { x, y, r: BLAST_R, t: performance.now() };
    // Splash damage to both tanks by proximity (you can self-damage).
    for (const t of this.tanks) {
      const ty = heightAt(this.terrain, t.x) - 8;
      const d = Math.hypot(x - t.x, y - ty);
      if (d < BLAST_R + 6) {
        const dmg = Math.round(MAX_DMG * (1 - d / (BLAST_R + 6)));
        if (dmg > 0) {
          t.health = Math.max(0, t.health - dmg);
          if (t !== this.current) this.current.score += dmg;
        }
      }
    }
    this.proj = null;
    if (this.tanks.some((t) => t.health <= 0)) {
      this.phase = 'gameover';
      // Winner = the tank with more health (ties → current shooter).
      this.winner =
        this.tanks[0].health === this.tanks[1].health
          ? this.current.side
          : this.tanks[0].health > this.tanks[1].health
            ? 'player'
            : 'ai';
      return;
    }
    this.endTurn();
  }

  private endTurn(): void {
    this.proj = null;
    this.turnIndex ^= 1;
    this.current.moveLeft = MOVE_BUDGET;
    this.phase = 'aim';
  }

  snapshot(currentPower = 0): Snapshot {
    return {
      phase: this.phase,
      turn: this.current.side,
      wind: this.wind,
      power: currentPower,
      canFire: this.phase === 'aim' && this.current.side === 'player',
      tanks: this.tanks.map((t) => ({
        side: t.side,
        health: t.health,
        score: t.score,
        moveLeft: t.moveLeft,
      })),
      winner: this.winner,
    };
  }
}
