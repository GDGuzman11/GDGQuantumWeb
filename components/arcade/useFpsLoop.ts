'use client';

import { useCallback, useEffect, useRef } from 'react';
import { renderView } from './fps/raycaster';
import { getTextures } from './fps/textures';
import { movePlayer, rotate, type Player } from './fps/player';
import type { Level } from './fps/map';

/** Internal render resolution — low-res, CSS-upscaled for the '93 pixel look. */
const RW = 480;
const RH = 270;
const LOOK_SENS = 0.0024;

export interface FpsGameState {
  level: Level;
  player: Player;
}

/**
 * Drives the FPS: sizes the low-res canvas, reads input (WASD + pointer-lock
 * mouse on desktop; left-stick + right-look from touch controls on mobile),
 * steps the player, and renders the raycaster view each frame.
 *
 * Returns imperative handles the on-screen touch controls push input through.
 */
export function useFpsLoop(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  gameRef: React.MutableRefObject<FpsGameState | null>,
  active: boolean,
) {
  const keys = useRef<Set<string>>(new Set());
  const touchMove = useRef({ fwd: 0, strafe: 0 });
  const lookDX = useRef(0);

  const setMoveAxis = useCallback((strafe: number, fwd: number) => {
    touchMove.current = { strafe, fwd };
  }, []);
  const addLook = useCallback((dx: number) => {
    lookDX.current += dx;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = RW;
    canvas.height = RH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const textures = getTextures();

    const isMoveKey = (k: string) => k === 'w' || k === 'a' || k === 's' || k === 'd' || k.startsWith('arrow');
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!isMoveKey(k)) return;
      if (k.startsWith('arrow')) e.preventDefault();
      keys.current.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Desktop: click to capture the mouse for look.
    const onClick = () => {
      if (!('ontouchstart' in window)) canvas.requestPointerLock?.();
    };
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) lookDX.current += e.movementX;
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
        let fwd = touchMove.current.fwd;
        let strafe = touchMove.current.strafe;
        if (keys.current.has('w') || keys.current.has('arrowup')) fwd += 1;
        if (keys.current.has('s') || keys.current.has('arrowdown')) fwd -= 1;
        if (keys.current.has('d') || keys.current.has('arrowright')) strafe += 1;
        if (keys.current.has('a') || keys.current.has('arrowleft')) strafe -= 1;
        fwd = Math.max(-1, Math.min(1, fwd));
        strafe = Math.max(-1, Math.min(1, strafe));
        if (lookDX.current !== 0) {
          rotate(g.player, lookDX.current * LOOK_SENS);
          lookDX.current = 0;
        }
        movePlayer(g.player, g.level, fwd, strafe, dt);
        renderView(ctx, g.level, g.player, textures, RW, RH);
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
    };
  }, [canvasRef, gameRef, active]);

  return { setMoveAxis, addLook };
}
