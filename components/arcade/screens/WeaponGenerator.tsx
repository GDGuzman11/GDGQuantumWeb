'use client';

/**
 * DEV-ONLY Design DNA weapon generator screen. Pick a PRIMARY + SECONDARY DNA, hit
 * Generate (AI route → deterministic fallback), preview the resulting gun live in 3D,
 * tune its stats/name/audio, check it against existing weapons for uniqueness, then
 * KEEP + EXPORT the blueprint(s) to bake into `fps/gen/generated.json`.
 *
 * The generated weapon is registered into the live registry, so the same GunPreview
 * the loadout uses renders it, and (once kept/baked) it flows into loadout/arsenal/
 * combat/audio automatically. Never shipped publicly — mounted only when `dev`.
 */
import { useCallback, useRef, useState } from 'react';
import { GunPreview } from './GunPreview';
import type { Family } from '../fps/weapons';
import { DESIGN_DNA, type DesignDNA } from '../fps/gen/dna';
import { DIVISION_IDS, GEN_DIVISIONS, type GenDivisionId } from '../fps/gen/divisions';
import { generateWeapon } from '../fps/gen/client';
import { generatedBlueprints, registerBlueprint } from '../fps/gen/registry';
import { AUDIO_FAMILIES, WEAPON_FAMILIES, type AudioFamily, type WeaponBlueprint } from '../fps/gen/blueprint';
import { nearestMatch } from '../fps/gen/similarity';

/** Which loadout pool a family lands in (mirrors weapons.ts). */
function poolLabel(f: Family): string {
  if (f === 'rifle' || f === 'mg' || f === 'laser') return 'PRIMARY';
  if (f === 'sniper' || f === 'launcher') return 'SECONDARY';
  return 'SIDEARM';
}

const chip = (active: boolean) =>
  `min-h-[26px] rounded border px-2 py-1 font-pixel text-[7px] uppercase leading-tight transition-colors ${
    active ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : 'border-white/15 bg-white/[0.03] text-white/55 hover:bg-white/10'
  }`;

function Stat({ label, value, step, min, max, onChange }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 font-pixel text-[7px] uppercase text-white/60">
      <span className="w-16">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1 text-right font-pixel text-[8px] text-white outline-none focus:border-[#7fdfff]/60"
      />
    </label>
  );
}

