'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/user';

/**
 * Server-truth player progression. The client pushes a full snapshot of the game's
 * existing save blobs (arsenal / marine / loadout) + hot scalars (astro / bestLevel)
 * at the sync seams; the server stores them verbatim (last-write-wins per user).
 * Auth-guarded: no session → no read/write.
 */

export interface ProgressSnapshot {
  arsenal: Prisma.InputJsonValue;
  marine: Prisma.InputJsonValue;
  loadout?: Prisma.InputJsonValue | null;
  astro: number;
  bestLevel: number;
}

export interface ProgressData {
  arsenal: Prisma.JsonValue | null;
  marine: Prisma.JsonValue | null;
  loadout: Prisma.JsonValue | null;
  astro: number;
  bestLevel: number;
  empty: boolean; // true when the account has no progression yet (offer local import)
}

export async function getProgress(): Promise<ProgressData | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const p = await prisma.playerProgress.findUnique({ where: { userId: user.id } });
  if (!p) return { arsenal: null, marine: null, loadout: null, astro: 0, bestLevel: 0, empty: true };
  const empty = p.arsenal == null && p.marine == null && p.astro === 0 && p.bestLevel === 0;
  return { arsenal: p.arsenal, marine: p.marine, loadout: p.loadout, astro: p.astro, bestLevel: p.bestLevel, empty };
}

export async function saveProgress(snapshot: ProgressSnapshot): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  const data = {
    arsenal: snapshot.arsenal,
    marine: snapshot.marine,
    loadout: snapshot.loadout ?? Prisma.JsonNull,
    astro: Math.max(0, Math.floor(snapshot.astro || 0)),
    bestLevel: Math.max(0, Math.floor(snapshot.bestLevel || 0)),
  };
  try {
    await prisma.playerProgress.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });
    return { ok: true };
  } catch (err) {
    console.error('[progress] save failed:', err);
    return { ok: false };
  }
}
