'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CRTFrame } from './ui/CRTFrame';
import { FpsControls } from './ui/FpsControls';
import { FpsHud } from './ui/FpsHud';
import { useFpsLoop, type FpsGameState, type FpsSnapshot } from './useFpsLoop';
import { makeArena3D } from './fps/level3d';
import { makePlayer3 } from './fps/physics';
import { spawnEnemies, type Difficulty } from './fps/enemy';

type Mode = 'menu' | 'play';

/**
 * STARSHELL — the "Have Fun!" FPS. A '93-pixel raycaster-style arena shooter
 * (Three.js). F2: rifle hitscan combat vs line-of-sight-gated adaptive bots,
 * across a varied warzone city with ladders, ziplines + jump pads. The full
 * 20-weapon arsenal / loadout / shop land in later phases.
 */
export function FpsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FpsGameState | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [enemies, setEnemies] = useState(3);
  const [isTouch, setIsTouch] = useState(false);
  const [snap, setSnap] = useState<FpsSnapshot | null>(null);

  useEffect(() => setIsTouch('ontouchstart' in window), []);

  const onSnapshot = useCallback((s: FpsSnapshot) => setSnap(s), []);
  const { setMoveAxis, addLook } = useFpsLoop(canvasRef, gameRef, mode === 'play', onSnapshot);

  const start = useCallback(() => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffff)) & 0x7fffffff;
    const level = makeArena3D(enemies, seed);
    gameRef.current = {
      level,
      player: makePlayer3(level.spawn),
      enemies: spawnEnemies(level, enemies, Math.random),
      difficulty: diff,
      ammo: 30,
      reloading: 0,
      fireCd: 0,
      status: 'playing',
      kills: 0,
      regenT: 0,
    };
    setSnap(null);
    setMode('play');
  }, [enemies, diff]);

  useEffect(() => {
    if (mode !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode('menu');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  // Free the mouse when the round ends so the overlay is clickable.
  const over = mode === 'play' && snap != null && snap.status !== 'playing';
  useEffect(() => {
    if (over && document.pointerLockElement) document.exitPointerLock?.();
  }, [over]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-5xl items-center justify-between px-1">
        <h1 className="font-pixel text-[11px] text-[#7fdfff] sm:text-[13px]">STARSHELL</h1>
        <Link href="/" className="font-pixel text-[8px] text-white/50 transition-colors hover:text-white sm:text-[9px]">
          ◂ EXIT
        </Link>
      </div>

      <CRTFrame>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none [image-rendering:pixelated]" />

        {mode === 'play' && snap && snap.status === 'playing' && (
          <>
            <FpsHud snap={snap} />
            <button type="button" onClick={() => setMode('menu')} className="absolute right-3 top-3 z-50 font-pixel text-[8px] text-white/55 transition-colors hover:text-white">
              MENU
            </button>
            {isTouch && <FpsControls onMove={(s, f) => setMoveAxis(s, f)} onLook={(dx, dy) => addLook(dx, dy)} />}
            {!isTouch && (
              <p className="pointer-events-none absolute bottom-1 left-1/2 z-20 -translate-x-1/2 font-pixel text-[6px] text-white/35">
                CLICK = AIM/FIRE · WASD MOVE · SPACE JUMP · R RELOAD · LADDERS/ZIPS: WALK IN · ESC MENU
              </p>
            )}
          </>
        )}

        {mode === 'menu' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]">
            <p className="font-pixel text-[18px] text-[#7fdfff] sm:text-[26px]">STARSHELL</p>
            <p className="mt-2 font-pixel text-[8px] text-white/60 sm:text-[10px]">VOID ARENA</p>
            <p className="mt-6 font-pixel text-[7px] text-white/45 sm:text-[8px]">DIFFICULTY</p>
            <div className="mt-2 flex gap-2">
              {(['normal', 'hard', 'nightmare'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiff(d)}
                  className={`min-h-[38px] rounded-md border px-3 font-pixel text-[8px] uppercase transition-colors sm:text-[9px] ${
                    diff === d ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-5 font-pixel text-[7px] text-white/45 sm:text-[8px]">ENEMIES (SIZES THE MAP)</p>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnemies(n)}
                  className={`h-9 w-9 rounded-md border font-pixel text-[10px] transition-colors ${
                    enemies === n ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={start}
              className="mt-6 min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-8 font-pixel text-[11px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8] sm:text-[13px]"
            >
              Deploy ▸
            </button>
            <p className="mt-5 max-w-xs text-center font-pixel text-[6px] leading-relaxed text-white/35 sm:text-[8px]">
              {isTouch ? 'LEFT STICK MOVE · RIGHT LOOK · AUTO-FIRE ON TARGET' : 'CLICK TO CAPTURE MOUSE, THEN AIM + FIRE'}
            </p>
          </div>
        )}

        {over && snap && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/65 px-4 backdrop-blur-[2px]">
            <p className="font-pixel text-[16px] sm:text-[22px]" style={{ color: snap.status === 'won' ? '#aef5c8' : '#ff5d6e' }}>
              {snap.status === 'won' ? 'ARENA CLEAR' : 'YOU DIED'}
            </p>
            <p className="mt-3 font-pixel text-[8px] text-white/60 sm:text-[10px]">KILLS {snap.kills}</p>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={start} className="min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-4 font-pixel text-[9px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20 sm:text-[11px]">
                Redeploy
              </button>
              <button type="button" onClick={() => setMode('menu')} className="min-h-[44px] rounded-md border border-white/20 bg-white/5 px-4 font-pixel text-[9px] uppercase text-white/70 hover:bg-white/10 sm:text-[11px]">
                Menu
              </button>
            </div>
          </div>
        )}
      </CRTFrame>
    </div>
  );
}
