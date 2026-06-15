'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { CtaLink } from '@/components/ui/CtaLink';
import { siteConfig } from '@/lib/site-config';
import { isRevealStarted, onReveal } from '@/lib/reveal';

gsap.registerPlugin(SplitText);

/** Social links shown beneath the hero sub-line. Monochrome (currentColor). */
const socials = [
  {
    label: 'GitHub',
    href: 'https://github.com/GDGuzman11',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 .5C5.73.5.5 5.73.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56v-2.1c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.05.78 2.12v3.14c0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/gabe-de-guzman/',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0Z" />
      </svg>
    ),
  },
] as const;

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
        gsap.set(
          q('[data-hero-eyebrow], [data-hero-sub], [data-hero-social], [data-hero-cta]'),
          {
            autoAlpha: 0,
            y: 24,
          },
        );
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
          .to('[data-hero-social]', { autoAlpha: 1, y: 0, duration: 0.7 }, 0.65)
          .to('[data-hero-cta]', { autoAlpha: 1, y: 0, duration: 0.7 }, 0.78)
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
        style={{ opacity: 'calc(1 - var(--world, 0))' }}
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
          className="mt-6 font-serif text-[clamp(2.25rem,8vw,6rem)] leading-[0.98] tracking-tight text-ink [text-shadow:0_2px_40px_rgba(6,7,10,0.5)]"
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

        {/* Social — themed monochrome marks that brighten to the accent on hover. */}
        <ul data-hero-social className="mt-7 flex items-center gap-5">
          {socials.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-muted transition-colors duration-300 ease-out hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {s.icon}
              </a>
            </li>
          ))}
        </ul>

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
