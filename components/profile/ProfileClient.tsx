'use client';

/**
 * Pilot profile — renders the player's permanent Marine (avatar), rank/title, core
 * stats and earned badges from the account's server progress. The Marine save +
 * arsenal come from the DB (passed as props), so this reads no localStorage.
 */
import { useMemo } from 'react';
import Link from 'next/link';
import { MarinePreview } from '../arcade/screens/MarinePreview';
import { equippedArmorPieces, type MarineSave } from '../arcade/fps/marine/store';
import { gunById } from '../arcade/fps/weapons';
import type { ArsenalSave } from '../arcade/fps/arsenal/store';

const DIVISION_NAMES: Record<string, string> = {
  vanguard: 'Vanguard',
  ghost: 'Ghost',
  warden: 'Warden',
  phantom: 'Phantom',
  lifeline: 'Lifeline',
};
const CAMPAIGN_TOTAL = 20;

function coerceMarine(j: unknown): MarineSave {
  const o = (j ?? {}) as Partial<MarineSave>;
  return {
    owned: Array.isArray(o.owned) ? o.owned : [],
    equipped: o.equipped && typeof o.equipped === 'object' ? (o.equipped as Record<string, string>) : {},
    partXp: o.partXp && typeof o.partXp === 'object' ? o.partXp : {},
    service: o.service && typeof o.service === 'object' ? o.service : {},
    bosses: typeof o.bosses === 'number' ? o.bosses : 0,
    marineLevel: typeof o.marineLevel === 'number' ? o.marineLevel : 1,
    marineXp: typeof o.marineXp === 'number' ? o.marineXp : 0,
    division: typeof o.division === 'string' ? o.division : null,
  };
}
function coerceArsenal(j: unknown): Pick<ArsenalSave, 'owned' | 'service' | 'bosses' | 'unlockedWeapons'> {
  const o = (j ?? {}) as Partial<ArsenalSave>;
  return {
    owned: Array.isArray(o.owned) ? o.owned : [],
    service: o.service && typeof o.service === 'object' ? o.service : {},
    bosses: typeof o.bosses === 'number' ? o.bosses : 0,
    unlockedWeapons: Array.isArray(o.unlockedWeapons) ? o.unlockedWeapons : [],
  };
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
      <p className="text-[14px] sm:text-[16px]" style={{ color: accent ?? '#ffffff' }}>{value}</p>
      <p className="mt-1 text-[6px] tracking-[0.2em] text-white/40">{label}</p>
    </div>
  );
}

export function ProfileClient({
  displayName,
  verified,
  memberSince,
  marine,
  arsenal,
  astro,
  bestLevel,
}: {
  displayName: string;
  verified: boolean;
  memberSince: string;
  marine: unknown;
  arsenal: unknown;
  astro: number;
  bestLevel: number;
}) {
  const m = useMemo(() => coerceMarine(marine), [marine]);
  const a = useMemo(() => coerceArsenal(arsenal), [arsenal]);
  const equipped = useMemo(() => equippedArmorPieces(m), [m]);

  const divName = m.division ? DIVISION_NAMES[m.division] ?? null : null;
  const title = divName ? `${divName.toUpperCase()} · LVL ${m.marineLevel}` : `RECRUIT · LVL ${m.marineLevel}`;
  const bosses = Math.max(m.bosses || 0, a.bosses || 0);
  const collection = a.owned.length + m.owned.length;

  const fav = useMemo(() => {
    const entries = Object.entries(a.service) as [string, { kills?: number }][];
    const top = entries.sort((x, y) => (y[1]?.kills ?? 0) - (x[1]?.kills ?? 0))[0];
    if (!top || (top[1]?.kills ?? 0) <= 0) return null;
    try {
      return gunById(top[0])?.name ?? null;
    } catch {
      return null;
    }
  }, [a.service]);

  const medals = [
    { label: 'First Boss', earned: bosses > 0 },
    { label: 'Graduated', earned: Boolean(m.division) },
    { label: 'Veteran', earned: bestLevel >= 10 },
    { label: 'Campaign Cleared', earned: bestLevel >= CAMPAIGN_TOTAL },
    { label: 'Collector', earned: collection >= 20 },
    { label: 'Quartermaster', earned: astro >= 2000 },
  ];

  return (
    <main id="content" className="min-h-[100svh] w-full bg-black px-4 py-8 font-pixel text-white sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/play" className="text-[8px] tracking-[0.25em] text-white/50 transition-colors hover:text-white">◂ CONSOLE</Link>
          <Link href="/arcade" className="text-[8px] tracking-[0.25em] text-[#aef5c8]/80 transition-colors hover:text-[#aef5c8]">DEPLOY ▸</Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
          {/* avatar */}
          <div className="rounded-xl border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#1c2431] p-1">
            <div className="relative h-64 overflow-hidden rounded-lg sm:h-72">
              <MarinePreview equipped={equipped} divisionId={m.division} />
            </div>
          </div>

          {/* identity + stats */}
          <div className="flex flex-col justify-center">
            <p className="text-[20px] text-white sm:text-[26px]">{displayName}</p>
            <p className="mt-2 text-[9px] tracking-[0.2em] text-[#7fdfff]">{title}</p>
            <p className="mt-1 text-[7px] text-white/40">
              PILOT SINCE {memberSince}
              {verified ? ' · ✓ VERIFIED' : ''}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="BEST LEVEL" value={bestLevel} accent="#aef5c8" />
              <Stat label="◈ ASTRO" value={astro} accent="#ffd27a" />
              <Stat label="BOSSES" value={bosses} accent="#ff9a3a" />
            </div>
          </div>
        </div>

        {/* detail row */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="DIVISION" value={divName ? divName.toUpperCase() : 'RECRUIT'} accent="#c8a8ff" />
          <Stat label="CAMPAIGN" value={`${Math.min(bestLevel, CAMPAIGN_TOTAL)}/${CAMPAIGN_TOTAL}`} />
          <Stat label="COLLECTION" value={collection} accent="#7fdfff" />
          <Stat label="SIGNATURE" value={fav ?? '—'} />
        </div>

        {/* medals */}
        <div className="mt-6">
          <p className="text-[8px] tracking-[0.25em] text-white/45">SERVICE MEDALS</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {medals.map((md) => (
              <div
                key={md.label}
                className={`rounded-lg border p-3 text-center transition-colors ${md.earned ? 'border-[#ffd27a]/40 bg-[#ffd27a]/[0.06]' : 'border-white/8 bg-white/[0.02] opacity-45'}`}
              >
                <p className="text-[13px]">{md.earned ? '★' : '☆'}</p>
                <p className={`mt-1 text-[7px] tracking-[0.15em] ${md.earned ? 'text-[#ffd27a]' : 'text-white/40'}`}>{md.label.toUpperCase()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
