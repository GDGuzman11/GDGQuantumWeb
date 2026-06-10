/**
 * Reveal coordination — a tiny latched pub/sub that decouples the Preloader
 * (which decides WHEN the site is ready to be seen) from the hero entrance
 * animation (which decides WHAT happens on reveal).
 *
 * The Preloader is rendered at the app root; the hero copy lives deep inside
 * the PanelDeck. Rather than thread a prop/context through the deck, the
 * Preloader calls `markRevealStarted()` the instant its count completes, and
 * any number of consumers subscribe with `onReveal(cb)`.
 *
 * It is LATCHED so mount order can't cause a missed signal: if a consumer
 * subscribes AFTER the reveal already fired (e.g. the hero hydrates late), its
 * callback runs immediately. This is the seam Phase 3 hangs the hero timeline
 * + per-panel reveals off of.
 */

let started = false;
const listeners = new Set<() => void>();

/** Has the reveal been triggered yet? */
export function isRevealStarted(): boolean {
  return started;
}

/**
 * Fire the reveal exactly once. Idempotent — subsequent calls are no-ops, so
 * the Preloader's reduced-motion path and its animated path can both call it
 * without double-triggering.
 */
export function markRevealStarted(): void {
  if (started) return;
  started = true;
  // Snapshot to tolerate listeners unsubscribing during iteration.
  for (const cb of Array.from(listeners)) {
    try {
      cb();
    } catch {
      // A single faulty consumer must not block the others.
    }
  }
}

/**
 * Subscribe to the reveal. If it has already fired, `cb` runs on the next
 * microtask (never synchronously, so callers can finish their own setup —
 * e.g. registering GSAP targets — before it runs). Returns an unsubscribe fn.
 */
export function onReveal(cb: () => void): () => void {
  if (started) {
    queueMicrotask(cb);
    return () => {};
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
