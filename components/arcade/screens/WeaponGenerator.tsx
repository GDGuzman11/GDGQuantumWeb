'use client';

/**
 * DEV-ONLY Design DNA weapon generator. Order: Division → Weapon type → Primary →
 * Secondary DNA + a batch COUNT (generate N per request). Each generated gun previews
 * live in 3D, lists its COMPONENTS (the parametric parts that build the model) with a
 * hover info window per component, and can be tuned + KEPT + EXPORTED to bake into
 * `fps/gen/generated.json`. Never shipped publicly — mounted only when `dev`.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { GunPreview } from './GunPreview';
import { sfx } from '../engine/audio';
import type { Family } from '../fps/weapons';
import { DESIGN_DNA, type DesignDNA } from '../fps/gen/dna';
import { DIVISION_IDS, GEN_DIVISIONS, type GenDivisionId } from '../fps/gen/divisions';
import { generateWeapon } from '../fps/gen/client';
import { generatedBlueprints, registerBlueprint } from '../fps/gen/registry';
import { AUDIO_FAMILIES, WEAPON_FAMILIES, type AudioFamily, type BlueprintSlot, type WeaponBlueprint } from '../fps/gen/blueprint';
import { nearestMatch } from '../fps/gen/similarity';

/** Which loadout pool a family lands in (mirrors weapons.ts). */
function poolLabel(f: Family): string {
  if (f === 'rifle' || f === 'mg' || f === 'laser') return 'PRIMARY';
  if (f === 'sniper' || f === 'launcher') return 'SECONDARY';
  return 'SIDEARM';
}
const MUZZLE = ['none', 'brake', 'ports', 'shroud'];
const hexc = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

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

