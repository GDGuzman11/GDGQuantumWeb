import { Grain } from './tunnel/Grain';

/**
 * Static dark atmospheric backdrop for the Landing hero (Phase 3R).
 *
 * Renders on the server and on first paint, and is the ONLY backdrop when the
 * particle tunnel is ineligible: no-WebGL, prefers-reduced-motion, below-lg, or
 * before the preloader reveal (LCP guard). Zero JS, zero WebGL — just layered
 * radial gradients (deep void → faint cool nebula glow) plus a static grain, so
 * the Landing stays on-brand and dark in every fallback path.
 *
 * The gradient stops are decorative ARTWORK, not the five semantic design
 * tokens — they intentionally use literal colours here (the surrounding
 * `data-theme="dark"` scope still governs all text/UI chrome via tokens).
 */
export function HeroBackdropFallback() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#06070a]">
      {/* Cool nebula glow, upper-right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 55% at 72% 28%, rgba(60,86,160,0.30) 0%, rgba(20,28,56,0.12) 38%, rgba(6,7,10,0) 70%)',
        }}
      />
      {/* Warmer violet depth, lower-left */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 50% at 22% 82%, rgba(86,60,140,0.22) 0%, rgba(6,7,10,0) 65%)',
        }}
      />
      {/* Vignette to settle the edges into the void */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 45%, rgba(6,7,10,0) 55%, rgba(2,3,5,0.85) 100%)',
        }}
      />
      <Grain opacity={0.05} />
    </div>
  );
}
