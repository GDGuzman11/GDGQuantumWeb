/**
 * Shared "dive" signal for the enter-the-orb navigation (Stage 1).
 *
 * A plain mutable singleton (NOT React state) read every frame by the Helix
 * scene's CameraRig, and written by the Hero controller's tween. This mirrors
 * the latched-scalar pattern used elsewhere for WebGL signals: the DOM drives a
 * value, the render loop reads it, and no React re-render happens per frame.
 *
 * `progress` 0 = resting logo, 1 = fully inside. `section` decides the camera's
 * destination: 'about' dives INWARD to the core, 'projects' pulls OUTWARD along
 * the orbits.
 */
export type DiveSection = 'about' | 'projects' | null;

let progress = 0;
let section: DiveSection = null;

export function setDive(p: number, s: DiveSection): void {
  progress = p;
  section = s;
}

export function getDive(): { progress: number; section: DiveSection } {
  return { progress, section };
}
