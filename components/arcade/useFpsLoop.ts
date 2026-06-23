'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, type World } from './fps/scene';
import { EYE, MAX_PITCH, stepPlayer, type Player3 } from './fps/physics';
import type { Level3D } from './fps/level3d';

/** Internal render resolution — low-res, CSS-upscaled for the '93 pixel look. */
const RW = 480;
const RH = 270;
const LOOK_SENS = 0.0024;

export interface FpsGameState {
  level: Level3D;
  player: Player3;
}

/**
 * Drives the 3D FPS: a low-res Three.js renderer + perspective camera, input
 * (WASD + jump + pointer-lock mouse on desktop; left-stick + right-look on
 * touch), player physics, and per-frame render. Rebuilds the world when the
 * level changes. Returns handles the on-screen touch controls push input to.
 */
export function useFpsLoop(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  gameRef: React.MutableRefObject<FpsGameState | null>,
  active: boolean,
) {
  const keys = useRef<Set<string>>(new Set());
  const touchMove = useRef({ fwd: 0, strafe: 0 });
  const lookDX = useRef(0);
  const lookDY = useRef(0);

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
    const camera = new THREE.PerspectiveCamera(75, RW / RH, 0.1, 240);
    camera.rotation.order = 'YXZ';

    let world: World | null = null;
    let builtFor: Level3D | null = null;

    const isMoveKey = (k: string) =>
      k === 'w' || k === 'a' || k === 's' || k === 'd' || k === ' ' || k.startsWith('arrow');
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!isMoveKey(k)) return;
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
      keys.current.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onClick = () => {
      if (!('ontouchstart' in window)) canvas.requestPointerLock?.();
    };
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        lookDX.current += e.movementX;
        lookDY.current += e.movementY;
      }
    };
    canvas.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouse);

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
          world?.dispose();
          world = buildWorld(g.level);
          builtFor = g.level;
        }
        const p = g.player;
        // Look
        if (lookDX.current !== 0) {
          p.yaw -= lookDX.current * LOOK_SENS;
          lookDX.current = 0;
        }
        if (lookDY.current !== 0) {
          p.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p.pitch - lookDY.current * LOOK_SENS));
          lookDY.current = 0;
        }
        // Move input
        let fwd = touchMove.current.fwd;
        let strafe = touchMove.current.strafe;
        if (keys.current.has('w') || keys.current.has('arrowup')) fwd += 1;
        if (keys.current.has('s') || keys.current.has('arrowdown')) fwd -= 1;
        if (keys.current.has('d') || keys.current.has('arrowright')) strafe += 1;
        if (keys.current.has('a') || keys.current.has('arrowleft')) strafe -= 1;
        stepPlayer(p, g.level, { fwd, strafe, jump: keys.current.has(' ') }, dt);
        // Camera
        camera.position.set(p.x, p.y + EYE, p.z);
        camera.rotation.y = p.yaw;
        camera.rotation.x = p.pitch;
        if (world) renderer.render(world.scene, camera);
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
      document.removeEventListener('mousemove', onMouse);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      world?.dispose();
      renderer.dispose();
    };
  }, [canvasRef, gameRef, active]);

  return { setMoveAxis, addLook };
}
