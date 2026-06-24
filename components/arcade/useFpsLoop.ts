'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, type World } from './fps/scene';
import { EYE, MAX_PITCH, stepPlayer, type Player3 } from './fps/physics';
import type { Level3D } from './fps/level3d';
import { updateEnemies, type Difficulty, type Enemy } from './fps/enemy';
import { rayWallDist, raySphere, segBlocked, type Vec3 } from './fps/combat';
import { enemyTex } from './fps/textures';
import { sfx } from './engine/audio';

const RW = 480;
const RH = 270;
const LOOK_SENS = 0.0024;

// Rifle (the F2 starter weapon — hitscan).
const MAG = 30;
const RELOAD = 1.6;
const RATE = 0.11;
const DMG = 26;
const RANGE = 130;
const ENEMY_R = 0.7;

export interface FpsGameState {
  level: Level3D;
  player: Player3;
  enemies: Enemy[];
  difficulty: Difficulty;
  ammo: number;
  reloading: number;
  fireCd: number;
  status: 'playing' | 'won' | 'lost';
  kills: number;
  regenT: number; // seconds hidden (no enemy LoS); regen starts after 2s
}

export interface FpsSnapshot {
  health: number;
  ammo: number;
  mag: number;
  reloading: boolean;
  enemiesLeft: number;
  status: 'playing' | 'won' | 'lost';
  kills: number;
  hitAt: number;
  fireAt: number;
  hurtAt: number;
}

