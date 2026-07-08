'use client';

/**
 * DEV-ONLY Design DNA ARMOUR generator. Pick a division + PRIMARY/SECONDARY DNA →
 * generate a cohesive armour SET (one DNA-themed piece per body slot) → preview it on
 * the live Marine → tune name/lore → KEEP + EXPORT to bake into `fps/gen/
 * generated-armor.json`. Baked sets surface in the Armory bench for their division.
 * The armour twin of WeaponGenerator; never shipped publicly (mounted only when dev).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { MarinePreview } from './MarinePreview';
import { DESIGN_DNA, type DesignDNA } from '../fps/gen/dna';
import { DIVISION_IDS, GEN_DIVISIONS, type GenDivisionId } from '../fps/gen/divisions';
import { generateArmorBlueprint } from '../fps/gen/armorClient';
import { armorSets, registerArmorSet } from '../fps/gen/armorSets';
import { armorSetPieces } from '../fps/marine/parts';
import type { ArmorSetBlueprint } from '../fps/gen/armorBlueprint';

const chip = (active: boolean) =>
  `min-h-[26px] rounded border px-2 py-1 font-pixel text-[7px] uppercase leading-tight transition-colors ${
    active ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : 'border-white/15 bg-white/[0.03] text-white/55 hover:bg-white/10'
  }`;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function ArmorGenerator({ onBack }: { onBack: () => void }) {
  const [division, setDivision] = useState<GenDivisionId>('vanguard');
  const [primary, setPrimary] = useState<DesignDNA>('Heavy Industrial');
  const [secondary, setSecondary] = useState<DesignDNA>('Military Standard');
  const [set, setSet] = useState<ArmorSetBlueprint | null>(null);
  const [busy, setBusy] = useState(false);
  const [kept, setKept] = useState<ArmorSetBlueprint[]>([]);
  const seedRef = useRef(1);

  const pieces = useMemo(() => (set ? armorSetPieces(set.id) : []), [set]);

  const runGenerate = useCallback(async () => {
    setBusy(true);
    const res = await generateArmorBlueprint({ primary, secondary, division, seed: (seedRef.current += 1) });
    registerArmorSet(res.blueprint);
    setSet(res.blueprint);
    setBusy(false);
  }, [primary, secondary, division]);

  const patch = useCallback((mut: (b: ArmorSetBlueprint) => void) => {
    setSet((prev) => {
      if (!prev) return prev;
      const next: ArmorSetBlueprint = JSON.parse(JSON.stringify(prev));
      mut(next);
      registerArmorSet(next);
      return next;
    });
  }, []);

  const dup = set ? armorSets().some((s) => s.id !== set.id && s.dna.featureHash === set.dna.featureHash) : false;
  const isKept = set ? kept.some((k) => k.id === set.id) : false;

  const download = () => {
    const blob = new Blob([JSON.stringify(kept, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-armor.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-3 overflow-y-auto bg-[#05070c] p-4 text-white">
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-[#aef5c8]">⬡ DEV · DNA ARMOUR GENERATOR</h2>
        <button type="button" onClick={onBack} className="min-h-[28px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10">
          ◂ Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* ── LEFT: division + DNA + generate ── */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#aef5c8]/80">Division · issued to</p>
            <div className="grid grid-cols-3 gap-1">
              {DIVISION_IDS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDivision(d)}
                  style={division === d ? { color: hex(GEN_DIVISIONS[d].accent), borderColor: hex(GEN_DIVISIONS[d].accent) } : undefined}
                  className={chip(division === d)}
                >
                  {GEN_DIVISIONS[d].name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#7fdfff]/80">Primary DNA · ~70%</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {DESIGN_DNA.map((d) => (
                <button key={d} type="button" onClick={() => setPrimary(d)} className={chip(primary === d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#ffd27a]/80">Secondary DNA · ~30%</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {DESIGN_DNA.map((d) => (
                <button key={d} type="button" onClick={() => setSecondary(d)} className={`${chip(secondary === d)} ${d === primary ? 'opacity-40' : ''}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={runGenerate}
              className="min-h-[34px] rounded border border-[#aef5c8]/60 bg-[#aef5c8]/15 px-5 font-pixel text-[9px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/25 disabled:opacity-50"
            >
              {busy ? '… GENERATING' : set ? '↻ Regenerate' : '✦ Generate set'}
            </button>
          </div>

          {kept.length > 0 && (
            <div className="mt-1 rounded border border-white/10 bg-white/[0.03] p-2">
              <p className="mb-1 font-pixel text-[7px] uppercase text-[#aef5c8]/80">Bake set · {kept.length}</p>
              <div className="flex flex-col gap-1">
                {kept.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-2 font-pixel text-[7px] text-white/60">
                    <span className="truncate">{k.name} · {GEN_DIVISIONS[k.division as GenDivisionId]?.name ?? k.division}</span>
                    <button type="button" onClick={() => setKept((ks) => ks.filter((x) => x.id !== k.id))} className="text-white/40 hover:text-[#ff6f9a]">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={download} className="mt-2 min-h-[28px] w-full rounded border border-[#aef5c8]/50 bg-[#aef5c8]/10 px-3 font-pixel text-[7px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20">
                ⬇ Download generated-armor.json
              </button>
              <p className="mt-1 font-pixel text-[6px] leading-relaxed text-white/35">
                Replace components/arcade/fps/gen/generated-armor.json with this file to bake these sets into the Armory.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: marine preview + tuning ── */}
        <div className="flex flex-col gap-3">
          <div className="relative h-72 w-full rounded-lg border border-white/10 bg-gradient-to-b from-[#0b0f16] to-[#05070c]">
            {set && pieces.length ? (
              <MarinePreview key={set.id} equipped={pieces} divisionId={set.division} />
            ) : (
              <div className="flex h-full items-center justify-center font-pixel text-[8px] uppercase text-white/30">Pick DNA · Generate a set</div>
            )}
          </div>

          {set && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  value={set.name}
                  onChange={(e) => patch((b) => (b.name = e.target.value.toUpperCase().slice(0, 24)))}
                  className="flex-1 rounded border border-white/15 bg-black/40 px-2 py-1 font-pixel text-[10px] uppercase text-white outline-none focus:border-[#aef5c8]/60"
                />
                <span className="rounded border px-2 py-0.5 font-pixel text-[7px] uppercase" style={{ color: hex(GEN_DIVISIONS[set.division as GenDivisionId]?.accent ?? 0xffffff), borderColor: `${hex(GEN_DIVISIONS[set.division as GenDivisionId]?.accent ?? 0xffffff)}66` }}>
                  ⬡ {GEN_DIVISIONS[set.division as GenDivisionId]?.name ?? set.division}
                </span>
              </div>
              <div className="font-pixel text-[7px] uppercase text-white/45">{pieces.length} pieces · DNA {set.dna.primary} × {set.dna.secondary}</div>
              <textarea
                value={set.lore}
                onChange={(e) => patch((b) => (b.lore = e.target.value.slice(0, 400)))}
                rows={2}
                placeholder="Lore…"
                className="w-full resize-none rounded border border-white/15 bg-black/40 px-2 py-1 font-pixel text-[7px] leading-relaxed text-white/80 outline-none focus:border-[#aef5c8]/60"
              />
              <div className="flex items-center justify-between font-pixel text-[7px] uppercase">
                <span className={dup ? 'text-[#ff6f9a]' : 'text-[#aef5c8]/80'}>{dup ? 'Duplicate of an existing set' : 'Unique set'}</span>
                <span className="text-white/40">{set.dna.featureHash}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setKept((ks) => (ks.some((k) => k.id === set.id) ? ks : [...ks, set]))}
                  disabled={isKept}
                  className="min-h-[30px] flex-1 rounded border border-[#aef5c8]/50 bg-[#aef5c8]/10 px-3 font-pixel text-[8px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20 disabled:opacity-40"
                >
                  {isKept ? '✓ Kept' : '✓ Keep for bake'}
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(JSON.stringify(set, null, 2))}
                  className="min-h-[30px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10"
                >
                  ⧉ Copy JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
