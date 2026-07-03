'use client';

/**
 * Gate that hydrates account progress into localStorage BEFORE the game mounts
 * (so the game's existing loaders read the server truth), then renders Starshell.
 * Listens for the game's decoupled `starshell:progress` event to push progress to
 * the account, and flushes on page hide. Also resolves the resumable run slot from
 * the URL (`?slot=<id>` resume · `?new=1` fresh) and wires server-backed run-slot
 * persistence. This wrapper is SITE-only (it knows about accounts); the game itself
 * stays account-agnostic.
 */
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FpsGame } from './FpsGame';
import { PROGRESS_EVENT } from './lib/progressEvent';
import { hydrateFromServer, pushProgress, flushProgress } from './lib/progressSync';
import { getRuns, upsertRun, deleteRun } from '@/app/actions/progress';
import { submitScore } from '@/app/actions/scores';
import type { RunSlot } from './lib/runSlot';

export function ArcadeGate() {
  const router = useRouter();
  const params = useSearchParams();
  const slotId = params.get('slot');
  const screen = params.get('screen'); // e.g. ?screen=division → open the Divisions screen
  const [ready, setReady] = useState(false);
  const [initialRun, setInitialRun] = useState<RunSlot | null>(null);

  useEffect(() => {
    let alive = true;
    // Hydrate progress + resolve the requested slot before the game mounts.
    Promise.all([hydrateFromServer(), slotId ? getRuns() : Promise.resolve([] as RunSlot[])])
      .then(([, runs]) => {
        if (!alive) return;
        if (slotId) setInitialRun(runs.find((r) => r.id === slotId) ?? null);
      })
      .finally(() => {
        if (alive) setReady(true);
      });

    const onProgress = (e: Event) => {
      const immediate = Boolean((e as CustomEvent<{ immediate?: boolean }>).detail?.immediate);
      if (immediate) flushProgress();
      else pushProgress();
    };
    const onHide = () => flushProgress();
    const onVis = () => {
      if (document.visibilityState === 'hidden') flushProgress();
    };
    window.addEventListener(PROGRESS_EVENT, onProgress);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      window.removeEventListener(PROGRESS_EVENT, onProgress);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [slotId]);

  if (!ready) {
    return (
      <div className="flex min-h-[100svh] w-full items-center justify-center bg-black">
        <p className="font-pixel text-[10px] tracking-[0.25em] text-[#7fdfff] [animation:gdg-fade-in_0.6s_ease-out]">SYNCING YOUR PROGRESS…</p>
      </div>
    );
  }
  return (
    <FpsGame
      initialRun={initialRun}
      initialScreen={screen}
      onRunSave={(slot) => { void upsertRun(slot); }}
      onRunEnd={(id) => { void deleteRun(id); }}
      onScore={(s) => { void submitScore(s); }}
      onExit={() => router.push('/play')}
    />
  );
}
