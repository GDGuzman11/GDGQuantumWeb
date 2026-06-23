/**
 * STARSHELL core engine — turn state machine + weapon-driven, multi-projectile
 * physics + damage. Framework-agnostic: the React shell feeds input and reads
 * snapshots; the renderer draws from its public fields.
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
  type Weapon,
} from './types';
import { carve, generateTerrain, heightAt, mound, rng, type Terrain } from './terrain';
import { computeAiShot, type Difficulty } from './ai';
import { ParticleSystem } from './particles';
import type { TankDef } from './tanks';

/** Sound/feedback cues the shell drains each frame to play SFX. */
export type GameEvent = 'fire' | 'explosion' | 'hit' | 'win' | 'lose';

const MAX_CLIMB = 3.4; // uphill rise (px/step) above this is impassable
const SLOPE_FUEL = 2.6; // extra fuel multiplier per px of uphill rise

export interface EngineOpts {
  seed: number;
  difficulty: Difficulty;
  playerTank: TankDef;
  aiTank: TankDef;
  loadout: Weapon[]; // the player's chosen 20
  aiArsenal: Weapon[]; // weapons the AI may use
  rough?: number;
  wind?: number;
}

export class ArcadeEngine {
  terrain: Terrain;
  tanks: [Tank, Tank]; // [player, ai]
  projectiles: Projectile[] = [];
  phase: Phase = 'aim';
  turnIndex = 0; // 0 = player, 1 = ai
  wind: number;
  winner: Side | null = null;
  difficulty: Difficulty;

  blast: { x: number; y: number; r: number; t: number } | null = null;
  beam: { x0: number; y0: number; x1: number; y1: number; t: number; color: string } | null = null;
  particles = new ParticleSystem();
  shake = 0;
  events: GameEvent[] = [];

  loadout: Weapon[];
  selectedIndex = 0;
  private aiArsenal: Weapon[];
  private rand: () => number;
  private acc = 0;
  private spawn: Projectile[] = []; // children queued during a step

  constructor(opts: EngineOpts) {
    this.rand = rng(opts.seed ^ 0x9e3779b9);
    this.terrain = generateTerrain(opts.seed, opts.rough ?? 1);
    this.difficulty = opts.difficulty;
    this.loadout = opts.loadout;
    this.aiArsenal = opts.aiArsenal;
    this.wind = opts.wind ?? (this.rand() * 2 - 1) * 0.05;
    this.tanks = [
      this.makeTank('player', GAME_W * 0.16, opts.playerTank),
      this.makeTank('ai', GAME_W * 0.84, opts.aiTank),
    ];
  }

  private makeTank(side: Side, x: number, def: TankDef): Tank {
    const maxMove = MOVE_BUDGET * def.moveMul;
    return {
      side,
      tankId: def.id,
      x,
      health: START_HEALTH,
      score: 0,
      moveLeft: maxMove,
      maxMove,
      dmgTakenMul: def.dmgTakenMul,
      blastMul: def.blastMul,
      color: def.color,
      accent: def.accent,
    };
  }

  get current(): Tank {
    return this.tanks[this.turnIndex];
  }
  get opponent(): Tank {
    return this.tanks[this.turnIndex ^ 1];
  }
  muzzle(t: Tank): Vec2 {
    return { x: t.x, y: heightAt(this.terrain, t.x) - 16 };
  }
  get currentWeapon(): Weapon {
    return this.loadout[this.selectedIndex];
  }

  aimFromPointer(px: number, py: number): { dir: Vec2; power: number } {
    const m = this.muzzle(this.current);
    const dx = px - m.x;
    const dy = py - m.y;
    const dist = Math.hypot(dx, dy) || 1;
    const power = MIN_POWER + (MAX_POWER - MIN_POWER) * Math.min(1, dist / AIM_MAX_DIST);
    return { dir: { x: dx / dist, y: dy / dist }, power };
  }

  /** Cycle the player's selected weapon (dir = -1 / +1). */
  cycleWeapon(dir: -1 | 1): void {
    if (this.phase !== 'aim' || this.current.side !== 'player') return;
    const n = this.loadout.length;
    this.selectedIndex = (this.selectedIndex + dir + n) % n;
  }

  move(dir: -1 | 1): void {
    if (this.phase !== 'aim') return;
    const t = this.current;
    if (t.moveLeft <= 0) return;
    const x = t.x;
    const nx = Math.max(20, Math.min(GAME_W - 20, x + dir * MOVE_SPEED));
    const dx = Math.abs(nx - x);
    if (dx < 0.01) return;
    const rise = heightAt(this.terrain, x) - heightAt(this.terrain, nx);
    if (rise > MAX_CLIMB) return; // too steep
    const cost = dx * (1 + Math.max(0, rise) * SLOPE_FUEL);
    if (cost > t.moveLeft) return;
    t.moveLeft -= cost;
    t.x = nx;
  }

  /** Player fires the currently selected weapon. */
  playerFire(dir: Vec2, power: number): void {
    if (this.phase !== 'aim' || this.current.side !== 'player') return;
    this.fire(dir, power, this.currentWeapon);
  }

