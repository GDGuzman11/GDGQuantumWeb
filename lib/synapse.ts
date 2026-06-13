/**
 * Synapse events — the bridge from the WebGL "circuit snakes" to the DOM.
 *
 * When two neuron snakes collide, the canvas projects the hit to screen-space
 * and fires a synapse here; the DOM `CodeFlashes` overlay listens and renders a
 * brief flash + a small line of code that types out at that spot. Mutable
 * singleton + pub/sub like the other lib/* signals — no React re-render on the
 * canvas side.
 */

export type Synapse = { id: number; x: number; y: number };

let nextId = 0;
const subs = new Set<(s: Synapse) => void>();

/** Fire a synapse at screen-space (x, y) in CSS pixels. */
export function fireSynapse(x: number, y: number): void {
  const s: Synapse = { id: nextId++, x, y };
  for (const cb of Array.from(subs)) cb(s);
}

export function onSynapse(cb: (s: Synapse) => void): () => void {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}
