'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { CtaLink } from '@/components/ui/CtaLink';
import { siteConfig } from '@/lib/site-config';
import { isRevealStarted, onReveal } from '@/lib/reveal';

gsap.registerPlugin(SplitText);

/**
 * Landing (#home) hero content + entrance reveal.
 *
 * Holds the document's single <h1> — the LCP element. We deliberately DO NOT
 * pre-hide anything before paint: the opaque Preloader overlay already occludes
 * the hero during load, so the headline paints early (fast LCP) and the GSAP
 * "from" state is applied only at the REVEAL moment — choreographed with the
 * preloader's fade-out so the lines rise in as the overlay clears, with no
 * flash. The reveal is driven by `onReveal` (fired by the Preloader on count-
 * complete), not raw mount.
 *
 * Reveal timeline (motion path): eyebrow fade-up → headline line-by-line
 * (SplitText) → sub copy → CTA underline draw → scroll cue. All eased, within
 * the 0.6–1.2s/element motion language.
 *
 * Reduced-motion (or a reveal that already fired before this mounted): no
 * animation at all — the natural, already-visible markup is the final state.
 */
export function HeroContent() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Animate only if motion is allowed AND we mounted before the reveal fired
    // (the normal case). If reduced, or the reveal already happened, the
    // default markup is already the correct, fully-visible final state.
    if (reduced || isRevealStarted()) return;

    let played = false;
    let ctx: gsap.Context | null = null;

    const play = () => {
      if (played) return;
      played = true;

      ctx = gsap.context(() => {
        const q = gsap.utils.selector(root);
        const title = q('[data-hero-title]')[0] as HTMLElement | undefined;

        // Split the headline into lines (fonts are guaranteed ready — the
        // Preloader waits on document.fonts.ready before firing the reveal —
        // so line breaks are measured correctly).
        const split = title
          ? new SplitText(title, { type: 'lines', linesClass: 'split-line' })
          : null;

        const tl = gsap.timeline({
          defaults: { ease: 'power3.out' },
          onComplete: () => split?.revert(), // restore clean <h1> markup for a11y
        });

        // "From" states are set here, at reveal time, under the fading overlay.
        gsap.set(q('[data-hero-eyebrow], [data-hero-sub], [data-hero-cta]'), {
          autoAlpha: 0,
          y: 24,
        });
        gsap.set(q('[data-hero-cue]'), { autoAlpha: 0, y: 12 });
        gsap.set(q('[data-cta-underline]'), {
          scaleX: 0,
          transformOrigin: 'left center',
        });
        if (split) gsap.set(split.lines, { yPercent: 120, autoAlpha: 0 });

        tl.to('[data-hero-eyebrow]', { autoAlpha: 1, y: 0, duration: 0.7 });

        if (split) {
          tl.to(
            split.lines,
            {
              yPercent: 0,
              autoAlpha: 1,
              duration: 0.9,
              stagger: 0.12,
              ease: 'power3.out',
            },
            0.2,
          );
        }

        tl.to('[data-hero-sub]', { autoAlpha: 1, y: 0, duration: 0.8 }, 0.55)
          .to('[data-hero-cta]', { autoAlpha: 1, y: 0, duration: 0.7 }, 0.7)
          .to(
            '[data-cta-underline]',
            { scaleX: 1, duration: 0.7, ease: 'power2.out' },
            0.8,
          )
          .to('[data-hero-cue]', { autoAlpha: 1, y: 0, duration: 0.6 }, 0.95);
      }, root);
    };

    const unsubscribe = onReveal(play);
    // Failsafe: never leave the hero un-revealed if the signal is somehow missed.
    const failsafe = window.setTimeout(play, 5000);

    return () => {
      unsubscribe();
      window.clearTimeout(failsafe);
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="w-full">
      {/* Faint scrim anchored behind the copy so the headline stays legible
          over the brightest tunnel particles, without darkening the whole panel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 inset-y-0 max-w-3xl bg-[radial-gradient(70%_60%_at_25%_50%,rgba(6,7,10,0.55)_0%,rgba(6,7,10,0)_72%)] sm:-inset-x-10 lg:-inset-x-16"
      />

      <div className="relative max-w-2xl">
        <p
          data-hero-eyebrow
          className="font-sans text-xs uppercase tracking-[0.28em] text-muted"
        >
          {siteConfig.brand}
        </p>

        <h1
          data-hero-title
          className="mt-6 font-serif text-[clamp(2.75rem,8vw,6rem)] leading-[0.98] tracking-tight text-ink [text-shadow:0_2px_40px_rgba(6,7,10,0.5)]"
        >
          The things we create eventually create us.
        </h1>

        <p
          data-hero-sub
          className="mt-7 max-w-md font-sans text-lg leading-relaxed text-muted [text-shadow:0_1px_24px_rgba(6,7,10,0.55)]"
        >
          Every system reflects the values behind it. We&rsquo;re building with
          people in mind.
        </p>

        <div data-hero-cta className="mt-10">
          <CtaLink href="#contact">Start a project</CtaLink>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        data-hero-cue
        className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center"
      >
        <span className="flex flex-col items-center gap-2 font-sans text-[0.65rem] uppercase tracking-[0.3em] text-muted">
          Scroll
          <span aria-hidden className="h-8 w-px bg-hairline" />
        </span>
      </div>
    </div>
  );
}