  /** AI picks a weapon + firing solution and shoots. */
  aiFire(): void {
    if (this.phase !== 'aim' || this.current.side !== 'ai') return;
    const w = this.aiArsenal[Math.floor(this.rand() * this.aiArsenal.length)];
    const shot = computeAiShot(this.terrain, this.current, this.opponent, this.wind, this.difficulty, this.rand);
    this.fire(shot.dir, shot.power, w);
  }

  private fire(dir: Vec2, power: number, raw: Weapon): void {
    const shooter = this.current;
    const w: Weapon =
      shooter.blastMul !== 1
        ? { ...raw, blastR: Math.round(raw.blastR * shooter.blastMul) }
        : raw;
    const m = this.muzzle(shooter);
    this.particles.muzzle(m.x, m.y, dir.x * 3, dir.y * 3);
    this.events.push('fire');

    if (w.kind === 'beam') {
      this.fireBeam(m, dir, w);
      return;
    }
    if (w.kind === 'spread') {
      const base = Math.atan2(dir.y, dir.x);
      for (let i = 0; i < w.count; i++) {
        const off = (i - (w.count - 1) / 2) * 0.13;
        const a = base + off;
        this.spawnProjectile(m.x, m.y, Math.cos(a) * power, Math.sin(a) * power, w);
      }
    } else {
      this.spawnProjectile(m.x, m.y, dir.x * power, dir.y * power, w);
    }
    this.phase = 'flying';
  }

  private spawnProjectile(x: number, y: number, vx: number, vy: number, w: Weapon, child = false): Projectile {
    const p: Projectile = {
      x, y, vx, vy,
      alive: true,
      trail: [],
      weapon: w,
      bounces: w.bounces,
      child,
      rolling: false,
      rollLeft: 0,
    };
    this.projectiles.push(p);
    return p;
  }

  private fireBeam(m: Vec2, dir: Vec2, w: Weapon): void {
    let hx = m.x;
    let hy = m.y;
    let hit = false;
    for (let t = 6; t < 1300; t += 4) {
      hx = m.x + dir.x * t;
      hy = m.y + dir.y * t;
      if (hx < -20 || hx > GAME_W + 20 || hy > GAME_H + 20 || hy < -20) break;
      const foe = this.opponent;
      const foeY = heightAt(this.terrain, foe.x) - 10;
      if (Math.hypot(hx - foe.x, hy - foeY) < TANK_HIT_R) {
        hit = true;
        break;
      }
      if (hy >= heightAt(this.terrain, hx)) {
        hit = true;
        break;
      }
    }
    this.beam = { x0: m.x, y0: m.y, x1: hx, y1: hy, t: performance.now(), color: w.color };
    const over = hit ? this.applyBlast(hx, hy, w) : false;
    if (!over) this.endTurn();
  }

  update(dtMs: number): void {
    const dt = Math.min(dtMs, 100);
    this.particles.update(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.03);
    if (this.beam && performance.now() - this.beam.t > 180) this.beam = null;

    if (this.phase === 'flying') {
      this.acc += dt;
      while (this.acc >= STEP_MS) {
        this.acc -= STEP_MS;
        this.stepAll();
        if (this.phase !== 'flying') break;
      }
      if (this.phase === 'flying' && this.projectiles.length === 0) this.endTurn();
    }
  }

