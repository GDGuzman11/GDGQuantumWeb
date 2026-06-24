'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, type World } from './fps/scene';
import { EYE, MAX_PITCH, stepPlayer, type Player3 } from './fps/physics';
import type { Level3D } from './fps/level3d';
import { updateEnemies, type Difficulty, type Enemy } from './fps/enemy';
import { rayWallDist, raySphere, segBlocked, type Vec3 } from './fps/combat';
import { enemyTex } from './fps/textures';
import type { GunDef } from './fps/weapons';
import { sfx } from './engine/audio';

const RW = 480;
const RH = 270;
const LOOK_SENS = 0.0024;
const RANGE = 200;
const ENEMY_R = 0.7;

export interface FpsGameState {
  level: Level3D;
  player: Player3;
  enemies: Enemy[];
  difficulty: Difficulty;
  guns: GunDef[];
  active: number;
  mags: number[];
  reserves: number[];
  ads: boolean;
  reloading: number;
  fireCd: number;
  status: 'playing' | 'won' | 'lost';
  kills: number;
  regenT: number;
}

export interface FpsSnapshot {
  health: number;
  weapon: string;
  family: string;
  mag: number;
  reserve: number;
  reloading: boolean;
  ads: boolean;
  scoped: boolean;
  slots: { name: string; active: boolean }[];
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
  const adsHeld = useRef(false);
  const mobileAds = useRef(false);
  const reloadReq = useRef(false);
  const prevFire = useRef(false);
  const switchReq = useRef<number | 'next' | 'prev' | null>(null);

