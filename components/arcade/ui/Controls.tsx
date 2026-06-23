'use client';

import type { Snapshot } from '../engine/types';

/**
 * Bottom overlay controls. Aiming is by pointer; **firing is left-click on
 * desktop / touch-release on mobile** (handled on the canvas, see useGameLoop).
 * These on-screen ◀ ▶ buttons drive the tank left/right (mainly for touch —
 * desktop can also use A/D or the arrow keys). Buttons are ≥44px for touch.
 */
export function Controls({
  snap,
  onMoveStart,
  onMoveEnd,
}: {
  snap: Snapshot;
  onMoveStart: (dir: -1 | 1) => void;
  onMoveEnd: () => void;
}) {
  const player = snap.tanks.find((t) => t.side === 'player')!;
  const yourTurn = snap.canFire;
  const moveLeft = Math.max(0, Math.round(player.moveLeft));

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 p-3 sm:p-4">
      <div className="pointer-events-auto flex items-center gap-2">
        <MoveButton label="◀" disabled={!yourTurn} onStart={() => onMoveStart(-1)} onEnd={onMoveEnd} />
        <MoveButton label="▶" disabled={!yourTurn} onStart={() => onMoveStart(1)} onEnd={onMoveEnd} />
        <span className="ml-1 font-pixel text-[7px] text-white/45 sm:text-[8px]">FUEL {moveLeft}</span>
      </div>

      <span className="pointer-events-none mb-3 font-pixel text-[7px] uppercase tracking-wider text-[#aef5c8]/70 sm:text-[8px]">
        {yourTurn ? 'click / release to fire' : 'enemy turn…'}
      </span>
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
