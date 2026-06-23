/**
 * Canvas2D renderer for STARSHELL. Draws purely in virtual game coords
 * (GAME_W x GAME_H); the loop sets a transform to scale into the display canvas.
 * Neon-retro look (glow via shadowBlur), with a starfield that ties it to the
 * site's cosmic world. Ambient flourishes are gated by `reduceMotion`.
 */
import { ArcadeEngine } from './engine';
import { heightAt } from './terrain';
import { GAME_H, GAME_W, TANK_HALF_W, type Tank, type Vec2 } from './types';

export interface AimView {
  dir: Vec2;
  power: number; // 0..1
  active: boolean; // show the aim arrow (player's turn, pointer present)
}

let stars: { x: number; y: number; r: number; a: number }[] | null = null;
function ensureStars() {
  if (stars) return stars;
  stars = [];
  let s = 1337;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < 90; i++) {
    stars.push({ x: rnd() * GAME_W, y: rnd() * GAME_H * 0.7, r: rnd() * 1.4 + 0.3, a: rnd() * 0.6 + 0.2 });
  }
  return stars;
}

export function render(
  ctx: CanvasRenderingContext2D,
  eng: ArcadeEngine,
  aim: AimView,
  reduceMotion: boolean,
  now: number,
): void {
  // Screen shake (motion users only) — translate the whole scene a few px.
  const sh = reduceMotion ? 0 : eng.shake;
  const sx = sh ? (Math.random() - 0.5) * sh : 0;
  const sy = sh ? (Math.random() - 0.5) * sh : 0;
  ctx.save();
  ctx.translate(sx, sy);

  // Sky (overscanned so the shake never reveals a hard edge)
  const g = ctx.createLinearGradient(0, 0, 0, GAME_H);
  g.addColorStop(0, '#070b18');
  g.addColorStop(0.6, '#0a0e1a');
  g.addColorStop(1, '#05060c');
  ctx.fillStyle = g;
  ctx.fillRect(-24, -24, GAME_W + 48, GAME_H + 48);

  // Stars (twinkle only when motion is allowed)
  for (const st of ensureStars()) {
    const tw = reduceMotion ? st.a : st.a * (0.6 + 0.4 * Math.sin(now / 600 + st.x));
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#cfe8ff';
    ctx.fillRect(st.x, st.y, st.r, st.r);
  }
  ctx.globalAlpha = 1;

  drawTerrain(ctx, eng);
  for (const t of eng.tanks) drawTank(ctx, eng, t, aim);
  drawProjectiles(ctx, eng);
  drawBeam(ctx, eng, now);
  drawBlast(ctx, eng, now);
  eng.particles.draw(ctx);

  ctx.restore();
}

function drawTerrain(ctx: CanvasRenderingContext2D, eng: ArcadeEngine): void {
  ctx.beginPath();
  ctx.moveTo(-24, GAME_H + 24);
  for (let x = 0; x < GAME_W; x += 2) ctx.lineTo(x, eng.terrain[x]);
  ctx.lineTo(GAME_W, eng.terrain[GAME_W - 1]);
  ctx.lineTo(GAME_W + 24, GAME_H + 24);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, GAME_H * 0.4, 0, GAME_H);
  g.addColorStop(0, '#2a3358');
  g.addColorStop(1, '#11162b');
  ctx.fillStyle = g;
  ctx.fill();
  // Glowing crust line
  ctx.save();
  ctx.strokeStyle = '#6ea8ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#6ea8ff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let x = 0; x < GAME_W; x += 2) (x === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, eng.terrain[x]);
  ctx.stroke();
  ctx.restore();
}

function drawTank(ctx: CanvasRenderingContext2D, eng: ArcadeEngine, t: Tank, aim: AimView): void {
  const y = heightAt(eng.terrain, t.x);
  // Barrel angle: player follows the aim arrow on their turn; otherwise face foe.
  let ang: number;
  if (t === eng.current && t.side === 'player' && aim.active) {
    ang = Math.atan2(aim.dir.y, aim.dir.x);
  } else {
    const foe = eng.tanks.find((o) => o !== t)!;
    ang = Math.atan2(-0.6, foe.x < t.x ? -1 : 1);
  }
  ctx.save();
  ctx.translate(t.x, y - 6);
  // Hull
  ctx.fillStyle = t.color;
  ctx.shadowColor = t.color;
  ctx.shadowBlur = 12;
  roundRect(ctx, -TANK_HALF_W, -8, TANK_HALF_W * 2, 12, 4);
  ctx.fill();
  // Turret + barrel
  ctx.beginPath();
  ctx.arc(0, -8, 6, 0, Math.PI * 2);
  ctx.fillStyle = t.accent;
  ctx.fill();
  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(Math.cos(ang) * 18, -8 + Math.sin(ang) * 18);
  ctx.stroke();
  ctx.restore();

  // Aim arrow + power (player's turn only)
  if (t === eng.current && t.side === 'player' && aim.active) {
    const m = eng.muzzle(t);
    const len = 30 + aim.power * 90;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#aef5c8';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x + aim.dir.x * len, m.y + aim.dir.y * len);
    ctx.stroke();
    ctx.restore();

    // Live aim angle, drawn just past the arrow tip.
    const deg = Math.round((Math.atan2(-aim.dir.y, aim.dir.x) * 180) / Math.PI);
    ctx.save();
    ctx.font = '12px "Press Start 2P", ui-monospace, monospace';
    ctx.fillStyle = '#aef5c8';
    ctx.shadowColor = '#aef5c8';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${deg}°`, m.x + aim.dir.x * (len + 16), m.y + aim.dir.y * (len + 16));
    ctx.restore();
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, eng: ArcadeEngine): void {
  for (const p of eng.projectiles) {
    ctx.save();
    ctx.strokeStyle = hexToRgba(p.weapon.color, 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath();
    p.trail.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.stroke();
    ctx.shadowColor = p.weapon.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.child ? 3 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBeam(ctx: CanvasRenderingContext2D, eng: ArcadeEngine, now: number): void {
  const b = eng.beam;
  if (!b) return;
  const age = (now - b.t) / 180;
  if (age >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - age;
  ctx.strokeStyle = b.color;
  ctx.lineWidth = 3;
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(b.x0, b.y0);
  ctx.lineTo(b.x1, b.y1);
  ctx.stroke();
  ctx.restore();
}

function hexToRgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return `rgba(174,245,200,${a})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

function drawBlast(ctx: CanvasRenderingContext2D, eng: ArcadeEngine, now: number): void {
  const b = eng.blast;
  if (!b) return;
  const age = (now - b.t) / 320;
  if (age >= 1) {
    eng.blast = null;
    return;
  }
  ctx.save();
  ctx.globalAlpha = 1 - age;
  ctx.fillStyle = '#ffd27a';
  ctx.shadowColor = '#ff9d3c';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * (0.4 + age * 0.9), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