  private stepAll(): void {
    this.spawn = [];
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      this.stepProjectile(p);
      if (this.phase !== 'flying') break;
    }
    this.projectiles = this.projectiles.filter((p) => p.alive).concat(this.spawn);
  }

  private stepProjectile(p: Projectile): void {
    const w = p.weapon;

    if (p.rolling) {
      const left = heightAt(this.terrain, p.x - 3);
      const right = heightAt(this.terrain, p.x + 3);
      const dirx = right > left ? 1 : -1; // roll toward the lower ground
      const speed = 2.4;
      p.x += dirx * speed;
      p.rollLeft -= speed;
      p.y = heightAt(this.terrain, p.x) - 2;
      const foe = this.opponent;
      if (p.rollLeft <= 0 || Math.abs(p.x - foe.x) < TANK_HIT_R || p.x < 6 || p.x > GAME_W - 6) {
        this.onImpact(p, p.x, heightAt(this.terrain, p.x));
      }
      return;
    }

    if (w.kind === 'homing') {
      const foe = this.opponent;
      const fy = heightAt(this.terrain, foe.x) - 10;
      const dx = foe.x - p.x;
      const dy = fy - p.y;
      const dl = Math.hypot(dx, dy) || 1;
      const speed = Math.hypot(p.vx, p.vy) || 1;
      const blend = 0.07;
      let nvx = p.vx * (1 - blend) + (dx / dl) * speed * blend;
      let nvy = p.vy * (1 - blend) + (dy / dl) * speed * blend;
      const nl = Math.hypot(nvx, nvy) || 1;
      p.vx = (nvx / nl) * speed;
      p.vy = (nvy / nl) * speed;
    }

    p.vx += this.wind;
    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 50) p.trail.shift();

    if (p.x < -80 || p.x > GAME_W + 80 || p.y > GAME_H + 80 || p.y < -320) {
      p.alive = false;
      return;
    }
    const foe = this.opponent;
    const foeY = heightAt(this.terrain, foe.x) - 10;
    if (Math.hypot(p.x - foe.x, p.y - foeY) < TANK_HIT_R) {
      this.onImpact(p, p.x, p.y);
      return;
    }
    if (p.y >= heightAt(this.terrain, p.x)) {
      if (w.kind === 'bouncer' && p.bounces > 0) {
        p.bounces--;
        const slope = (heightAt(this.terrain, p.x + 3) - heightAt(this.terrain, p.x - 3)) / 6;
        const nl = Math.hypot(-slope, 1) || 1;
        const nx = -slope / nl;
        const ny = 1 / nl;
        const dot = p.vx * nx + p.vy * ny;
        p.vx = (p.vx - 2 * dot * nx) * 0.72;
        p.vy = (p.vy - 2 * dot * ny) * 0.72;
        p.y = heightAt(this.terrain, p.x) - 3;
        return;
      }
      if (w.kind === 'roller' && !p.rolling) {
        p.rolling = true;
        p.rollLeft = 130;
        p.y = heightAt(this.terrain, p.x) - 2;
        return;
      }
      this.onImpact(p, p.x, heightAt(this.terrain, p.x));
    }
  }

  private onImpact(p: Projectile, x: number, y: number): void {
    const w = p.weapon;
    p.alive = false;
    if (w.kind === 'digger') {
      for (let d = 0; d < 5; d++) carve(this.terrain, x, y + d * 12, w.blastR * 0.8);
    }
    const over = this.applyBlast(x, y, w);
    if (over || p.child) return;
    if (w.kind === 'cluster') {
      const cw = childWeapon(w);
      for (let i = 0; i < w.count; i++) {
        const a = -Math.PI / 2 + (this.rand() - 0.5) * 1.6;
        const s = 3 + this.rand() * 3;
        this.spawn.push(mkChild(x, y - 4, Math.cos(a) * s, Math.sin(a) * s, cw));
      }
    } else if (w.kind === 'airstrike') {
      const cw = childWeapon(w);
      for (let i = 0; i < w.count; i++) {
        const bx = x + (i - (w.count - 1) / 2) * 26 + (this.rand() - 0.5) * 8;
        this.spawn.push(mkChild(bx, -12, (this.rand() - 0.5) * 1.2, 2, cw));
      }
    }
  }

  private applyBlast(x: number, y: number, w: Weapon): boolean {
    if (w.terrain === 'mound') mound(this.terrain, x, y, w.blastR);
    else if (w.terrain === 'carve') carve(this.terrain, x, y, w.blastR);
    this.blast = { x, y, r: w.blastR, t: performance.now() };
    this.particles.explosion(x, y, w.blastR / 38, w.color, w.fx);
    this.shake = Math.min(22, this.shake + w.blastR * 0.28);
    this.events.push('explosion');

    let hit = false;
    for (const t of this.tanks) {
      const ty = heightAt(this.terrain, t.x) - 8;
      const d = Math.hypot(x - t.x, y - ty);
      if (d < w.blastR + 6) {
        const dmg = Math.round(w.damage * (1 - d / (w.blastR + 6)) * t.dmgTakenMul);
        if (dmg > 0) {
          t.health = Math.max(0, t.health - dmg);
          if (t !== this.current) this.current.score += dmg;
          hit = true;
        }
      }
    }
    if (hit) this.events.push('hit');

    if (this.tanks.some((t) => t.health <= 0)) {
      this.phase = 'gameover';
      this.winner =
        this.tanks[0].health === this.tanks[1].health
          ? this.current.side
          : this.tanks[0].health > this.tanks[1].health
            ? 'player'
            : 'ai';
      this.events.push(this.winner === 'player' ? 'win' : 'lose');
      return true;
    }
    return false;
  }

  private endTurn(): void {
    this.projectiles = [];
    this.turnIndex ^= 1;
    this.current.moveLeft = this.current.maxMove;
    this.phase = 'aim';
  }

  snapshot(currentPower = 0, angle = 0): Snapshot {
    return {
      phase: this.phase,
      turn: this.current.side,
      wind: this.wind,
      power: currentPower,
      angle,
      canFire: this.phase === 'aim' && this.current.side === 'player',
      weaponName: this.currentWeapon?.name ?? '',
      weaponDamage: this.currentWeapon?.damage ?? 0,
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

function childWeapon(w: Weapon): Weapon {
  return {
    id: `${w.id}-c`,
    name: w.name,
    kind: 'single',
    blastR: Math.max(14, Math.round(w.blastR * 0.7)),
    damage: w.damage,
    color: w.color,
    fx: w.fx,
    count: 0,
    bounces: 0,
    terrain: 'carve',
  };
}

function mkChild(x: number, y: number, vx: number, vy: number, w: Weapon): Projectile {
  return { x, y, vx, vy, alive: true, trail: [], weapon: w, bounces: 0, child: true, rolling: false, rollLeft: 0 };
}
