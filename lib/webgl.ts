/**
 * Tiny, generic WebGL capability probe (recreated for Phase 3R).
 *
 * Used by the tunnel host (TunnelStage) to decide — BEFORE dynamically importing
 * the heavy three.js/R3F chunk — whether a WebGL context can even be created.
 * On a machine with WebGL disabled/blocklisted, or in SSR, we skip the canvas
 * entirely and fall back to the static dark backdrop. Deliberately imports
 * nothing from three so it stays in the light chunk and never pulls WebGL in.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}
