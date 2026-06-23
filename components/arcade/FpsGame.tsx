'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CRTFrame } from './ui/CRTFrame';
import { FpsControls } from './ui/FpsControls';
import { useFpsLoop, type FpsGameState } from './useFpsLoop';
import { makeArena } from './fps/map';
import { makePlayer } from './fps/player';

type Diff = 'normal' | 'hard' | 'nightmare';
type Mode = 'menu' | 'play';

/**
 * STARSHELL — the "Have Fun!" FPS. A '93-pixel raycaster arena shooter (our own
 * sci-fi/arcade brand). F1: choose difficulty + enemy count (which sizes the
 * map), then walk a textured arena. Shooting, bots, weapons, gold shop, 20
 * levels, and the scoreboard arrive in later phases.
 */
export function FpsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FpsGameState | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [diff, setDiff] = useState<Diff>('normal');
  const [enemies, setEnemies] = useState(3);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => setIsTouch('ontouchstart' in window), []);

  const { setMoveAxis, addLook } = useFpsLoop(canvasRef, gameRef, mode === 'play');

  const start = useCallback(() => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffff)) & 0x7fffffff;
    const level = makeArena(enemies, seed);
    gameRef.current = { level, player: makePlayer(level.spawn) };
    setMode('play');
  }, [enemies]);

  useEffect(() => {
    if (mode !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode('menu');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

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

        {mode === 'play' && (
          <>
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 font-pixel text-[14px] text-[#aef5c8]/80">
              +
            </div>
            <button type="button" onClick={() => setMode('menu')} className="absolute right-3 top-3 z-50 font-pixel text-[8px] text-white/55 transition-colors hover:text-white">
              MENU
            </button>
            {isTouch ? (
              <FpsControls onMove={(s, f) => setMoveAxis(s, f)} onLook={(dx) => addLook(dx)} />
            ) : (
              <p className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 font-pixel text-[7px] text-white/40">
                CLICK TO LOOK · WASD MOVE · ESC MENU
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
              {(['normal', 'hard', 'nightmare'] as Diff[]).map((d) => (
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
              {isTouch ? 'LEFT STICK MOVE · RIGHT DRAG LOOK' : 'CLICK TO LOOK · WASD MOVE · ESC FOR MENU'}
            </p>
          </div>
        )}
      </CRTFrame>
    </div>
  );
}
