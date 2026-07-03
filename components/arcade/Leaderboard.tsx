'use client';

/**
 * Server-wide Starshell leaderboard for the pilot console (Main Lobby). Two tabs:
 * ALL-TIME (each player's highest-scoring run ever) and TODAY (their best run in
 * the current UTC day). Seeded server-side from the page for a fast first paint;
 * a refresh button re-pulls live. SITE-only (it calls the score server action);
 * the game stays account-agnostic.
 */
import { useState, useTransition } from 'react';
import { getLeaderboard, type Leaderboard, type LeaderEntry } from '@/app/actions/scores';

const DIFF_COLOR: Record<string, string> = { normal: '#9fb4ff', hard: '#ffd27a', nightmare: '#ff8a92' };
const medal = (rank: number) => (rank === 1 ? '①' : rank === 2 ? '②' : rank === 3 ? '③' : String(rank));

function Rows({ entries }: { entries: LeaderEntry[] }) {
  if (entries.length === 0) {
    return <p className="px-3 py-6 text-center text-[8px] leading-relaxed text-white/40">No scores yet — finish a run to put yourself on the board.</p>;
  }
  return (
    <div className="flex flex-col">
      {entries.map((e) => (
        <div
          key={`${e.rank}-${e.displayName}`}
          className={`flex items-center gap-2 border-t border-white/5 px-3 py-2 first:border-t-0 ${e.isMe ? 'bg-[#7fdfff]/[0.08]' : ''}`}
        >
          <span className={`w-6 shrink-0 text-center text-[10px] ${e.rank <= 3 ? 'text-[#ffd27a]' : 'text-white/40'}`}>{medal(e.rank)}</span>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-[10px] ${e.isMe ? 'text-[#7fdfff]' : 'text-white/85'}`}>
              {e.displayName}
              {e.isMe && <span className="ml-1 text-[6px] tracking-[0.2em] text-[#7fdfff]/70">YOU</span>}
            </p>
            <p className="mt-0.5 text-[6px] tracking-[0.15em] text-white/40">
              LVL {e.level} · {e.kills} K · {e.headshots} HS ·{' '}
              <span style={{ color: DIFF_COLOR[e.difficulty] ?? '#9fb4ff' }}>{e.difficulty.toUpperCase()}</span>
            </p>
          </div>
          <span className="shrink-0 text-[13px] text-[#aef5c8]">{e.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function LeaderboardPanel({ initial }: { initial: Leaderboard }) {
  const [board, setBoard] = useState<Leaderboard>(initial);
  const [tab, setTab] = useState<'allTime' | 'today'>('allTime');
  const [pending, startTransition] = useTransition();

  const refresh = () =>
    startTransition(async () => {
      setBoard(await getLeaderboard());
    });

  const entries = tab === 'allTime' ? board.allTime : board.today;

  return (
    <div className="mx-auto mt-3 w-full max-w-xl rounded-lg border border-[#aef5c8]/25 bg-[#aef5c8]/[0.04]">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[12px] text-[#aef5c8]">✸ LEADERBOARD</p>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="min-h-[28px] rounded-md border border-white/15 px-2.5 text-[7px] uppercase tracking-[0.2em] text-white/55 transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          {pending ? '…' : '↻ Refresh'}
        </button>
      </div>

      {/* tabs */}
      <div className="flex gap-1 px-3">
        {(['allTime', 'today'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-t-md border-b-2 px-2 py-1.5 text-[8px] uppercase tracking-[0.2em] transition-colors ${
              tab === t ? 'border-[#aef5c8] text-[#aef5c8]' : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {t === 'allTime' ? 'All-Time' : 'Today'}
          </button>
        ))}
      </div>

      <div className="rounded-b-lg bg-black/20 pb-1">
        <Rows entries={entries} />
      </div>
      <p className="px-4 py-2 text-[6px] leading-relaxed text-white/30">
        Score rewards how far you get, kills, headshots, accuracy and difficulty — not gold. Best run per player. Today resets at 00:00 UTC.
      </p>
    </div>
  );
}
