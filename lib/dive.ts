/**
 * Shared "dive depth" for the enter-the-orb navigation.
 *
 * A plain mutable singleton (NOT React state) read every frame by the world's
 * CameraRig + QuantumField, written by the Hero controller's tween. One scalar
 * along a continuous descent so ANY leg animates smoothly (including About →
 * Projects):
 *
 *   0 = resting logo (camera back, orb among the stars)
 *   1 = the core            → "About" (the story chamber)
 *   2 = the quantum field   → "Projects" (deeper, past the core)
 */
export type DiveSection = 'about' | 'projects' | null;

let depth = 0;

export function setDepth(d: number): void {
  depth = d;
}

export function getDepth(): number {
  return depth;
}
