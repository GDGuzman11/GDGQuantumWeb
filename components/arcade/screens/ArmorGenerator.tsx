'use client';

/**
 * DEV-ONLY Design DNA ARMOUR generator. Order: Division → Primary → Secondary DNA + a
 * batch COUNT (generate N sets per request). Each set previews live on the Marine, has
 * a COMPONENTS page listing every generated piece with a hover info window, shows the
 * full-set stats, and can be tuned + KEPT + EXPORTED to bake into
 * `fps/gen/generated-armor.json`. Baked sets surface in the Armory for their division.
 * Never shipped publicly — mounted only when `dev`.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { MarinePreview } from './MarinePreview';
import { DESIGN_DNA, type DesignDNA } from '../fps/gen/dna';
import { DIVISION_IDS, GEN_DIVISIONS, type GenDivisionId } from '../fps/gen/divisions';
import { generateArmorBlueprint } from '../fps/gen/armorClient';
import { armorSets, registerArmorSet } from '../fps/gen/armorSets';
import { armorSetPieces } from '../fps/marine/parts';
import { statLayers } from '../fps/marine/stats';
import { ARMOR_STAT_LABEL, type ArmorStat } from '../fps/marine/slots';
import type { ArmorPiece } from '../fps/marine/parts';
import { MANUFACTURERS } from '../fps/arsenal/manufacturers';
import { StatBar } from './StatBar';
import type { ArmorSetBlueprint } from '../fps/gen/armorBlueprint';

const STAT_ORDER: ArmorStat[] = ['armor', 'mobility', 'shield', 'recovery'];
const TIER_COLOR: Record<string, string> = { standard: '#9fb4ff', prototype: '#c8a8ff', legendary: '#ffd27a' };

const chip = (active: boolean) =>
  `min-h-[26px] rounded border px-2 py-1 font-pixel text-[7px] uppercase leading-tight transition-colors ${
    active ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 bg-white/[0.03] text-white/55 hover:bg-white/10'
  }`;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** One generated armour piece with a hover INFO WINDOW. */
