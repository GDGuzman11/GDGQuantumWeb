/**
 * Pooled particle system — explosions, smoke, debris, muzzle sparks. Drawn with
 * additive blending for a neon glow. dt is in ms; velocities are per-60fps step.
 */
import type { ExplosionStyle } from './types';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // ms remaining
  max: number; // ms total
  size: number;
  color: string;
  grav: number; // downward accel per step
  drag: number; // velocity retention per step
}

const CAP = 420;

export class ParticleSystem {
  private ps: Particle[] = [];

  get count(): number {
    return this.ps.length;
  }

  private add(p: Particle) {
    if (this.ps.length >= CAP) this.ps.shift();
    this.ps.push(p);
  }

  /** An impact effect, varying by `style` + tinted by the weapon `color`. */
  explosion(x: number, y: number, scale = 1, color = '#ffb14a', style: ExplosionStyle = 'burst'): void {
    const smoke = (n: number) => {
      for (let i = 0; i < Math.round(n * scale); i++) {
        const a = Math.random() * Math.PI * 2;
        this.add({
          x, y,
          vx: Math.cos(a) * 1.2,
          vy: Math.sin(a) * 1.2 - 1.4,
          life: 500 + Math.random() * 500, max: 1000,
          size: 4 + Math.random() * 6 * scale,
          color: 'rgba(120,130,160,0.45)', grav: -0.02, drag: 0.93,
        });
      }
    };

    switch (style) {
      case 'ring': {
        const n = Math.round(26 * scale);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const s = (5 + Math.random() * 2) * scale;
          this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 360, max: 360, size: 2.4, color, grav: 0.02, drag: 0.92 });
        }
        smoke(6);
        break;
      }
      case 'shards': {
        for (let i = 0; i < Math.round(12 * scale); i++) {
          const a = Math.random() * Math.PI * 2;
          const s = (5 + Math.random() * 6) * scale;
          this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 300 + Math.random() * 200, max: 520, size: 1 + Math.random() * 1.5, color, grav: 0.18, drag: 0.99 });
        }
        smoke(4);
        break;
      }
      case 'sparkle': {
        for (let i = 0; i < Math.round(30 * scale); i++) {
          const a = Math.random() * Math.PI * 2;
          const s = (0.5 + Math.random() * 2.5) * scale;
          this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.5, life: 500 + Math.random() * 500, max: 1000, size: 0.8 + Math.random() * 1.6, color: Math.random() < 0.5 ? color : '#ffffff', grav: 0.03, drag: 0.97 });
        }
        break;
      }
      case 'plume': {
        for (let i = 0; i < Math.round(22 * scale); i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
          const s = (3 + Math.random() * 7) * scale;
          this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 500 + Math.random() * 400, max: 900, size: 1.5 + Math.random() * 3, color: Math.random() < 0.6 ? color : '#5a6b8c', grav: 0.16, drag: 0.98 });
        }
        smoke(3);
        break;
      }
      case 'implode': {
        const n = Math.round(24 * scale);
        const R = 34 * scale;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          this.add({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R, vx: -Math.cos(a) * 4, vy: -Math.sin(a) * 4, life: 360, max: 360, size: 2, color, grav: 0, drag: 0.96 });
        }
        smoke(4);
        break;
      }
      default: {
        // 'burst' — sparks + smoke + dirt debris.
        for (let i = 0; i < Math.round(16 * scale); i++) {
          const a = Math.random() * Math.PI * 2;
          const s = (1.5 + Math.random() * 5) * scale;
          this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 380 + Math.random() * 280, max: 660, size: 1.5 + Math.random() * 2.5, color: Math.random() < 0.5 ? '#fff6d8' : color, grav: 0.12, drag: 0.96 });
        }
        smoke(8);
        for (let i = 0; i < Math.round(10 * scale); i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2;
          const s = 2 + Math.random() * 5;
          this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 500 + Math.random() * 400, max: 900, size: 1.5 + Math.random() * 2, color: '#5a6b8c', grav: 0.16, drag: 0.99 });
        }
      }
    }
  }

  /** A small flash when a shell launches. */
  muzzle(x: number, y: number, dx: number, dy: number): void {
    for (let i = 0; i < 8; i++) {
      this.add({
        x, y,
        vx: dx * (1 + Math.random()) + (Math.random() - 0.5) * 2,
        vy: dy * (1 + Math.random()) + (Math.random() - 0.5) * 2,
        life: 160 + Math.random() * 160,
        max: 320,
        size: 1 + Math.random() * 2,
        color: '#aef5c8',
        grav: 0.05,
        drag: 0.9,
      });
    }
  }

  update(dtMs: number): void {
    const k = dtMs / (1000 / 60);
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.life -= dtMs;
      if (p.life <= 0) {
        this.ps.splice(i, 1);
        continue;
      }
      p.vy += p.grav * k;
      p.vx *= Math.pow(p.drag, k);
      p.vy *= Math.pow(p.drag, k);
      p.x += p.vx * k;
      p.y += p.vy * k;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.ps) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
