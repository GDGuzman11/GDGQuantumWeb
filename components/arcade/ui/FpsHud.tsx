'use client';

import type { FpsSnapshot } from '../useFpsLoop';

/** Combat HUD: crosshair, hitmarker, muzzle flash, hurt vignette, health, ammo,
 *  enemies-left, and a simple pixel gun view-model. */
export function FpsHud({ snap }: { snap: FpsSnapshot }) {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const flash = now - snap.fireAt < 70;
  const hit = now - snap.hitAt < 180;
  const hurt = now - snap.hurtAt < 320;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 font-pixel text-white">
      {/* hurt vignette */}
      {hurt && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ boxShadow: 'inset 0 0 60px 20px rgba(255,40,60,0.55)' }}
        />
      )}

      {/* crosshair + hitmarker */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className={hit ? 'text-[#ff5d6e]' : 'text-[#aef5c8]/80'} style={{ fontSize: 13 }}>
          {hit ? '✕' : '+'}
        </span>
      </div>

      {/* muzzle flash + gun view-model */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        {flash && (
          <div
            aria-hidden
            className="absolute -top-5 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, #fff6c8 0%, #ffae3a 50%, transparent 70%)' }}
          />
        )}
        {/* gun */}
        <div className="relative h-12 w-24 sm:h-16 sm:w-32">
          <div className="absolute bottom-0 left-1/2 h-10 w-7 -translate-x-1/2 rounded-t-sm bg-[#2a3048]" />
          <div className="absolute bottom-6 left-1/2 h-2.5 w-16 -translate-x-[60%] rounded-sm bg-[#3a4366]" />
          <div className="absolute bottom-[26px] left-1/2 h-1.5 w-3 -translate-x-[150%] bg-[#7fdfff]" />
        </div>
      </div>

      {/* enemies left */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 text-[9px] text-[#ff8a96] sm:text-[11px]">
        ENEMIES {snap.enemiesLeft}
      </div>

      {/* health */}
      <div className="absolute bottom-4 left-4">
        <div className="mb-1 text-[8px] text-white/60 sm:text-[9px]">HP {Math.round(snap.health)}</div>
        <div className="h-2.5 w-32 overflow-hidden rounded bg-white/15 sm:w-40">
          <div
            className="h-full transition-[width] duration-200"
            style={{ width: `${snap.health}%`, backgroundColor: snap.health > 35 ? '#aef5c8' : '#ff5d6e' }}
          />
        </div>
      </div>

      {/* ammo */}
      <div className="absolute bottom-4 right-4 text-right">
        {snap.reloading ? (
          <div className="text-[10px] text-[#7fdfff] sm:text-[12px]">RELOADING…</div>
        ) : (
          <div className="text-[14px] sm:text-[18px]">
            <span className={snap.ammo <= 5 ? 'text-[#ff5d6e]' : 'text-white'}>{snap.ammo}</span>
            <span className="text-white/40"> / {snap.mag}</span>
          </div>
        )}
        <div className="text-[7px] text-white/40 sm:text-[8px]">RIFLE · R RELOAD</div>
      </div>
    </div>
  );
}
