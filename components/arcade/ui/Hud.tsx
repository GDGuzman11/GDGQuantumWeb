'use client';

import type { Snapshot } from '../engine/types';

/** Top overlay: both tanks' health/score, whose turn, wind, and aim power. */
export function Hud({ snap }: { snap: Snapshot }) {
  const player = snap.tanks.find((t) => t.side === 'player')!;
  const ai = snap.tanks.find((t) => t.side === 'ai')!;
  // Numeric wind: a signed strength with a direction arrow.
  const windVal = Math.round(snap.wind * 200);
  const windArrow = windVal > 0 ? '→' : windVal < 0 ? '←' : '·';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 font-pixel text-[8px] text-white sm:p-4 sm:text-[10px]">
      <TankBadge label="YOU" color="#7fdfff" hp={player.health} score={player.score} />

      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[#aef5c8]">{snap.turn === 'player' ? 'YOUR TURN' : 'ENEMY…'}</span>
        <span className="text-white/60">
          WIND {windArrow} {Math.abs(windVal)}
        </span>
        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded bg-white/15">
          <div
            className="h-full bg-[#aef5c8] transition-[width] duration-75"
            style={{ width: `${Math.round(snap.power * 100)}%` }}
          />
        </div>
        <span className="text-white/45">POWER</span>
      </div>

      <TankBadge label="ENEMY" color="#ff5d7a" hp={ai.health} score={ai.score} alignRight />
    </div>
  );
}

function TankBadge({
  label,
  color,
  hp,
  score,
  alignRight,
}: {
  label: string;
  color: string;
  hp: number;
  score: number;
  alignRight?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${alignRight ? 'items-end' : 'items-start'}`}>
      <span style={{ color }}>{label}</span>
      <div className="h-2 w-24 overflow-hidden rounded bg-white/15 sm:w-28">
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${hp}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-white/55">SCORE {score}</span>
    </div>
  );
}
