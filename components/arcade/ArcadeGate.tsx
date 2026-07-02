'use client';

/**
 * Gate that hydrates account progress into localStorage BEFORE the game mounts
 * (so the game's existing loaders read the server truth), then renders Starshell.
 * Listens for the game's decoupled `starshell:progress` event to push progress to
 * the account, and flushes on page hide. This wrapper is SITE-only (it knows about
 * accounts); the game itself stays account-agnostic.
 */
import { useEffect, useState } from 'react';
import { FpsGame } from './FpsGame';
import { PROGRESS_EVENT } from './lib/progressEvent';
import { hydrateFromServer, pushProgress, flushProgress } from './lib/progressSync';

export function ArcadeGate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    hydrateFromServer().finally(() => {
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
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[100svh] w-full items-center justify-center bg-black">
        <p className="font-pixel text-[10px] tracking-[0.25em] text-[#7fdfff] [animation:gdg-fade-in_0.6s_ease-out]">SYNCING YOUR PROGRESS…</p>
      </div>
    );
  }
  return <FpsGame />;
}
