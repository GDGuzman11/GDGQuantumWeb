'use client';

/**
 * Progress sync — bridges the game's existing localStorage saves to the player's
 * account. On the gated /arcade mount we HYDRATE localStorage from the server
 * (server is truth), then PUSH a full snapshot at each save seam. Device settings
 * (`starshell.cfg`, `starshell.sens`) stay local and are never synced.
 */
import { getProgress, saveProgress, type ProgressData, type ProgressSnapshot } from '@/app/actions/progress';

const K = {
  arsenal: 'starshell.arsenal',
  marine: 'starshell.marine',
  astro: 'starshell.astro',
  best: 'starshell.best',
  loadout: 'starshell.loadout',
} as const;

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function ownedCount(v: unknown): number {
  const o = v as { owned?: unknown } | null;
  return o && Array.isArray(o.owned) ? o.owned.length : 0;
}

/** Read the account-relevant localStorage keys into a server snapshot. */
export function snapshotLocal(): ProgressSnapshot {
  return {
    arsenal: (readJson(K.arsenal) ?? {}) as ProgressSnapshot['arsenal'],
    marine: (readJson(K.marine) ?? {}) as ProgressSnapshot['marine'],
    loadout: (readJson(K.loadout) ?? null) as ProgressSnapshot['loadout'],
    astro: Number(localStorage.getItem(K.astro) || 0) || 0,
    bestLevel: Number(localStorage.getItem(K.best) || 0) || 0,
  };
}

function applyServerToLocal(d: ProgressData): void {
  try {
    if (d.arsenal != null) localStorage.setItem(K.arsenal, JSON.stringify(d.arsenal));
    if (d.marine != null) localStorage.setItem(K.marine, JSON.stringify(d.marine));
    if (d.loadout != null) localStorage.setItem(K.loadout, JSON.stringify(d.loadout));
    localStorage.setItem(K.astro, String(d.astro ?? 0));
    localStorage.setItem(K.best, String(d.bestLevel ?? 0));
  } catch {
    /* ignore quota/private mode */
  }
}

/** Load the account's progress into localStorage before the game reads it. If the
 *  account is empty but this device has progress, claim it once (server ← local). */
export async function hydrateFromServer(): Promise<void> {
  try {
    const data = await getProgress();
    if (!data) return; // not signed in (shouldn't happen on the gated route)
    if (!data.empty) {
      applyServerToLocal(data);
      return;
    }
    const local = snapshotLocal();
    const hasLocal =
      local.astro > 0 ||
      local.bestLevel > 0 ||
      ownedCount(local.arsenal) > 0 ||
      ownedCount(local.marine) > 0 ||
      Boolean((local.marine as { division?: unknown })?.division);
    if (hasLocal) await saveProgress(local);
  } catch (err) {
    console.error('[sync] hydrate failed:', err);
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced push of the current local progress to the account (call at save seams). */
export function pushProgress(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void saveProgress(snapshotLocal()).catch(() => {});
  }, 800);
}

/** Immediate push (e.g. page hide / run end). */
export function flushProgress(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  void saveProgress(snapshotLocal()).catch(() => {});
}
