'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Intro } from '@/components/home/Intro';
import { setDepth, type DiveSection } from '@/lib/dive';

/**
 * Enter-the-orb hero controller.
 *
 * The orb lives in the full-screen world canvas; this is the DOM overlay (intro
 * copy + entry points) plus the tween that drives the shared dive DEPTH:
 *   0 = rest · 1 = the core (About) · 2 = the quantum field (Projects).
 * Because it's one continuous scalar, About → Projects animates smoothly as a
 * deeper plunge — that's the "Continue to Projects" action inside About.
 *
 * Reduced-motion: no flight — entering/continuing/leaving jumps instantly.
 */

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

export function Hero() {
  const [section, setSection] = useState<DiveSection>(null);

  const fadeRef = useRef<HTMLDivElement>(null); // landing copy (fades on dive)
  const overlayRef = useRef<HTMLDivElement>(null); // interior (fades in on dive)
  const depthRef = useRef(0);
  const rafRef = useRef(0);

  const applyOpacities = useCallback((d: number) => {
    const o = Math.min(1, Math.max(0, d)); // first unit of descent fades the UI
    if (fadeRef.current) fadeRef.current.style.opacity = String(1 - o);
    if (overlayRef.current) overlayRef.current.style.opacity = String(o);
  }, []);

  const animateDepth = useCallback(
    (to: number, dur: number, onDone?: () => void) => {
      cancelAnimationFrame(rafRef.current);
      const from = depthRef.current;
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / dur);
        const d = from + (to - from) * easeInOutCubic(k);
        depthRef.current = d;
        setDepth(d);
        applyOpacities(d);
        if (k < 1) rafRef.current = requestAnimationFrame(tick);
        else onDone?.();
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [applyOpacities],
  );

  const enter = useCallback(
    (s: Exclude<DiveSection, null>) => {
      setSection(s);
      // about + contact settle at the core (depth 1); projects plunges to the
      // quantum field (depth 2). Contact's bespoke behaviour is still TBD —
      // this is a placeholder dive so the button works.
      const to = s === 'projects' ? 2 : 1;
      if (reducedMotion()) {
        depthRef.current = to;
        setDepth(to);
        requestAnimationFrame(() => applyOpacities(to));
        return;
      }
      animateDepth(to, s === 'projects' ? 2400 : 1600);
    },
    [animateDepth, applyOpacities],
  );

  const continueToProjects = useCallback(() => {
    setSection('projects');
    if (reducedMotion()) {
      depthRef.current = 2;
      setDepth(2);
      return;
    }
    animateDepth(2, 1300);
  }, [animateDepth]);

  const back = useCallback(() => {
    const finish = () => {
      setDepth(0);
      setSection(null);
    };
    if (reducedMotion()) {
      depthRef.current = 0;
      applyOpacities(0);
      finish();
      return;
    }
    animateDepth(0, depthRef.current > 1.5 ? 1900 : 1200, finish);
  }, [animateDepth, applyOpacities]);

  useEffect(() => {
    if (!section) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [section, back]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <>
      <div ref={fadeRef}>
        <Intro />
        <div className="mt-10 flex items-center justify-center gap-8">
          <PrimaryLink label="About" onClick={() => enter('about')} />
          <PrimaryLink label="Projects" onClick={() => enter('projects')} />
          <PrimaryLink label="Contact" onClick={() => enter('contact')} />
        </div>
      </div>

      {section && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={overlayRef}
              role="dialog"
              aria-modal="true"
              aria-label={
                section === 'about'
                  ? 'About'
                  : section === 'projects'
                    ? 'Projects'
                    : 'Contact'
              }
              className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[rgba(3,4,9,0.55)] px-6 py-20 backdrop-blur-md"
              style={{ opacity: 0 }}
            >
              <button
                type="button"
                onClick={back}
                className="group fixed left-6 top-6 z-10 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.22em] text-white/70 transition-colors duration-300 hover:text-white focus:outline-none focus-visible:text-white sm:left-8 sm:top-8"
              >
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:-translate-x-1"
                >
                  &larr;
                </span>
                Back to the orb
              </button>

              {/* Keyed so the content re-materialises when About → Projects. */}
              <div key={section} style={{ animation: 'gdg-holo-in 0.7s ease-out both' }}>
                <Interior section={section} onContinue={continueToProjects} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function PrimaryLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative font-sans text-xs uppercase tracking-[0.28em] text-white/75 transition-colors duration-300 hover:text-white focus:outline-none focus-visible:text-white"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1"
      >
        &rarr;
      </span>
      <span
        aria-hidden
        className="absolute -bottom-1 left-0 h-px w-0 bg-white/60 transition-all duration-300 group-hover:w-[calc(100%-1.25rem)]"
      />
    </button>
  );
}

/** Placeholder interior worlds (content lands in later stages). */
function Interior({
  section,
  onContinue,
}: {
  section: Exclude<DiveSection, null>;
  onContinue: () => void;
}) {
  if (section === 'about') {
    return (
      <div className="max-w-2xl text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.85)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">
          01 · About
        </p>
        <h2 className="mt-5 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
          The person behind the build.
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-white/75 sm:text-lg">
          You&rsquo;ve flown into the core. This is where the story lives &mdash;
          who I am, how I think, and why I chase the hard problems. Real content
          materialises here next.
        </p>
        <div className="mt-10">
          <PrimaryLink label="Go deeper · Projects" onClick={onContinue} />
        </div>
      </div>
    );
  }

  if (section === 'contact') {
    return (
      <div className="max-w-2xl text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.85)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">
          03 · Contact
        </p>
        <h2 className="mt-5 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
          Let&rsquo;s build something together.
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-white/75 sm:text-lg">
          Got a hard problem in mind? The way to reach me &mdash; the form and
          the links &mdash; materialises here next.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.85)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">
        02 · Projects
      </p>
      <h2 className="mt-5 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
        Down at the quantum level.
      </h2>
      <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-white/75 sm:text-lg">
        You&rsquo;ve fallen past the core into the quantum field &mdash; the
        smallest scale, where everything is built from first principles. The
        case studies are materialising here.
      </p>
    </div>
  );
}
