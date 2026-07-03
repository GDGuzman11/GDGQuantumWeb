'use server';

import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/user';
import { computeScore, accuracyPct, type ScorePayload } from '@/components/arcade/lib/score';

/**
 * Server-wide leaderboard. A finished run submits its RAW stats; the server
 * RE-computes the score authoritatively (the client never dictates the number),
 * clamps the inputs against tampering, and stores one RunScore row. The board
 * reads best-per-player for all-time and for the current (UTC) day.
 * Auth-guarded: no session → no submit/read.
 */

export interface LeaderEntry {
  rank: number;
  displayName: string;
  score: number;
  level: number;
  kills: number;
  headshots: number;
  difficulty: string;
  isMe: boolean;
}

export interface Leaderboard {
  allTime: LeaderEntry[];
  today: LeaderEntry[];
}

const TOP_N = 20; // rows shown per board
const SCAN = 200; // rows scanned before de-duping to best-per-player

const clampInt = (n: unknown, lo: number, hi: number): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : 0;
  return Math.max(lo, Math.min(hi, v));
};

/** Submit a finished run's score. Returns the computed score (or null if rejected). */
export async function submitScore(raw: ScorePayload): Promise<{ ok: boolean; score?: number }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };

  // Clamp raw inputs to sane ranges before scoring (defence against a tampered client).
  const level = clampInt(raw?.level, 0, 500);
  const kills = clampInt(raw?.kills, 0, 100000);
  const headshots = clampInt(raw?.headshots, 0, kills > 0 ? kills : 100000);
  const shots = clampInt(raw?.shots, 0, 10000000);
  const hits = clampInt(raw?.hits, 0, shots > 0 ? shots : 10000000);
  const difficulty = ['normal', 'hard', 'nightmare'].includes(raw?.difficulty) ? raw.difficulty : 'normal';
  const won = Boolean(raw?.won);
  if (level <= 0) return { ok: false }; // nothing to record

  const score = computeScore({ level, kills, headshots, shots, hits, difficulty, won });
  const accuracy = accuracyPct(shots, hits);

  try {
    await prisma.runScore.create({
      data: { userId: user.id, displayName: user.displayName, score, level, kills, headshots, accuracy, difficulty, won },
    });
    return { ok: true, score };
  } catch (err) {
    console.error('[scores] submit failed:', err);
    return { ok: false };
  }
}

type Row = { userId: string; displayName: string; score: number; level: number; kills: number; headshots: number; difficulty: string };

/** Reduce raw rows (already score-desc) to the best single row per player, top N. */
function bestPerPlayer(rows: Row[], meId: string | null): LeaderEntry[] {
  const seen = new Set<string>();
  const out: LeaderEntry[] = [];
  for (const r of rows) {
    if (seen.has(r.userId)) continue;
    seen.add(r.userId);
    out.push({
      rank: out.length + 1,
      displayName: r.displayName,
      score: r.score,
      level: r.level,
      kills: r.kills,
      headshots: r.headshots,
      difficulty: r.difficulty,
      isMe: r.userId === meId,
    });
    if (out.length >= TOP_N) break;
  }
  return out;
}

/** The full leaderboard: all-time best-per-player + today (UTC) best-per-player. */
export async function getLeaderboard(): Promise<Leaderboard> {
  const user = await getSessionUser();
  const meId = user?.id ?? null;
  const select = { userId: true, displayName: true, score: true, level: true, kills: true, headshots: true, difficulty: true } as const;
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  try {
    const [allRows, todayRows] = await Promise.all([
      prisma.runScore.findMany({ orderBy: { score: 'desc' }, take: SCAN, select }),
      prisma.runScore.findMany({ where: { createdAt: { gte: startOfDay } }, orderBy: { score: 'desc' }, take: SCAN, select }),
    ]);
    return { allTime: bestPerPlayer(allRows, meId), today: bestPerPlayer(todayRows, meId) };
  } catch (err) {
    console.error('[scores] leaderboard read failed:', err);
    return { allTime: [], today: [] };
  }
}
