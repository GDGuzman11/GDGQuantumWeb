'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ArcadeEngine } from './engine/engine';
import { render, type AimView } from './engine/render';
import {
  GAME_H,
  GAME_W,
  MAX_POWER,
  MIN_POWER,
  type Snapshot,
} from './engine/types';

/**
 * Drives a STARSHELL battle: sizes the canvas (DPR-aware, 16:9), tracks the
 * pointer for aiming, runs the fixed-step engine + renderer in one rAF loop,
 * schedules the AI's turn, and pushes throttled HUD snapshots up to React.
 *
 * Returns imperative handles for the on-screen buttons (move / fire) since the
 * pointer only aims — firing and left/right movement are buttons.
 */
export function useGameLoop(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  engineRef: React.MutableRefObject<ArcadeEngine | null>,
  reduceMotion: boolean,
  onSnapshot: (s: Snapshot) => void,
) {
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const aim = useRef<AimView>({ dir: { x: 1, y: -1 }, power: 0, active: false });
  const moveDir = useRef<-1 | 0 | 1>(0);
  const aiPending = useRef(false);
  const lastSnap = useRef(0);

  // Latest aim handles for the Fire button.
  const fire = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || !aim.current.active) return;
    if (eng.phase !== 'aim' || eng.current.side !== 'player') return;
    const a = eng.aimFromPointer(
      pointer.current ? pointer.current.x : eng.current.x + 80,
      pointer.current ? pointer.current.y : eng.muzzle(eng.current).y - 80,
    );
    eng.fire(a.dir, a.power);
  }, [engineRef]);

  const setMove = useCallback((dir: -1 | 0 | 1) => {
    moveDir.current = dir;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let prev = performance.now();
    let disposed = false;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const toGame = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current = {
        x: ((clientX - rect.left) / rect.width) * GAME_W,
        y: ((clientY - rect.top) / rect.height) * GAME_H,
      };
    };
    const onMove = (e: PointerEvent) => toGame(e.clientX, e.clientY);
    const onLeave = () => (pointer.current = null);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    const frame = (now: number) => {
      if (disposed) return;
      const dt = now - prev;
      prev = now;
      const eng = engineRef.current;
      if (eng) {
        // Continuous tank movement while a move button is held (player turn).
        if (moveDir.current !== 0 && eng.phase === 'aim' && eng.current.side === 'player') {
          eng.move(moveDir.current);
        }
        // Aim from the pointer (player's turn).
        if (eng.phase === 'aim' && eng.current.side === 'player' && pointer.current) {
          const a = eng.aimFromPointer(pointer.current.x, pointer.current.y);
          aim.current = {
            dir: a.dir,
            power: (a.power - MIN_POWER) / (MAX_POWER - MIN_POWER),
            active: true,
          };
        } else if (eng.current.side !== 'player' || eng.phase !== 'aim') {
          aim.current.active = false;
        }
        // Schedule the AI's shot.
        if (eng.phase === 'aim' && eng.current.side === 'ai' && !aiPending.current) {
          aiPending.current = true;
          window.setTimeout(() => {
            aiPending.current = false;
            engineRef.current?.aiFire();
          }, reduceMotion ? 350 : 850);
        }
        eng.update(dt);

        const scale = canvas.width / GAME_W;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        render(ctx, eng, aim.current, reduceMotion, now);

        if (now - lastSnap.current > 80) {
          lastSnap.current = now;
          onSnapshot(eng.snapshot(aim.current.active ? aim.current.power : 0));
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [canvasRef, engineRef, reduceMotion, onSnapshot]);

  return { fire, setMove };
}
