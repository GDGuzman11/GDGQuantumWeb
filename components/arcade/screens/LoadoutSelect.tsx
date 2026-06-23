'use client';

import { useMemo, useState } from 'react';
import { arsenalFor } from '../engine/weapons';
import type { Weapon } from '../engine/types';

const PICK = 20;

/** Pick 20 of the tank's 30 weapons. AUTO fills a balanced spread of kinds. */
export function LoadoutSelect({
  tankId,
  color,
  onConfirm,
  onBack,
}: {
  tankId: string;
  color: string;
  onConfirm: (loadout: Weapon[]) => void;
  onBack: () => void;
}) {
  // Display sorted by kind so the grid reads as organised.
  const all = useMemo(
    () => [...arsenalFor(tankId)].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)),
    [tankId],
  );
  const [sel, setSel] = useState<Set<string>>(() => new Set(autoPick(all).slice(0, PICK)));

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < PICK) n.add(id);
      return n;
    });

  const auto = () => setSel(new Set(autoPick(all)));
  const confirm = () => onConfirm(all.filter((w) => sel.has(w.id)));

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black/80 px-3 py-3 sm:px-4">
      <div className="flex items-center justify-between">
        <p className="font-pixel text-[9px] sm:text-[11px]" style={{ color }}>
          LOADOUT · {sel.size} / {PICK}
        </p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={auto} className="font-pixel text-[8px] text-[#aef5c8] hover:text-white sm:text-[9px]">
            AUTO ✦
          </button>
          <button type="button" onClick={onBack} className="font-pixel text-[8px] text-white/45 hover:text-white sm:text-[9px]">
            ◂ BACK
          </button>
        </div>
      </div>

      <div className="mt-2 grid flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
        {all.map((w) => {
          const on = sel.has(w.id);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => toggle(w.id)}
              className={`flex flex-col items-start rounded border px-2 py-1 text-left transition-colors ${
                on ? 'bg-white/10' : 'border-white/10 bg-white/[0.02] opacity-60 hover:opacity-100'
              }`}
              style={on ? { borderColor: color } : undefined}
            >
              <span className="font-pixel text-[7px] leading-tight text-white sm:text-[8px]">{w.name}</span>
              <span className="font-pixel text-[5px] uppercase text-white/40 sm:text-[6px]">
                {w.kind} · {w.damage}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={confirm}
        disabled={sel.size !== PICK}
        className="mt-2 min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 font-pixel text-[10px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8] disabled:cursor-not-allowed disabled:opacity-30 sm:text-[12px]"
      >
        {sel.size === PICK ? 'Deploy ▸' : `Pick ${PICK - sel.size} more`}
      </button>
    </div>
  );
}

/** Round-robin across weapon kinds for a balanced 20. */
function autoPick(all: Weapon[]): string[] {
  const byKind = new Map<string, Weapon[]>();
  for (const w of all) {
    const a = byKind.get(w.kind) ?? [];
    a.push(w);
    byKind.set(w.kind, a);
  }
  const lists = [...byKind.values()];
  const out: string[] = [];
  let i = 0;
  while (out.length < PICK && i < 400) {
    const l = lists[i % lists.length];
    const w = l.shift();
    if (w) out.push(w.id);
    i++;
  }
  return out;
}
