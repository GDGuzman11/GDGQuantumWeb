'use client';

/**
 * The /play continue/start hub belt: up to 5 resumable campaign slots + one global
 * AstroDiamonds wallet total. SITE-only (it knows about accounts + server actions);
 * the game stays account-agnostic. Continue resumes the most-recent slot; each block
 * resumes its own run; Start New creates a slot (prompting a delete once 5 exist).
 */
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { RunSlot } from './lib/runSlot';
import { deleteRun, clearRuns, wipeProgress } from '@/app/actions/progress';

const MAX_RUNS = 5;

function ago(ms: number): string {
  if (!ms) return 'just now';
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function PlaySlots({ runs, astro }: { runs: RunSlot[]; astro: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [prompting, setPrompting] = useState(false); // "delete one to start new" mode
  const [busy, setBusy] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false); // two-step "erase all runs"
  const [pendingDelete, setPendingDelete] = useState<string | null>(null); // which run's delete is armed
  const [wipeStep, setWipeStep] = useState(0); // 0 idle · 1 purchase warning · 2 final type-to-confirm
  const [wipeWord, setWipeWord] = useState('');
  const WIPE_WORD = 'DELETE';

  const sorted = [...runs].sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = sorted[0] ?? null;
  const full = runs.length >= MAX_RUNS;

  const resume = (id: string) => router.push(`/arcade?slot=${encodeURIComponent(id)}`);
  const startNew = () => {
    if (full) { setPrompting(true); return; }
    router.push('/arcade?new=1');
  };
  const remove = (id: string) => {
    setBusy(true);
    startTransition(async () => {
      await deleteRun(id);
      setBusy(false);
      setPrompting(false);
      setPendingDelete(null);
      router.refresh();
    });
  };
  const eraseAll = () => {
    setBusy(true);
    startTransition(async () => {
      await clearRuns();
      setBusy(false);
      setPrompting(false);
      setConfirmErase(false);
      router.refresh();
    });
  };
  const cleanWipe = () => {
    setBusy(true);
    startTransition(async () => {
      await wipeProgress();
      // clear the game's local saves so nothing is re-synced back up
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith('starshell.')) localStorage.removeItem(k);
      } catch {
        /* ignore (private mode) */
      }
      setBusy(false);
      setPrompting(false);
      setWipeStep(0);
      setWipeWord('');
      router.refresh();
    });
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-xl">
      {/* wallet */}
      <div className="flex items-center justify-between rounded-lg border border-[#ffd27a]/25 bg-[#ffd27a]/[0.06] px-4 py-3">
        <p className="text-[7px] tracking-[0.25em] text-white/45">WALLET</p>
        <p className="text-[13px] text-[#ffd27a]">◈ {astro} <span className="text-[7px] tracking-[0.2em] text-white/40">ASTRODIAMONDS</span></p>
      </div>

      {/* primary actions */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!latest}
          onClick={() => latest && resume(latest.id)}
          className="rounded-lg border border-[#aef5c8]/40 bg-[#aef5c8]/10 p-5 text-left transition-colors hover:bg-[#aef5c8]/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:opacity-50"
        >
          <p className="text-[12px] text-[#aef5c8]">▸ CONTINUE</p>
          <p className="mt-2 text-[7px] leading-relaxed text-white/50">
            {latest ? `Resume Level ${latest.level} · ${ago(latest.updatedAt)}` : 'No run in progress.'}
          </p>
        </button>
        <button
          type="button"
          onClick={startNew}
          className="rounded-lg border border-[#7fdfff]/40 bg-[#7fdfff]/10 p-5 text-left transition-colors hover:bg-[#7fdfff]/20"
        >
          <p className="text-[12px] text-[#7fdfff]">✦ START NEW RUN</p>
          <p className="mt-2 text-[7px] leading-relaxed text-white/50">Start from the beginning (Level 1). Permanent unlocks carry over{full ? ` · pick a game to delete first (${MAX_RUNS}/${MAX_RUNS})` : ''}.</p>
        </button>
      </div>

      {/* slots belt */}
      {runs.length > 0 && (
        <>
          <p className="mt-6 text-[7px] tracking-[0.25em] text-white/40">
            SAVED RUNS · {runs.length}/{MAX_RUNS}
          </p>
          {prompting && (
            <p className="mt-2 text-[7px] leading-relaxed text-[#ff5d6e]/90">
              All {MAX_RUNS} slots full — delete a run below to start a new one.
            </p>
          )}
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sorted.map((r) => (
              <div
                key={r.id}
                className="relative flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => resume(r.id)}
                  className="flex-1 text-left transition-opacity hover:opacity-80"
                >
                  <p className="text-[13px] text-[#aef5c8]">LEVEL {r.level}</p>
                  <p className="mt-1 text-[6px] tracking-[0.2em] text-white/40">{ago(r.updatedAt)} · ⛀ {r.gold}</p>
                </button>
                {pendingDelete === r.id ? (
                  <div className="ml-3 flex items-center gap-1">
                    <button type="button" disabled={busy || pending} onClick={() => remove(r.id)} className="min-h-[28px] rounded-md border border-[#ff5d6e]/60 bg-[#ff5d6e]/15 px-2 text-[7px] uppercase text-[#ff5d6e] transition-colors hover:bg-[#ff5d6e]/25 disabled:opacity-40">
                      Delete
                    </button>
                    <button type="button" onClick={() => setPendingDelete(null)} aria-label="Cancel delete" className="min-h-[28px] min-w-[28px] rounded-md border border-white/20 text-[9px] text-white/60 transition-colors hover:bg-white/10">
                      ✗
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(r.id)}
                    aria-label={`Delete run at level ${r.level}`}
                    className="ml-3 min-h-[28px] min-w-[28px] rounded-md border border-[#ff5d6e]/30 text-[9px] text-[#ff5d6e]/70 transition-colors hover:bg-[#ff5d6e]/15 hover:text-[#ff5d6e]"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Erase all runs — a fresh start. Permanent progression is kept. */}
          <div className="mt-4 flex flex-col items-center gap-2">
            {confirmErase ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-[#ff5d6e]/40 bg-[#ff5d6e]/[0.06] px-4 py-3">
                <p className="text-center text-[7px] leading-relaxed text-[#ff5d6e]/90">
                  Erase all {runs.length} saved run{runs.length === 1 ? '' : 's'}? Your unlocks, armory, division and AstroDiamonds are kept.
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={busy || pending} onClick={eraseAll} className="min-h-[32px] rounded-md border border-[#ff5d6e]/50 bg-[#ff5d6e]/15 px-4 text-[8px] uppercase text-[#ff5d6e] transition-colors hover:bg-[#ff5d6e]/25 disabled:opacity-40">
                    Erase everything
                  </button>
                  <button type="button" onClick={() => setConfirmErase(false)} className="min-h-[32px] rounded-md border border-white/20 px-4 text-[8px] uppercase text-white/60 transition-colors hover:bg-white/10">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmErase(true)} className="min-h-[32px] text-[7px] uppercase tracking-[0.2em] text-white/35 transition-colors hover:text-[#ff5d6e]">
                ⌦ Erase run data
              </button>
            )}
          </div>
        </>
      )}

      {/* CLEAN WIPE — erase EVERYTHING incl. purchases. Two escalating confirmations. */}
      <div className="mt-3 flex flex-col items-center gap-2 border-t border-white/5 pt-4">
        {wipeStep === 0 && (
          <button type="button" onClick={() => setWipeStep(1)} className="min-h-[32px] text-[7px] uppercase tracking-[0.2em] text-white/30 transition-colors hover:text-[#ff3a48]">
            ⚠ Clean wipe · erase all data
          </button>
        )}

        {/* Step 1 — purchases are non-refundable */}
        {wipeStep === 1 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-[#ff3a48] bg-[#ff3a48]/[0.1] px-5 py-4">
            <p className="text-center text-[11px] font-bold uppercase leading-relaxed tracking-[0.1em] text-[#ff3a48] sm:text-[13px]">
              ⚠ If you delete this, any items you bought with money CANNOT be returned or refunded. Are you sure?
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setWipeStep(2)} className="min-h-[34px] rounded-md border border-[#ff3a48]/70 bg-[#ff3a48]/20 px-5 text-[9px] uppercase text-[#ff8a92] transition-colors hover:bg-[#ff3a48]/30">
                Yes, continue
              </button>
              <button type="button" onClick={() => setWipeStep(0)} className="min-h-[34px] rounded-md border border-white/25 px-5 text-[9px] uppercase text-white/70 transition-colors hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — final, type the word to confirm */}
        {wipeStep === 2 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-[#ff3a48] bg-[#ff3a48]/[0.14] px-5 py-4">
            <p className="text-center text-[10px] font-bold uppercase leading-relaxed tracking-[0.1em] text-[#ff3a48] sm:text-[12px]">
              This deletion is FINAL and cannot be undone.
            </p>
            <p className="text-center text-[8px] leading-relaxed text-white/60">
              Everything is erased — runs, arsenal, armory, division, and all AstroDiamonds. Type <span className="font-bold text-[#ff8a92]">{WIPE_WORD}</span> to confirm.
            </p>
            <input
              type="text"
              value={wipeWord}
              onChange={(e) => setWipeWord(e.target.value)}
              placeholder={WIPE_WORD}
              aria-label={`Type ${WIPE_WORD} to confirm`}
              className="w-40 rounded-md border border-[#ff3a48]/50 bg-black/50 px-3 py-2 text-center text-[10px] uppercase tracking-[0.3em] text-white outline-none focus:border-[#ff3a48]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || pending || wipeWord.trim().toUpperCase() !== WIPE_WORD}
                onClick={cleanWipe}
                className="min-h-[34px] rounded-md border border-[#ff3a48] bg-[#ff3a48]/30 px-5 text-[9px] uppercase text-white transition-colors hover:bg-[#ff3a48]/45 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Delete everything forever
              </button>
              <button type="button" onClick={() => { setWipeStep(0); setWipeWord(''); }} className="min-h-[34px] rounded-md border border-white/25 px-5 text-[9px] uppercase text-white/70 transition-colors hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
