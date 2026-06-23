'use client';

import { TANKS } from '../engine/tanks';

/** Pick 1 of 3 tanks. Each has a simple colour identity + one perk. */
export function TankSelect({ onPick, onBack }: { onPick: (tankId: string) => void; onBack: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/70 px-4 py-6">
      <p className="font-pixel text-[11px] text-[#7fdfff] sm:text-[14px]">CHOOSE YOUR TANK</p>
      <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
        {TANKS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t.id)}
            className="group flex flex-col items-center gap-3 rounded-lg border border-white/15 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2"
            style={{ borderColor: `${t.color}55` }}
          >
            {/* Simple tank glyph */}
            <svg width="56" height="34" viewBox="0 0 56 34" aria-hidden>
              <rect x="8" y="18" width="40" height="11" rx="4" fill={t.color} />
              <circle cx="28" cy="18" r="7" fill={t.accent} />
              <rect x="27" y="4" width="4" height="16" rx="2" fill={t.accent} />
            </svg>
            <span className="font-pixel text-[11px]" style={{ color: t.color }}>
              {t.name}
            </span>
            <span className="text-center font-pixel text-[6px] leading-relaxed text-white/55 sm:text-[7px]">
              {t.perk}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onBack}
        className="font-pixel text-[8px] text-white/45 transition-colors hover:text-white"
      >
        ◂ BACK
      </button>
    </div>
  );
}