  const setMoveAxis = useCallback((strafe: number, fwd: number) => {
    touchMove.current = { strafe, fwd };
  }, []);
  const addLook = useCallback((dx: number, dy: number) => {
    lookDX.current += dx;
    lookDY.current += dy;
  }, []);
  const cycleWeapon = useCallback((dir: 1 | -1) => {
    switchReq.current = dir > 0 ? 'next' : 'prev';
  }, []);
  const setAds = useCallback((v: boolean) => {
    mobileAds.current = v;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(RW, RH, false);
    const camera = new THREE.PerspectiveCamera(78, RW / RH, 0.1, 360);
    camera.rotation.order = 'YXZ';
    const isTouch = 'ontouchstart' in window;

    let world: World | null = null;
    let builtFor: Level3D | null = null;
    let sprites: THREE.Sprite[] = [];
    let texA: THREE.CanvasTexture | null = null;
    let texB: THREE.CanvasTexture | null = null;
    const tracers: { line: THREE.Line; geo: THREE.BufferGeometry; until: number }[] = [];
    let lastSnap = 0;
    const snap: FpsSnapshot = {
      health: 100, weapon: '', family: '', mag: 0, reserve: 0, reloading: false, ads: false, scoped: false,
      slots: [], enemiesLeft: 0, status: 'playing', kills: 0, hitAt: 0, fireAt: 0, hurtAt: 0,
    };
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
      const mk = (canvas2: HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(canvas2);
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
      if (k === '1' || k === '2' || k === '3') switchReq.current = Number(k) - 1;
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
    const locked = () => document.pointerLockElement === canvas;
    const onMouseDown = (e: MouseEvent) => {
      if (!locked()) return;
      if (e.button === 0) fireHeld.current = true;
      if (e.button === 2) adsHeld.current = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) fireHeld.current = false;
      if (e.button === 2) adsHeld.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (locked()) switchReq.current = e.deltaY > 0 ? 'next' : 'prev';
    };
    const onCtx = (e: Event) => e.preventDefault();
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', onCtx);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', onWheel, { passive: true });

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
          // Weapon switch
          if (switchReq.current !== null) {
            const n = g.guns.length;
            const req = switchReq.current;
            g.active = req === 'next' ? (g.active + 1) % n : req === 'prev' ? (g.active - 1 + n) % n : Math.min(n - 1, Math.max(0, req));
            switchReq.current = null;
            g.reloading = 0;
            g.fireCd = 0.22;
            sfx.swap();
          }
          const gun = g.guns[g.active];

          // ADS
          g.ads = adsHeld.current || mobileAds.current;
          const wantFov = g.ads ? gun.adsFov : gun.hipFov;
          if (Math.abs(camera.fov - wantFov) > 0.1) {
            camera.fov = wantFov;
            camera.updateProjectionMatrix();
          }

          stepPlayer(p, g.level, { fwd, strafe, jump: keys.current.has(' ') }, dt);
          const pvx = (p.x - prevPos.x) / Math.max(dt, 0.001);
          const pvz = (p.z - prevPos.z) / Math.max(dt, 0.001);
          prevPos.x = p.x;
          prevPos.z = p.z;

          const cp = Math.cos(p.pitch);
          const fx = -cp * Math.sin(p.yaw);
          const fy = Math.sin(p.pitch);
          const fz = -cp * Math.cos(p.yaw);
          const eye: Vec3 = [p.x, p.y + EYE, p.z];
          const dir: Vec3 = [fx, fy, fz];

          // Reload
          if (g.reloading > 0) {
            g.reloading -= dt;
            if (g.reloading <= 0) {
              const need = gun.mag - g.mags[g.active];
              const take = Math.min(need, g.reserves[g.active]);
              g.mags[g.active] += take;
              g.reserves[g.active] -= take;
            }
          }
          if (reloadReq.current) {
            reloadReq.current = false;
            if (g.reloading <= 0 && g.mags[g.active] < gun.mag && g.reserves[g.active] > 0) {
              g.reloading = gun.reload;
              sfx.reload();
            }
          }
          g.fireCd -= dt;

          // Mobile auto-fire when a target is in the crosshair cone + visible.
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

          const fireInput = fireHeld.current || autoFire;
          const wantShot = gun.auto ? fireInput : fireInput && !prevFire.current;
          prevFire.current = fireInput;

          if (wantShot && g.fireCd <= 0 && g.reloading <= 0 && g.mags[g.active] > 0) {
            g.fireCd = gun.rate;
            g.mags[g.active]--;
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
            addTracer([eye[0] + fx * 0.4, eye[1] - 0.12, eye[2] + fz * 0.4], [eye[0] + fx * hitT, eye[1] + fy * hitT, eye[2] + fz * hitT], gun.color);
            if (hit) {
              hit.health -= gun.dmg;
              hit.hitFlash = 0.12;
              hit.alarm = 4;
              hit.state = 'alert';
              hit.lastSeen = { x: p.x, z: p.z };
              snap.hitAt = now;
              sfx.enemyHit();
              if (hit.health <= 0) g.kills++;
            }
          } else if (wantShot && g.mags[g.active] <= 0 && g.reloading <= 0 && g.reserves[g.active] > 0) {
            g.reloading = gun.reload;
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
          if (res.seen || res.damage > 0) g.regenT = 0;
          else {
            g.regenT += dt;
            if (g.regenT > 2) p.health = Math.min(100, p.health + 24 * dt);
          }
          if (g.enemies.every((e) => e.health <= 0)) g.status = 'won';
        }

        // Sprites (running gait + 2-frame swap + hit-flash tint)
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
          const gun = g.guns[g.active];
          snap.health = p.health;
          snap.weapon = gun.name;
          snap.family = gun.family;
          snap.mag = g.mags[g.active];
          snap.reserve = g.reserves[g.active];
          snap.reloading = g.reloading > 0;
          snap.ads = g.ads;
          snap.scoped = gun.scoped;
          snap.slots = g.guns.map((gg, i) => ({ name: gg.name, active: i === g.active }));
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
      canvas.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('wheel', onWheel);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      disposeExtras();
      world?.dispose();
      renderer.dispose();
    };
  }, [canvasRef, gameRef, active, onSnapshot]);

  return { setMoveAxis, addLook, cycleWeapon, setAds };
}
