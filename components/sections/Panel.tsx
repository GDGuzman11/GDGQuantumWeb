import type { ReactNode } from 'react';

type PanelProps = {
  /** Deep-link target — becomes the section id and the hash without "#". */
  id: string;
  /** Two-digit panel index, e.g. "01", used as a decorative marker. */
  index: string;
  /** Accessible name for the landmark region. */
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  /**
   * Opt into a token scope (Phase 3R). `"dark"` re-values the five semantic
   * tokens for the cinematic Landing; content inside keeps using semantic
   * classes and inherits the dark values. Omit for the locked light palette.
   */
  theme?: 'dark';
  /**
   * Transparent background instead of the solid `bg-bg` fill. The Landing panel
   * is transparent so the fixed dark backdrop + particle tunnel show through it;
   * the other panels stay solid so they fully occlude the backdrop when active
   * and read as a clean wipe during the directional transitions.
   */
  transparent?: boolean;
};

/**
 * Full-viewport panel shell. Uses 100svh (small-viewport height) so mobile
 * browser chrome can't clip the layout. The GSAP Observer deck (Phase 2)
 * translates a track of these in deck mode; in native mode (reduced-motion /
 * mobile) they flow and scroll normally — the height/structure is identical
 * in both modes, so this shell stays snap-engine-agnostic.
 *
 * tabIndex=-1 makes the panel a programmatic focus target: after a snap the
 * deck moves focus here (unless focus is in a form field) so keyboard focus is
 * never stranded on an off-screen panel. It's not in the tab order, so this
 * doesn't add an extra tab stop.
 */
export function Panel({
  id,
  index,
  ariaLabel,
  children,
  className = '',
  theme,
  transparent = false,
}: PanelProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      tabIndex={-1}
      data-theme={theme}
      className={[
        // min-h (not fixed h) so tall content GROWS the panel and the page
        // scrolls instead of clipping in native-scroll mode (mobile /
        // reduced-motion). In deck mode the panel sits in an absolute
        // h-[100svh] wrapper, so it still fills exactly one viewport there.
        'panel-surface relative flex min-h-[100svh] w-full flex-col scroll-mt-0',
        transparent ? 'bg-transparent' : 'bg-bg',
        // pad-x = the px-6/sm:px-10/lg:px-16 rhythm, but max()-clamped against
        // the device safe-area so a landscape notch never clips content.
        'pad-x',
        'focus:outline-none',
        className,
      ].join(' ')}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-6 top-24 font-sans text-xs tracking-[0.3em] text-muted sm:left-10 lg:left-16"
      >
        {index}
      </span>
      {/* Content TOP-aligns on phones (so a tall panel flows + scrolls from the
          top instead of being centered and clipped) and CENTERS from md up —
          md (768px) is the deck's MOBILE_BP, so every deck-mode panel stays
          vertically centered exactly as before; only native-scroll phones
          top-align. Padding scales down on small screens. */}
      <div className="flex min-h-[100svh] w-full flex-col justify-start py-20 sm:py-28 md:justify-center">
        {children}
      </div>
    </section>
  );
}