/** A weapon component (blueprint slot) chip with a hover INFO WINDOW. */
function SlotChip({ slot, accent }: { slot: BlueprintSlot; accent: number }) {
  const rows: [string, string][] = [
    ['Length', `×${slot.len.toFixed(2)}`],
    ['Girth', `×${slot.girth.toFixed(2)}`],
    ['Segments', `${slot.segs}`],
    ['Vents', `${slot.vents}`],
    ['Muzzle', MUZZLE[slot.muzzle] ?? `${slot.muzzle}`],
    ['Taper', slot.taper.toFixed(2)],
    ['Glow', `${Math.round(slot.emissive * 100)}%`],
    ['Motion', slot.moving ?? 'static'],
  ];
  return (
    <div className="group relative">
      <span className="inline-flex min-h-[24px] items-center gap-1 rounded border border-white/15 bg-white/[0.03] px-2 font-pixel text-[7px] uppercase text-white/70">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hexc(accent) }} />
        {slot.slot}
        {slot.moving && <span className="text-[#ffd27a]">✦</span>}
      </span>
      {/* hover info window */}
      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden w-44 rounded-md border border-white/20 bg-[#0a0e15] p-2 shadow-xl group-hover:block">
        <p className="mb-1 font-pixel text-[8px] uppercase text-[#7fdfff]">{slot.slot}</p>
        <div className="flex flex-col gap-0.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between font-pixel text-[6px] uppercase">
              <span className="text-white/40">{k}</span>
              <span className="text-white/80">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WeaponGenerator({ onBack }: { onBack: () => void }) {
  const [division, setDivision] = useState<GenDivisionId | 'any'>('any');
  const [familySel, setFamilySel] = useState<Family | 'auto'>('auto');
  const [primary, setPrimary] = useState<DesignDNA>('Military Standard');
  const [secondary, setSecondary] = useState<DesignDNA>('Precision Tactical');
  const [count, setCount] = useState(1);
  const [batch, setBatch] = useState<WeaponBlueprint[]>([]);
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null);
  const [note, setNote] = useState('');
  const [kept, setKept] = useState<WeaponBlueprint[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [fireNonce, setFireNonce] = useState(0);
  const [showBakeset, setShowBakeset] = useState(false); // the bake-set viewer modal
  const [bakeSel, setBakeSel] = useState(0); // which kept weapon is previewed
  const seedRef = useRef(1);

  const bp = batch[cur] ?? null;

  // Test fire: kick the muzzle-flash/recoil in the preview + play the weapon's audio
  // (its selected audio family), so you see + hear the gun fire.
  const testFire = useCallback(() => {
    if (!bp) return;
    setFireNonce((n) => n + 1);
    sfx.playWeaponFire(bp.id, bp.family);
  }, [bp]);

  const runGenerate = useCallback(async () => {
    setBusy(true);
    setNote('');
    const results: WeaponBlueprint[] = [];
    let src: 'ai' | 'fallback' = 'fallback';
    let noteMsg = '';
    for (let i = 0; i < count; i++) {
      const existing = [...generatedBlueprints(), ...results].map((b) => `${b.name} (${b.dna.primary}>${b.dna.secondary})`);
      const res = await generateWeapon({
        primary,
        secondary,
        family: familySel === 'auto' ? undefined : familySel,
        division: division === 'any' ? undefined : division,
        existing,
        seed: (seedRef.current += 1),
      });
      registerBlueprint(res.blueprint);
      results.push(res.blueprint);
      src = res.source;
      if (res.note) noteMsg = res.note;
    }
    setBatch(results);
    setCur(0);
    setSource(src);
    setNote(noteMsg);
    setBusy(false);
  }, [primary, secondary, familySel, division, count]);

  // Live-update the current weapon in the batch on edit so preview + audio track.
  const patch = useCallback(
    (mut: (b: WeaponBlueprint) => void) => {
      setBatch((prev) => {
        if (!prev[cur]) return prev;
        const next = [...prev];
        const clone: WeaponBlueprint = JSON.parse(JSON.stringify(next[cur]));
        mut(clone);
        registerBlueprint(clone);
        next[cur] = clone;
        return next;
      });
    },
    [cur],
  );

  const near = useMemo(() => (bp ? nearestMatch(bp, generatedBlueprints().filter((b) => b.id !== bp.id)) : null), [bp]);
  const dupPct = near ? Math.round(near.score * 100) : 0;
  const isKept = bp ? kept.some((k) => k.id === bp.id) : false;

  const download = () => {
    const blob = new Blob([JSON.stringify(kept, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#05070c] text-white">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-[#7fdfff]">⚙ DEV · DNA WEAPON GENERATOR</h2>
        <button type="button" onClick={onBack} className="min-h-[28px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10">
          ◂ Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* ── LEFT: Division → Weapon type → Primary → Secondary → Count → Generate ── */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#aef5c8]/80">1 · Division · issued to</p>
            <div className="grid grid-cols-3 gap-1">
              <button type="button" onClick={() => setDivision('any')} className={chip(division === 'any')}>
                ANY · universal
              </button>
              {DIVISION_IDS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDivision(d)}
                  style={division === d ? { color: hexc(GEN_DIVISIONS[d].accent), borderColor: hexc(GEN_DIVISIONS[d].accent) } : undefined}
                  className={chip(division === d)}
                >
                  {GEN_DIVISIONS[d].name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-white/60">2 · Weapon type</p>
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
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#7fdfff]/80">3 · Primary DNA · ~70%</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {DESIGN_DNA.map((d) => (
                <button key={d} type="button" onClick={() => setPrimary(d)} className={chip(primary === d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#ffd27a]/80">4 · Secondary DNA · ~30%</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {DESIGN_DNA.map((d) => (
                <button key={d} type="button" onClick={() => setSecondary(d)} className={`${chip(secondary === d)} ${d === primary ? 'opacity-40' : ''}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-pixel text-[7px] uppercase text-white/60">Count</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 6].map((n) => (
                <button key={n} type="button" onClick={() => setCount(n)} className={chip(count === n)}>
                  ×{n}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={runGenerate}
              className="min-h-[34px] rounded border border-[#7fdfff]/60 bg-[#7fdfff]/15 px-5 font-pixel text-[9px] uppercase text-[#7fdfff] transition-colors hover:bg-[#7fdfff]/25 disabled:opacity-50"
            >
              {busy ? '… GENERATING' : `✦ Generate ×${count}`}
            </button>
            {source && <span className="font-pixel text-[7px] uppercase text-white/45">{source === 'ai' ? '◆ AI' : '◇ FALLBACK'}</span>}
          </div>
          {note && <p className="font-pixel text-[6px] leading-relaxed text-[#ffd27a]/70">{note}</p>}

          <button
            type="button"
            onClick={() => {
              setBakeSel(0);
              setShowBakeset(true);
            }}
            className="mt-1 min-h-[34px] rounded border border-[#aef5c8]/50 bg-[#aef5c8]/10 px-4 font-pixel text-[8px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20"
          >
            📦 View bake set · {kept.length}
          </button>
        </div>

        {/* ── RIGHT: batch picker + preview + tuning + components ── */}
        <div className="flex flex-col gap-3">
          {batch.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {batch.map((b, i) => (
                <button key={b.id} type="button" onClick={() => setCur(i)} className={chip(cur === i)}>
                  {i + 1} · {b.name}
                </button>
              ))}
            </div>
          )}

          <div className="relative h-56 w-full rounded-lg border border-white/10 bg-gradient-to-b from-[#0b0f16] to-[#05070c]">
            {bp ? (
              <>
                <GunPreview key={bp.id} gunId={bp.id} onExpand={() => setExpanded(true)} />
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="absolute bottom-2 right-2 rounded border border-[#7fdfff]/40 bg-black/50 px-2 py-1 font-pixel text-[7px] uppercase text-[#7fdfff] backdrop-blur-sm hover:bg-black/70"
                >
                  ⤢ Test range
                </button>
              </>
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
                  <span className="rounded border px-2 py-0.5" style={{ color: hexc(GEN_DIVISIONS[bp.division as GenDivisionId]?.accent ?? 0xffffff), borderColor: `${hexc(GEN_DIVISIONS[bp.division as GenDivisionId]?.accent ?? 0xffffff)}66` }}>
                    ⬡ {GEN_DIVISIONS[bp.division as GenDivisionId]?.name ?? bp.division}
                  </span>
                )}
              </div>

              {/* COMPONENTS — hover a chip for its info window */}
              <div className="rounded border border-white/10 bg-white/[0.02] p-2">
                <p className="mb-1.5 font-pixel text-[7px] uppercase text-[#7fdfff]/80">Components · {bp.model.slots.length} · hover for info</p>
                <div className="flex flex-wrap gap-1">
                  {bp.model.slots.map((s, i) => (
                    <SlotChip key={`${s.slot}-${i}`} slot={s} accent={bp.model.palette.accent} />
                  ))}
                </div>
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
                <span className={dupPct >= 85 ? 'text-[#ff6f9a]' : 'text-[#aef5c8]/80'}>{near ? `Closest ${dupPct}% · ${near.match.name}` : 'Unique — no matches'}</span>
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
                <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(bp, null, 2))} className="min-h-[30px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10">
                  ⧉ Copy JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      </div>

      {/* ── TEST RANGE — enlarged preview + Test Fire (visual + audio) ── */}
      {expanded && bp && (
        <div className="absolute inset-0 z-[70] flex flex-col bg-[#05070c] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-[#7fdfff]">🎯 {bp.name} · TEST RANGE</h3>
            <button type="button" onClick={() => setExpanded(false)} className="min-h-[30px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10">
              ✕ Close
            </button>
          </div>
          <div className="relative mt-3 flex-1 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#0b0f16] to-[#05070c]">
            <GunPreview key={`big-${bp.id}`} gunId={bp.id} fireNonce={fireNonce} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={testFire}
              className="min-h-[46px] rounded-md border border-[#ff7a3a]/60 bg-[#ff7a3a]/15 px-8 font-pixel text-[12px] uppercase text-[#ff7a3a] transition-transform hover:bg-[#ff7a3a]/25 active:scale-95"
            >
              🔥 Test Fire
            </button>
            <label className="flex items-center gap-2 font-pixel text-[8px] uppercase text-white/60">
              <span>Audio</span>
              <select
                value={bp.audio.family}
                onChange={(e) => patch((b) => (b.audio.family = e.target.value as AudioFamily))}
                className="rounded border border-white/15 bg-black/40 px-2 py-1.5 font-pixel text-[9px] uppercase text-white outline-none"
              >
                {AUDIO_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <span className="font-pixel text-[8px] uppercase text-white/45">{bp.family} · dmg {bp.stats.dmg} · rate {bp.stats.rate}s</span>
          </div>
          <p className="mt-2 text-center font-pixel text-[7px] uppercase text-white/35">Drag to rotate · Test Fire shows the muzzle flash + recoil and plays the selected audio</p>
        </div>
      )}

      {/* ── BAKE SET VIEWER — the kept weapons, each previewable + removable ── */}
      {showBakeset && (
        <div className="absolute inset-0 z-[70] flex flex-col bg-[#05070c] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-[#aef5c8]">📦 BAKE SET · {kept.length}</h3>
            <button type="button" onClick={() => setShowBakeset(false)} className="min-h-[30px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10">
              ✕ Close
            </button>
          </div>

          {kept.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center font-pixel text-[9px] uppercase leading-relaxed text-white/30">
              Nothing kept yet — generate a weapon, then hit “✓ Keep for bake” to add it here.
            </div>
          ) : (
            <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
              {/* kept list — click to preview, ✕ to remove */}
              <div className="flex flex-col gap-1 overflow-y-auto">
                {kept.map((k, i) => {
                  const active = i === Math.min(bakeSel, kept.length - 1);
                  return (
                    <div key={k.id} className={`flex items-center gap-2 rounded border px-2 py-1.5 ${active ? 'border-[#aef5c8] bg-[#aef5c8]/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                      <button type="button" onClick={() => setBakeSel(i)} className="flex flex-1 flex-col items-start overflow-hidden text-left">
                        <span className="truncate font-pixel text-[8px] uppercase text-white">{k.name}</span>
                        <span className="truncate font-pixel text-[6px] uppercase text-white/45">
                          {k.family} · {poolLabel(k.family)}
                          {k.division ? ` · ⬡ ${GEN_DIVISIONS[k.division as GenDivisionId]?.name ?? k.division}` : ''}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${k.name}`}
                        onClick={() => setKept((ks) => ks.filter((x) => x.id !== k.id))}
                        className="shrink-0 rounded border border-white/10 px-2 py-1 font-pixel text-[9px] text-white/40 hover:border-[#ff6f9a]/50 hover:text-[#ff6f9a]"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* live 3D preview of the selected kept weapon */}
              {(() => {
                const sel = kept[Math.min(bakeSel, kept.length - 1)];
                if (!sel) return null;
                return (
                  <div className="flex min-h-0 flex-col gap-2">
                    <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#0b0f16] to-[#05070c]">
                      <GunPreview key={`bake-${sel.id}`} gunId={sel.id} />
                    </div>
                    <div className="font-pixel text-[10px] uppercase text-white">{sel.name}</div>
                    <div className="flex flex-wrap items-center gap-1 font-pixel text-[7px] uppercase">
                      <span className="rounded border border-white/15 bg-white/[0.04] px-2 py-0.5 text-white/70">{sel.family} · {poolLabel(sel.family)}</span>
                      {sel.division && (
                        <span className="rounded border px-2 py-0.5" style={{ color: hexc(GEN_DIVISIONS[sel.division as GenDivisionId]?.accent ?? 0xffffff), borderColor: `${hexc(GEN_DIVISIONS[sel.division as GenDivisionId]?.accent ?? 0xffffff)}66` }}>
                          ⬡ {GEN_DIVISIONS[sel.division as GenDivisionId]?.name ?? sel.division}
                        </span>
                      )}
                      <span className="text-white/45">dmg {sel.stats.dmg} · rate {sel.stats.rate}s · mag {sel.stats.mag}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="mt-3 flex flex-col gap-1">
            <button
              type="button"
              onClick={download}
              disabled={kept.length === 0}
              className="min-h-[38px] rounded-md border border-[#aef5c8]/60 bg-[#aef5c8]/15 px-6 font-pixel text-[9px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/25 disabled:opacity-40"
            >
              ⬇ Download generated.json ({kept.length})
            </button>
            <p className="text-center font-pixel text-[6px] leading-relaxed text-white/35">Replace components/arcade/fps/gen/generated.json with this file to bake these weapons in.</p>
          </div>
        </div>
      )}
    </div>
  );
}
