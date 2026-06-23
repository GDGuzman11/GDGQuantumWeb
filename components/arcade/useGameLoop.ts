'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ArcadeEngine } from './engine/engine';
import { sfx } from './engine/audio';
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
  const moveDir = useRef<-1 | 0 | 1>(0); // from the on-screen ◀ ▶ buttons (touch)
  const keyDir = useRef<-1 | 0 | 1>(0); // from A/D / arrow keys (desktop)
  const aiPending = useRef(false);
  const lastSnap = useRef(0);

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
    // Left-click (desktop) / touch release (mobile) = FIRE at the current aim.
    const onUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      toGame(e.clientX, e.clientY);
      const eng = engineRef.current;
      if (!eng || eng.phase !== 'aim' || eng.current.side !== 'player' || !pointer.current) return;
      const a = eng.aimFromPointer(pointer.current.x, pointer.current.y);
      eng.fire(a.dir, a.power);
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);

    // Keyboard movement: A/D or ←/→ drive the tank while held.
    const keyToDir = (k: string): -1 | 0 | 1 =>
      k === 'a' || k === 'arrowleft' ? -1 : k === 'd' || k === 'arrowright' ? 1 : 0;
    const onKeyDown = (e: KeyboardEvent) => {
      const d = keyToDir(e.key.toLowerCase());
      if (d === 0) return;
      if (e.key.startsWith('Arrow')) e.preventDefault();
      keyDir.current = d;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const d = keyToDir(e.key.toLowerCase());
      if (d !== 0 && keyDir.current === d) keyDir.current = 0;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const frame = (now: number) => {
      if (disposed) return;
      const dt = now - prev;
      prev = now;
      const eng = engineRef.current;
      if (eng) {
        // Continuous tank movement while a key or move button is held (player turn).
        const md = keyDir.current || moveDir.current;
        if (md !== 0 && eng.phase === 'aim' && eng.current.side === 'player') {
          eng.move(md);
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

        // Drain feedback cues → chiptune SFX (no-op when muted).
        if (eng.events.length) {
          for (const ev of eng.events) {
            if (ev === 'fire') sfx.fire();
            else if (ev === 'explosion') sfx.explosion();
            else if (ev === 'hit') sfx.hit();
            else if (ev === 'win') sfx.win();
            else if (ev === 'lose') sfx.lose();
          }
          eng.events.length = 0;
        }

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
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [canvasRef, engineRef, reduceMotion, onSnapshot]);

  return { setMove };
}
