'use client';

/**
 * Invisible tap target over the Helix orb (the orb itself renders in the WebGL
 * world canvas). Tapping it is the easter-egg trigger — Hero owns the state
 * machine; this component is pure presentation: a generous (≥44px) hit area plus
 * the mood-coloured orb flash + a ray that shoots down toward the headline.
 *
 * The flash + ray re-fire on every tap by keying their elements off `flashKey`
 * (a remount restarts the CSS keyframes). Colour is passed through the
 * `--flash-color` custom property. Under prefers-reduced-motion the global guard
 * in globals.css collapses these animations to ~0s, so no ray/flash is seen —
 * exactly the required reduced-motion fallback (the text still swaps in Intro).
 *
 * Positioned where the orb reads on screen (high-centre, see OrbWorldCanvas
 * ORB_Y); pointer-events stay on the button only, so window-level pointer
 * projection for the orb's gaze still receives moves.
 */
export function OrbHotspot({
  onTap,
  flashKey,
  flashColor,
}: {
  onTap: () => void;
  flashKey: number;
  flashColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Poke the orb"
      className="group fixed left-1/2 top-[19vh] z-[60] h-28 w-28 -translate-x-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-32 sm:w-32"
      style={{ ['--flash-color' as string]: flashColor }}
    >
      <span className="sr-only">Poke the orb</span>

      {flashKey > 0 ? (
        <>
          {/* Mood-coloured radial flare on the orb. */}
          <span
            key={`flash-${flashKey}`}
            aria-hidden
            className="pointer-events-none absolute inset-[-45%] rounded-full"
            style={{
              background:
                'radial-gradient(circle, var(--flash-color) 0%, rgba(0,0,0,0) 65%)',
              animation: 'gdg-orb-flash 0.9s ease-out forwards',
            }}
          />
          {/* Ray fired from the orb down toward the headline. */}
          <span
            key={`ray-${flashKey}`}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[46vh] w-[3px] origin-top"
            style={{
              background:
                'linear-gradient(to bottom, var(--flash-color), rgba(0,0,0,0) 92%)',
              animation: 'gdg-ray 0.7s ease-out forwards',
            }}
          />
        </>
      ) : null}
    </button>
  );
}