export function useFpsLoop(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  gameRef: React.MutableRefObject<FpsGameState | null>,
  active: boolean,
  onSnapshot: (s: FpsSnapshot) => void,
) {
  const keys = useRef<Set<string>>(new Set());
  const touchMove = useRef({ fwd: 0, strafe: 0 });
  const lookDX = useRef(0);
  const lookDY = useRef(0);
  const fireHeld = useRef(false);
  const reloadReq = useRef(false);

  const setMoveAxis = useCallback((strafe: number, fwd: number) => {
    touchMove.current = { strafe, fwd };
  }, []);
  const addLook = useCallback((dx: number, dy: number) => {
    lookDX.current += dx;
    lookDY.current += dy;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(RW, RH, false);
    const camera = new THREE.PerspectiveCamera(78, RW / RH, 0.1, 320);
    camera.rotation.order = 'YXZ';
    const isTouch = 'ontouchstart' in window;

    let world: World | null = null;
    let builtFor: Level3D | null = null;
    let sprites: THREE.Sprite[] = [];
    let texA: THREE.CanvasTexture | null = null;
    let texB: THREE.CanvasTexture | null = null;
    const tracers: { line: THREE.Line; geo: THREE.BufferGeometry; until: number }[] = [];
    let lastSnap = 0;
    const snap: FpsSnapshot = { health: 100, ammo: MAG, mag: MAG, reloading: false, enemiesLeft: 0, status: 'playing', kills: 0, hitAt: 0, fireAt: 0, hurtAt: 0 };
    const prevPos = { x: 0, z: 0 };

    const disposeExtras = () => {
      for (const s of sprites) {
        world?.scene.remove(s);
        (s.material as THREE.Material).dispose();
      }
      sprites = [];
      texA?.dispose();
      texB?.dispose();
      texA = null;
      texB = null;
      for (const t of tracers) {
        world?.scene.remove(t.line);
        t.geo.dispose();
        (t.line.material as THREE.Material).dispose();
      }
      tracers.length = 0;
    };

    const buildFor = (g: FpsGameState) => {
      disposeExtras();
      world?.dispose();
      world = buildWorld(g.level);
      const mk = (canvas: HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(canvas);
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        return t;
      };
      texA = mk(enemyTex(0));
      texB = mk(enemyTex(1));
      sprites = g.enemies.map(() => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texA!, transparent: true }));
        s.scale.set(1.7, 2.3, 1);
        world!.scene.add(s);
        return s;
      });
      builtFor = g.level;
    };

    const addTracer = (from: Vec3, to: Vec3, color: number) => {
      if (!world) return;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(from[0], from[1], from[2]),
        new THREE.Vector3(to[0], to[1], to[2]),
      ]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      world.scene.add(line);
      tracers.push({ line, geo, until: performance.now() + 55 });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'r') reloadReq.current = true;
      if (k === 'w' || k === 'a' || k === 's' || k === 'd' || k === ' ' || k.startsWith('arrow')) {
        if (k.startsWith('arrow') || k === ' ') e.preventDefault();
        keys.current.add(k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onClick = () => {
      if (!isTouch) canvas.requestPointerLock?.();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        lookDX.current += e.movementX;
        lookDY.current += e.movementY;
      }
    };
    const onMouseDown = () => {
      if (document.pointerLockElement === canvas) fireHeld.current = true;
    };
    const onMouseUp = () => (fireHeld.current = false);
    canvas.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);

    let raf = 0;
    let prev = performance.now();
    let disposed = false;
    const frame = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const g = gameRef.current;
      if (g && active) {
        if (g.level !== builtFor) {
          buildFor(g);
          prevPos.x = g.player.x;
          prevPos.z = g.player.z;
        }
        const p = g.player;
        if (lookDX.current !== 0) {
          p.yaw -= lookDX.current * LOOK_SENS;
          lookDX.current = 0;
        }
        if (lookDY.current !== 0) {
          p.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p.pitch - lookDY.current * LOOK_SENS));
          lookDY.current = 0;
        }
        let fwd = touchMove.current.fwd;
        let strafe = touchMove.current.strafe;
        if (keys.current.has('w') || keys.current.has('arrowup')) fwd += 1;
        if (keys.current.has('s') || keys.current.has('arrowdown')) fwd -= 1;
        if (keys.current.has('d') || keys.current.has('arrowright')) strafe += 1;
        if (keys.current.has('a') || keys.current.has('arrowleft')) strafe -= 1;

        if (g.status === 'playing') {
          stepPlayer(p, g.level, { fwd, strafe, jump: keys.current.has(' ') }, dt);
          const pvx = (p.x - prevPos.x) / Math.max(dt, 0.001);
          const pvz = (p.z - prevPos.z) / Math.max(dt, 0.001);
          prevPos.x = p.x;
          prevPos.z = p.z;

          // Camera forward
          const cp = Math.cos(p.pitch);
          const fx = -cp * Math.sin(p.yaw);
          const fy = Math.sin(p.pitch);
          const fz = -cp * Math.cos(p.yaw);
          const eye: Vec3 = [p.x, p.y + EYE, p.z];
          const dir: Vec3 = [fx, fy, fz];

          // Reload
          if (g.reloading > 0) {
            g.reloading -= dt;
            if (g.reloading <= 0) g.ammo = MAG;
          }
          if (reloadReq.current) {
            reloadReq.current = false;
            if (g.reloading <= 0 && g.ammo < MAG) {
              g.reloading = RELOAD;
              sfx.reload();
            }
          }
          g.fireCd -= dt;

          // Mobile auto-fire when an enemy is in the crosshair cone + visible.
          let autoFire = false;
          if (isTouch) {
            for (const e of g.enemies) {
              if (e.health <= 0) continue;
              const ex = e.x - p.x;
              const ey = e.y + 1.1 - (p.y + EYE);
              const ez = e.z - p.z;
              const el = Math.hypot(ex, ey, ez) || 1;
              if ((ex / el) * fx + (ey / el) * fy + (ez / el) * fz > 0.985 && !segBlocked(eye, [e.x, e.y + 1.1, e.z], g.level)) {
                autoFire = true;
                break;
              }
            }
          }

          // Player fire (hitscan)
          if ((fireHeld.current || autoFire) && g.fireCd <= 0 && g.reloading <= 0 && g.ammo > 0) {
            g.fireCd = RATE;
            g.ammo--;
            snap.fireAt = now;
            sfx.shoot();
            const wallD = rayWallDist(eye, dir, g.level, RANGE);
            let hitT = wallD;
            let hit: Enemy | null = null;
            for (const e of g.enemies) {
              if (e.health <= 0) continue;
              const t = raySphere(eye, dir, [e.x, e.y + 1.0, e.z], ENEMY_R);
              if (t < hitT) {
                hitT = t;
                hit = e;
              }
            }
            addTracer([eye[0] + fx * 0.4, eye[1] - 0.15, eye[2] + fz * 0.4], [eye[0] + fx * hitT, eye[1] + fy * hitT, eye[2] + fz * hitT], 0xffe9a8);
            if (hit) {
              hit.health -= DMG;
              hit.hitFlash = 0.12;
              // Adapt to being shot: go alert, learn your rough position, evade.
              hit.alarm = 4;
              hit.state = 'alert';
              hit.lastSeen = { x: p.x, z: p.z };
              snap.hitAt = now;
              sfx.enemyHit();
              if (hit.health <= 0) g.kills++;
            }
          } else if ((fireHeld.current || autoFire) && g.ammo <= 0 && g.reloading <= 0) {
            g.reloading = RELOAD;
            sfx.reload();
          }

          // Enemies
          const res = updateEnemies(g.enemies, p, g.level, g.difficulty, pvx, pvz, dt, now);
          for (const tr of res.tracers) addTracer(tr.from, [p.x, p.y + EYE - 0.1, p.z], tr.color);
          if (res.damage > 0) {
            p.health = Math.max(0, p.health - res.damage);
            snap.hurtAt = now;
            sfx.hurt();
            if (p.health <= 0) g.status = 'lost';
          }
          // Regen while hidden — start after 2s with no enemy line-of-sight/damage.
          if (res.seen || res.damage > 0) g.regenT = 0;
          else {
            g.regenT += dt;
            if (g.regenT > 2) p.health = Math.min(100, p.health + 24 * dt);
          }
          if (g.enemies.every((e) => e.health <= 0)) g.status = 'won';
        }

        // Sprites (running gait: vertical bob + 2-frame swap + hit-flash tint)
        for (let i = 0; i < sprites.length; i++) {
          const e = g.enemies[i];
          const s = sprites[i];
          s.visible = e.health > 0;
          if (e.health <= 0) continue;
          const bob = Math.abs(Math.sin(e.step * 3.0)) * 0.14;
          s.position.set(e.x, e.y + 1.15 + bob, e.z);
          const mat = s.material as THREE.SpriteMaterial;
          const want = Math.floor(e.step * 2.2) % 2 === 0 ? texA : texB;
          if (mat.map !== want) {
            mat.map = want;
            mat.needsUpdate = true;
          }
          mat.color.setHex(e.hitFlash > 0 ? 0xff7777 : 0xffffff);
        }
        for (let i = tracers.length - 1; i >= 0; i--) {
          if (now > tracers[i].until) {
            world?.scene.remove(tracers[i].line);
            tracers[i].geo.dispose();
            (tracers[i].line.material as THREE.Material).dispose();
            tracers.splice(i, 1);
          }
        }

        camera.position.set(p.x, p.y + EYE, p.z);
        camera.rotation.y = p.yaw;
        camera.rotation.x = p.pitch;
        if (world) renderer.render(world.scene, camera);

        if (now - lastSnap > 70) {
          lastSnap = now;
          snap.health = p.health;
          snap.ammo = g.ammo;
          snap.reloading = g.reloading > 0;
          snap.enemiesLeft = g.enemies.filter((e) => e.health > 0).length;
          snap.status = g.status;
          snap.kills = g.kills;
          onSnapshot({ ...snap });
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      disposeExtras();
      world?.dispose();
      renderer.dispose();
    };
  }, [canvasRef, gameRef, active, onSnapshot]);

  return { setMoveAxis, addLook };
}
