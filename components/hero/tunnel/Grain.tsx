/**
 * Soft-grain overlay (Phase 3R atmosphere).
 *
 * A cheap, GPU-friendly film-grain layer: a tiled SVG `feTurbulence` noise
 * (inline data URI — no network, no postprocessing) blended over the dark
 * Landing. When `animate` is true it drifts via the `gdg-grain-shift` keyframes
 * in globals.css; the global prefers-reduced-motion guard forces that animation
 * to ~0 duration, so reduced-motion users get a static grain. The element is
 * oversized (-inset-1/2, 200%×200%) so the transform drift never exposes an
 * untextured edge.
 *
 * Purely decorative (aria-hidden, pointer-events-none) and NOT a design token —
 * the noise + blend are artwork, not part of the five semantic colours.
 */

const NOISE_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

type GrainProps = {
  /** Drift the grain (Landing-active centerpiece). Static otherwise. */
  animate?: boolean;
  /** 0..1 overlay strength. Subtle by default. */
  opacity?: number;
};

export function Grain({ animate = false, opacity = 0.06 }: GrainProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-1/2 h-[200%] w-[200%] mix-blend-soft-light"
      style={{
        backgroundImage: NOISE_URL,
        backgroundRepeat: 'repeat',
        opacity,
        animation: animate ? 'gdg-grain-shift 8s steps(10) infinite' : undefined,
        willChange: animate ? 'transform' : undefined,
      }}
    />
  );
}
