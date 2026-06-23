'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { ArcadeEngine } from './engine/engine';
import { sfx } from './engine/audio';
import type { Difficulty } from './engine/ai';
import type { Snapshot, Weapon } from './engine/types';
import { TANKS, tankById } from './engine/tanks';
import { aiArsenalFor } from './engine/weapons';
import { useGameLoop } from './useGameLoop';
import { CRTFrame } from './ui/CRTFrame';
import { Hud } from './ui/Hud';
import { Controls } from './ui/Controls';
import { TankSelect } from './screens/TankSelect';
import { LoadoutSelect } from './screens/LoadoutSelect';

type Mode = 'menu' | 'tank' | 'loadout' | 'battle';

/**
 * STARSHELL root — the "Have Fun!" arcade. Flow: menu (difficulty) → tank
 * select → 20-of-30 loadout → battle vs the AI, in the CRT cabinet, with
 * pointer aim, click/release to fire, A/D move, and an in-battle weapon cycler.
 */
export function ArcadeGame() {
  const reduce = useReducedMotion() === true;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArcadeEngine | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [muted, setMuted] = useState(false);
  const [tankId, setTankId] = useState('rock');
  const [loadout, setLoadout] = useState<Weapon[]>([]);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  const onSnapshot = useCallback((s: Snapshot) => setSnap(s), []);
  const { setMove } = useGameLoop(canvasRef, engineRef, reduce, onSnapshot);

  const startBattle = useCallback(
    (load: Weapon[], tank: string, diff: Difficulty) => {
      sfx.muted = muted;
      sfx.ensure();
      const aiTank = TANKS[Math.floor(Math.random() * TANKS.length)];
      engineRef.current = new ArcadeEngine({
        seed: (Date.now() ^ Math.floor(Math.random() * 0xffff)) & 0x7fffffff,
        difficulty: diff,
        playerTank: tankById(tank),
        aiTank,
        loadout: load,
        aiArsenal: aiArsenalFor(aiTank.id),
      });
      setSnap(engineRef.current.snapshot(0));
      setMode('battle');
    },
    [muted],
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      sfx.muted = next;
      if (!next) sfx.ensure();
      return next;
    });
  }, []);

  const cycle = useCallback((dir: -1 | 1) => engineRef.current?.cycleWeapon(dir), []);
  const gameOver = mode === 'battle' && snap?.winner != null;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-5xl items-center justify-between px-1">
        <h1 className="font-pixel text-[11px] text-[#7fdfff] sm:text-[13px]">STARSHELL</h1>
        <div className="flex items-center gap-4">
          <button type="button" onClick={toggleMute} className="font-pixel text-[8px] text-white/50 transition-colors hover:text-white sm:text-[9px]">
            {muted ? 'SOUND ✕' : 'SOUND ♪'}
          </button>
          <Link href="/" className="font-pixel text-[8px] text-white/50 transition-colors hover:text-white sm:text-[9px]">
            ◂ EXIT
          </Link>
        </div>
      </div>

      <CRTFrame>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

        {mode === 'battle' && snap && !gameOver && (
          <>
            <Hud snap={snap} />
            <Controls snap={snap} onMoveStart={(d) => setMove(d)} onMoveEnd={() => setMove(0)} onCycle={cycle} />
          </>
        )}

        {mode === 'menu' && (
          <Overlay>
            <p className="font-pixel text-[18px] text-[#7fdfff] sm:text-[26px]">STARSHELL</p>
            <p className="mt-2 font-pixel text-[8px] text-white/60 sm:text-[10px]">ARTILLERY · ASTEROID FIELDS</p>
            <p className="mt-6 font-pixel text-[8px] text-white/45 sm:text-[9px]">DIFFICULTY</p>
            <div className="mt-3 flex gap-2">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`min-h-[40px] rounded-md border px-4 font-pixel text-[9px] uppercase transition-colors sm:text-[10px] ${
                    difficulty === d
                      ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]'
                      : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMode('tank')}
              className="mt-6 min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-8 font-pixel text-[11px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8] sm:text-[13px]"
            >
              Play ▸
            </button>
            <p className="mt-6 max-w-xs text-center font-pixel text-[6px] leading-relaxed text-white/35 sm:text-[8px]">
              POINTER TO AIM · A / D OR ◀ ▶ TO DRIVE · CLICK / RELEASE TO FIRE
            </p>
          </Overlay>
        )}

        {mode === 'tank' && <TankSelect onPick={(id) => { setTankId(id); setMode('loadout'); }} onBack={() => setMode('menu')} />}

        {mode === 'loadout' && (
          <LoadoutSelect
            tankId={tankId}
            color={tankById(tankId).color}
            onConfirm={(load) => {
              setLoadout(load);
              startBattle(load, tankId, difficulty);
            }}
            onBack={() => setMode('tank')}
          />
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
                onClick={() => startBattle(loadout, tankId, difficulty)}
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