export function WeaponGenerator({ onBack }: { onBack: () => void }) {
  const [primary, setPrimary] = useState<DesignDNA>('Military Standard');
  const [secondary, setSecondary] = useState<DesignDNA>('Precision Tactical');
  const [familySel, setFamilySel] = useState<Family | 'auto'>('auto');
  const [division, setDivision] = useState<GenDivisionId>('outrider');
  const [bp, setBp] = useState<WeaponBlueprint | null>(null);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null);
  const [note, setNote] = useState<string>('');
  const [kept, setKept] = useState<WeaponBlueprint[]>([]);
  const seedRef = useRef(1);

  const runGenerate = useCallback(async () => {
    setBusy(true);
    setNote('');
    const existing = generatedBlueprints()
      .filter((b) => b.id !== bp?.id)
      .map((b) => `${b.name} (${b.dna.primary}>${b.dna.secondary})`);
    const res = await generateWeapon({
      primary,
      secondary,
      family: familySel === 'auto' ? undefined : familySel,
      division,
      existing,
      seed: (seedRef.current += 1),
    });
    registerBlueprint(res.blueprint);
    setBp(res.blueprint);
    setSource(res.source);
    if (res.note) setNote(res.note);
    setBusy(false);
  }, [primary, secondary, familySel, division, bp?.id]);

  // Live-update the registry whenever a field is edited so the preview + audio track.
  const patch = useCallback(
    (mut: (b: WeaponBlueprint) => void) => {
      setBp((prev) => {
        if (!prev) return prev;
        const next: WeaponBlueprint = JSON.parse(JSON.stringify(prev));
        mut(next);
        registerBlueprint(next);
        return next;
      });
    },
    [],
  );

  const near = bp ? nearestMatch(bp, generatedBlueprints().filter((b) => b.id !== bp.id)) : null;
  const dupPct = near ? Math.round(near.score * 100) : 0;
  const isKept = bp ? kept.some((k) => k.id === bp.id) : false;

  const download = () => {
    const data = JSON.stringify(kept, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-3 overflow-y-auto bg-[#05070c] p-4 text-white">
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-[#7fdfff]">⚙ DEV · DNA WEAPON GENERATOR</h2>
        <button type="button" onClick={onBack} className="min-h-[28px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10">
          ◂ Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* ── LEFT: DNA selection + generate ── */}
        <div className="flex flex-col gap-3">
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
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#aef5c8]/80">Division · issued to</p>
            <div className="grid grid-cols-3 gap-1">
              {DIVISION_IDS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDivision(d)}
                  style={division === d ? { color: `#${GEN_DIVISIONS[d].accent.toString(16).padStart(6, '0')}`, borderColor: `#${GEN_DIVISIONS[d].accent.toString(16).padStart(6, '0')}` } : undefined}
                  className={chip(division === d)}
                >
                  {GEN_DIVISIONS[d].name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-white/60">Weapon type</p>
            <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
              <button type="button" onClick={() => setFamilySel('auto')} className={chip(familySel === 'auto')}>
                AUTO
              </button>
              {WEAPON_FAMILIES.map((f) => (
                <button key={f} type="button" onClick={() => setFamilySel(f)} className={chip(familySel === f)}>
                  {f}
                </button>
              ))}
            </div>
            <p className="mt-1 font-pixel text-[6px] text-white/35">
              {familySel === 'auto' ? 'DNA / division picks the type.' : `Forced → ${poolLabel(familySel)} pool.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={runGenerate}
              className="min-h-[34px] rounded border border-[#7fdfff]/60 bg-[#7fdfff]/15 px-5 font-pixel text-[9px] uppercase text-[#7fdfff] transition-colors hover:bg-[#7fdfff]/25 disabled:opacity-50"
            >
              {busy ? '… GENERATING' : bp ? '↻ Regenerate' : '✦ Generate'}
            </button>
            {source && (
              <span className="font-pixel text-[7px] uppercase text-white/45">
                {source === 'ai' ? '◆ AI' : '◇ FALLBACK'}
              </span>
            )}
          </div>
          {note && <p className="font-pixel text-[6px] leading-relaxed text-[#ffd27a]/70">{note}</p>}

          {/* Bake set */}
          {kept.length > 0 && (
            <div className="mt-1 rounded border border-white/10 bg-white/[0.03] p-2">
              <p className="mb-1 font-pixel text-[7px] uppercase text-[#aef5c8]/80">Bake set · {kept.length}</p>
              <div className="flex flex-col gap-1">
                {kept.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-2 font-pixel text-[7px] text-white/60">
                    <span className="truncate">{k.name}</span>
                    <button type="button" onClick={() => setKept((ks) => ks.filter((x) => x.id !== k.id))} className="text-white/40 hover:text-[#ff6f9a]">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={download} className="mt-2 min-h-[28px] w-full rounded border border-[#aef5c8]/50 bg-[#aef5c8]/10 px-3 font-pixel text-[7px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20">
                ⬇ Download generated.json
              </button>
              <p className="mt-1 font-pixel text-[6px] leading-relaxed text-white/35">
                Replace components/arcade/fps/gen/generated.json with this file to bake these weapons in.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: preview + tuning ── */}
        <div className="flex flex-col gap-3">
          <div className="relative h-56 w-full rounded-lg border border-white/10 bg-gradient-to-b from-[#0b0f16] to-[#05070c]">
            {bp ? (
              <GunPreview key={bp.id} gunId={bp.id} />
            ) : (
              <div className="flex h-full items-center justify-center font-pixel text-[8px] uppercase text-white/30">Pick DNA · Generate</div>
            )}
          </div>

          {bp && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  value={bp.name}
                  onChange={(e) => patch((b) => (b.name = e.target.value.toUpperCase().slice(0, 22)))}
                  className="flex-1 rounded border border-white/15 bg-black/40 px-2 py-1 font-pixel text-[10px] uppercase text-white outline-none focus:border-[#7fdfff]/60"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1 font-pixel text-[7px] uppercase">
                <span className="rounded border border-white/15 bg-white/[0.04] px-2 py-0.5 text-white/70">{bp.family} · {poolLabel(bp.family)}</span>
                {bp.division && (
                  <span
                    className="rounded border px-2 py-0.5"
                    style={{ color: `#${GEN_DIVISIONS[bp.division as GenDivisionId]?.accent.toString(16).padStart(6, '0')}`, borderColor: `#${GEN_DIVISIONS[bp.division as GenDivisionId]?.accent.toString(16).padStart(6, '0')}66` }}
                  >
                    ⬡ {GEN_DIVISIONS[bp.division as GenDivisionId]?.name ?? bp.division}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded border border-white/10 bg-white/[0.02] p-2">
                <Stat label="Damage" value={bp.stats.dmg} step={1} min={8} max={500} onChange={(v) => patch((b) => (b.stats.dmg = v))} />
                <Stat label="Rate" value={bp.stats.rate} step={0.01} min={0.05} max={2.6} onChange={(v) => patch((b) => (b.stats.rate = v))} />
                <Stat label="Mag" value={bp.stats.mag} step={1} min={2} max={75} onChange={(v) => patch((b) => (b.stats.mag = v))} />
                <Stat label="Reload" value={bp.stats.reload} step={0.1} min={1} max={3.6} onChange={(v) => patch((b) => (b.stats.reload = v))} />
              </div>

              <label className="flex items-center justify-between gap-2 font-pixel text-[7px] uppercase text-white/60">
                <span>Audio</span>
                <select
                  value={bp.audio.family}
                  onChange={(e) => patch((b) => (b.audio.family = e.target.value as AudioFamily))}
                  className="rounded border border-white/15 bg-black/40 px-2 py-1 font-pixel text-[8px] uppercase text-white outline-none"
                >
                  {AUDIO_FAMILIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>

              <textarea
                value={bp.lore}
                onChange={(e) => patch((b) => (b.lore = e.target.value.slice(0, 400)))}
                rows={2}
                placeholder="Lore…"
                className="w-full resize-none rounded border border-white/15 bg-black/40 px-2 py-1 font-pixel text-[7px] leading-relaxed text-white/80 outline-none focus:border-[#7fdfff]/60"
              />

              <div className="flex items-center justify-between font-pixel text-[7px] uppercase">
                <span className={dupPct >= 85 ? 'text-[#ff6f9a]' : 'text-[#aef5c8]/80'}>
                  {near ? `Closest ${dupPct}% · ${near.match.name}` : 'Unique — no matches'}
                </span>
                <span className="text-white/40">{bp.dna.featureHash}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setKept((ks) => (ks.some((k) => k.id === bp.id) ? ks : [...ks, bp]))}
                  disabled={isKept}
                  className="min-h-[30px] flex-1 rounded border border-[#aef5c8]/50 bg-[#aef5c8]/10 px-3 font-pixel text-[8px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20 disabled:opacity-40"
                >
                  {isKept ? '✓ Kept' : '✓ Keep for bake'}
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(JSON.stringify(bp, null, 2))}
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
