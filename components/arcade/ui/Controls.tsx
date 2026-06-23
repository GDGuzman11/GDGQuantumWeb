'use client';

import type { Snapshot } from '../engine/types';

/**
 * Bottom overlay controls: hold ◀ ▶ to drive the tank left/right (limited per
 * turn), and a big FIRE button. Aiming itself is done by moving the pointer
 * over the screen (mouse/touch). Buttons are ≥44px for touch.
 */
export function Controls({
  snap,
  onMoveStart,
  onMoveEnd,
  onFire,
}: {
  snap: Snapshot;
  onMoveStart: (dir: -1 | 1) => void;
  onMoveEnd: () => void;
  onFire: () => void;
}) {
  const player = snap.tanks.find((t) => t.side === 'player')!;
  const yourTurn = snap.canFire;
  const moveLeft = Math.max(0, Math.round(player.moveLeft));

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 p-3 sm:p-4">
      <div className="pointer-events-auto flex items-center gap-2">
        <MoveButton label="◀" disabled={!yourTurn} onStart={() => onMoveStart(-1)} onEnd={onMoveEnd} />
        <MoveButton label="▶" disabled={!yourTurn} onStart={() => onMoveStart(1)} onEnd={onMoveEnd} />
        <span className="ml-1 font-pixel text-[7px] text-white/45 sm:text-[8px]">
          FUEL {moveLeft}
        </span>
      </div>

      <button
        type="button"
        onClick={onFire}
        disabled={!yourTurn}
        className="pointer-events-auto min-h-[48px] rounded-lg border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-6 font-pixel text-[10px] uppercase tracking-wider text-[#aef5c8] shadow-[0_0_24px_-6px_rgba(174,245,200,0.7)] transition-colors hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8] disabled:cursor-not-allowed disabled:opacity-30 sm:text-[12px]"
      >
        Fire
      </button>
    </div>
  );
}

function MoveButton({
  label,
  disabled,
  onStart,
  onEnd,
}: {
  label: string;
  disabled?: boolean;
  onStart: () => void;
  onEnd: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        onStart();
      }}
      onPointerUp={onEnd}
      onPointerLeave={onEnd}
      onPointerCancel={onEnd}
      className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/5 font-pixel text-[12px] text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {label}
    </button>
  );
}
