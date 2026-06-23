'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { ArcadeEngine } from './engine/engine';
import type { Difficulty } from './engine/ai';
import type { Snapshot } from './engine/types';
import { useGameLoop } from './useGameLoop';
import { CRTFrame } from './ui/CRTFrame';
import { Hud } from './ui/Hud';
import { Controls } from './ui/Controls';

type Mode = 'menu' | 'battle';

/**
 * STARSHELL root — the "Have Fun!" arcade. Phase 1: a Quick-Play battle vs the
 * AI with a difficulty pick, the CRT cabinet, pointer aim + move/fire controls,
 * and a result overlay. Screens (tank select, loadout, campaign, leaderboard)
 * land in later phases.
 */
export function ArcadeGame() {
  const reduce = useReducedMotion() === true;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArcadeEngine | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [snap, setSnap] = useState<Snapshot | null>(null);

  const onSnapshot = useCallback((s: Snapshot) => setSnap(s), []);
  const { fire, setMove } = useGameLoop(canvasRef, engineRef, reduce, onSnapshot);

  const start = useCallback(
    (diff: Difficulty) => {
      engineRef.current = new ArcadeEngine({
        seed: (Date.now() ^ Math.floor(Math.random() * 0xffff)) & 0x7fffffff,
        difficulty: diff,
      });
      setDifficulty(diff);
      setSnap(engineRef.current.snapshot(0));
      setMode('battle');
    },
    [],
  );

  const gameOver = mode === 'battle' && snap?.winner != null;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-5xl items-center justify-between px-1">
        <h1 className="font-pixel text-[11px] text-[#7fdfff] sm:text-[13px]">STARSHELL</h1>
        <Link
          href="/"
          className="font-pixel text-[8px] text-white/50 transition-colors hover:text-white sm:text-[9px]"
        >
          ◂ EXIT
        </Link>
      </div>

      <CRTFrame>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

        {mode === 'battle' && snap && !gameOver && (
          <>
            <Hud snap={snap} />
            <Controls
              snap={snap}
              onMoveStart={(d) => setMove(d)}
              onMoveEnd={() => setMove(0)}
              onFire={fire}
            />
          </>
        )}

        {mode === 'menu' && (
          <Overlay>
            <p className="font-pixel text-[18px] text-[#7fdfff] sm:text-[26px]">STARSHELL</p>
            <p className="mt-2 font-pixel text-[8px] text-white/60 sm:text-[10px]">
              ARTILLERY · ASTEROID FIELDS
            </p>
            <p className="mt-6 font-pixel text-[8px] text-white/45 sm:text-[9px]">DIFFICULTY</p>
            <div className="mt-3 flex gap-2">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => start(d)}
                  className="min-h-[44px] rounded-md border border-[#7fdfff]/40 bg-[#7fdfff]/10 px-4 font-pixel text-[9px] uppercase text-[#7fdfff] transition-colors hover:bg-[#7fdfff]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7fdfff] sm:text-[11px]"
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-6 max-w-xs text-center font-pixel text-[7px] leading-relaxed text-white/35 sm:text-[8px]">
              MOVE THE POINTER TO AIM · ◀ ▶ TO DRIVE · FIRE TO SHOOT
            </p>
          </Overlay>
        )}

        {gameOver && snap && (
          <Overlay>
            <p className="font-pixel text-[16px] sm:text-[22px]" style={{ color: snap.winner === 'player' ? '#aef5c8' : '#ff5d7a' }}>
              {snap.winner === 'player' ? 'YOU WIN' : 'YOU LOSE'}
            </p>
            <p className="mt-3 font-pixel text-[8px] text-white/60 sm:text-[10px]">
              SCORE {snap.tanks.find((t) => t.side === 'player')!.score}
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => start(difficulty)}
                className="min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-4 font-pixel text-[9px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8] sm:text-[11px]"
              >
                Play again
              </button>
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="min-h-[44px] rounded-md border border-white/20 bg-white/5 px-4 font-pixel text-[9px] uppercase text-white/70 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:text-[11px]"
              >
                Menu
              </button>
            </div>
          </Overlay>
        )}
      </CRTFrame>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]">
      {children}
    </div>
  );
}