function PieceChip({ piece }: { piece: ArmorPiece }) {
  const deltas = STAT_ORDER.filter((k) => (piece.stats[k] ?? 0) !== 0).map((k) => [ARMOR_STAT_LABEL[k], `${(piece.stats[k] ?? 0) > 0 ? '+' : ''}${Math.round((piece.stats[k] ?? 0) * 100)}%`] as [string, string]);
  const tc = TIER_COLOR[piece.tier] ?? '#fff';
  return (
    <div className="group relative">
      <span className="flex min-h-[26px] items-center gap-1 rounded border px-2 font-pixel text-[7px] uppercase" style={{ borderColor: `${tc}44`, color: `${tc}cc` }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex(piece.model.accent) }} />
        {piece.slot}
      </span>
      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden w-52 rounded-md border border-white/20 bg-[#0a0e15] p-2 shadow-xl group-hover:block">
        <p className="font-pixel text-[8px] uppercase" style={{ color: tc }}>{piece.name}</p>
        <div className="mb-1 mt-0.5 flex items-center gap-2 font-pixel text-[6px] uppercase text-white/45">
          <span>{piece.slot}</span>·<span style={{ color: tc }}>{piece.tier}</span>·<span>{MANUFACTURERS[piece.manufacturer]?.name ?? piece.manufacturer}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {deltas.length ? (
            deltas.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between font-pixel text-[6px] uppercase">
                <span className="text-white/40">{k}</span>
                <span className="text-[#aef5c8]">{v}</span>
              </div>
            ))
          ) : (
            <span className="font-pixel text-[6px] uppercase text-white/40">Cosmetic</span>
          )}
          <div className="mt-0.5 flex items-center justify-between font-pixel text-[6px] uppercase">
            <span className="text-white/40">Price</span>
            <span className="text-[#ffd27a]">◈{piece.price}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArmorGenerator({ onBack }: { onBack: () => void }) {
  const [division, setDivision] = useState<GenDivisionId>('vanguard');
  const [primary, setPrimary] = useState<DesignDNA>('Heavy Industrial');
  const [secondary, setSecondary] = useState<DesignDNA>('Military Standard');
  const [count, setCount] = useState(1);
  const [batch, setBatch] = useState<ArmorSetBlueprint[]>([]);
  const [cur, setCur] = useState(0);
  const [view, setView] = useState<'preview' | 'components'>('preview');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null);
  const [note, setNote] = useState('');
  const [kept, setKept] = useState<ArmorSetBlueprint[]>([]);
  const seedRef = useRef(1);

  const set = batch[cur] ?? null;
  const pieces = useMemo(() => (set ? armorSetPieces(set.id) : []), [set]);
  const layers = useMemo(() => (set ? statLayers(set.division, pieces) : null), [set, pieces]);

  const runGenerate = useCallback(async () => {
    setBusy(true);
    setNote('');
    const results: ArmorSetBlueprint[] = [];
    let src: 'ai' | 'fallback' = 'fallback';
    let noteMsg = '';
    for (let i = 0; i < count; i++) {
      const existing = [...armorSets(), ...results].map((s) => `${s.name} (${s.division})`);
      const res = await generateArmorBlueprint({ primary, secondary, division, existing, seed: (seedRef.current += 1) });
      registerArmorSet(res.blueprint);
      results.push(res.blueprint);
      src = res.source;
      if (res.note) noteMsg = res.note;
    }
    setBatch(results);
    setCur(0);
    setSource(src);
    setNote(noteMsg);
    setBusy(false);
  }, [primary, secondary, division, count]);

  const patch = useCallback(
    (mut: (b: ArmorSetBlueprint) => void) => {
      setBatch((prev) => {
        if (!prev[cur]) return prev;
        const next = [...prev];
        const clone: ArmorSetBlueprint = JSON.parse(JSON.stringify(next[cur]));
        mut(clone);
        registerArmorSet(clone);
        next[cur] = clone;
        return next;
      });
    },
    [cur],
  );

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
        {/* ── LEFT: Division → Primary → Secondary → Count → Generate ── */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#aef5c8]/80">1 · Division · issued to</p>
            <div className="grid grid-cols-3 gap-1">
              {DIVISION_IDS.map((d) => (
                <button key={d} type="button" onClick={() => setDivision(d)} style={division === d ? { color: hex(GEN_DIVISIONS[d].accent), borderColor: hex(GEN_DIVISIONS[d].accent) } : undefined} className={chip(division === d)}>
                  {GEN_DIVISIONS[d].name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#7fdfff]/80">2 · Primary DNA · ~70%</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {DESIGN_DNA.map((d) => (
                <button key={d} type="button" onClick={() => setPrimary(d)} className={chip(primary === d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-pixel text-[7px] uppercase tracking-[0.2em] text-[#ffd27a]/80">3 · Secondary DNA · ~30%</p>
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
            <button type="button" disabled={busy} onClick={runGenerate} className="min-h-[34px] rounded border border-[#aef5c8]/60 bg-[#aef5c8]/15 px-5 font-pixel text-[9px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/25 disabled:opacity-50">
              {busy ? '… GENERATING' : `✦ Generate ×${count}`}
            </button>
            {source && <span className="font-pixel text-[7px] uppercase text-white/45">{source === 'ai' ? '◆ AI' : '◇ FALLBACK'}</span>}
          </div>
          {note && <p className="font-pixel text-[6px] leading-relaxed text-[#ffd27a]/70">{note}</p>}

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
              <p className="mt-1 font-pixel text-[6px] leading-relaxed text-white/35">Replace components/arcade/fps/gen/generated-armor.json with this file to bake these sets into the Armory.</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: batch picker + live window / components page + tuning ── */}
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

          {/* view tabs */}
          <div className="flex gap-1">
            <button type="button" onClick={() => setView('preview')} className={chip(view === 'preview')}>◲ Live preview</button>
            <button type="button" onClick={() => setView('components')} className={chip(view === 'components')}>▤ Components{set ? ` · ${pieces.length}` : ''}</button>
          </div>

          <div className="relative min-h-72 w-full rounded-lg border border-white/10 bg-gradient-to-b from-[#0b0f16] to-[#05070c]">
            {!set ? (
              <div className="flex h-72 items-center justify-center font-pixel text-[8px] uppercase text-white/30">Pick DNA · Generate a set</div>
            ) : view === 'preview' ? (
              <div className="h-72">
                <MarinePreview key={set.id} equipped={pieces} divisionId={set.division} />
              </div>
            ) : (
              <div className="p-2">
                <p className="mb-1.5 font-pixel text-[7px] uppercase text-[#aef5c8]/80">All components · {pieces.length} · hover for info</p>
                <div className="flex flex-wrap gap-1">
                  {pieces.map((p) => (
                    <PieceChip key={p.id} piece={p} />
                  ))}
                </div>
              </div>
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
              {layers && (
                <div className="rounded border border-white/10 bg-white/[0.02] p-2 font-pixel">
                  <div className="mb-1.5 flex items-center justify-between text-[7px] uppercase">
                    <span className="text-white/55">Full-set rating</span>
                    <span className="text-[#aef5c8]">{layers.rating}/100</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {STAT_ORDER.map((k) => (
                      <StatBar key={k} label={ARMOR_STAT_LABEL[k]} base={layers.base[k]} added={layers.added[k]} delta={layers.base[k] > 0 ? layers.added[k] / layers.base[k] : 0} compact />
                    ))}
                  </div>
                  <p className="mt-1 text-[6px] text-white/35">Cyan = {GEN_DIVISIONS[set.division as GenDivisionId]?.name ?? set.division} base · green = this set adds</p>
                </div>
              )}
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
                <button type="button" onClick={() => setKept((ks) => (ks.some((k) => k.id === set.id) ? ks : [...ks, set]))} disabled={isKept} className="min-h-[30px] flex-1 rounded border border-[#aef5c8]/50 bg-[#aef5c8]/10 px-3 font-pixel text-[8px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20 disabled:opacity-40">
                  {isKept ? '✓ Kept' : '✓ Keep for bake'}
                </button>
                <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(set, null, 2))} className="min-h-[30px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10">
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
