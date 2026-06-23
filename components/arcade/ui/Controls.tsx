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
  onCycle,
}: {
  snap: Snapshot;
  onMoveStart: (dir: -1 | 1) => void;
  onMoveEnd: () => void;
  onCycle: (dir: -1 | 1) => void;
}) {
  const player = snap.tanks.find((t) => t.side === 'player')!;
  const yourTurn = snap.canFire;
  const moveLeft = Math.max(0, Math.round(player.moveLeft));

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 p-3 sm:p-4">
      <div className="pointer-events-auto flex items-center gap-2">
        <MoveButton label="◀" disabled={!yourTurn} onStart={() => onMoveStart(-1)} onEnd={onMoveEnd} />
        <MoveButton label="▶" disabled={!yourTurn} onStart={() => onMoveStart(1)} onEnd={onMoveEnd} />
        <span className="ml-1 font-pixel text-[7px] text-white/45 sm:text-[8px]">FUEL {moveLeft}</span>
      </div>

      {/* Weapon cycler */}
      <div className="pointer-events-auto flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <CycleButton label="◂" disabled={!yourTurn} onClick={() => onCycle(-1)} />
          <span className="min-w-[96px] text-center font-pixel text-[8px] text-[#aef5c8] sm:min-w-[120px] sm:text-[10px]">
            {snap.weaponName}
          </span>
          <CycleButton label="▸" disabled={!yourTurn} onClick={() => onCycle(1)} />
        </div>
        <span className="font-pixel text-[6px] uppercase tracking-wider text-[#aef5c8]/60 sm:text-[7px]">
          {yourTurn ? `dmg ${snap.weaponDamage} · click to fire` : 'enemy turn…'}
        </span>
      </div>
    </div>
  );
}

function CycleButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded border border-white/15 bg-white/5 font-pixel text-[10px] text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-30"
    >
      {label}
    </button>
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
