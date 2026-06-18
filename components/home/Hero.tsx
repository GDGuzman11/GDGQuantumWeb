'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelixMark } from '@/components/helix/HelixMark';
import { HeroStage } from '@/components/home/HeroStage';
import { Intro } from '@/components/home/Intro';
import { setDive, type DiveSection } from '@/lib/dive';

/**
 * Enter-the-orb hero controller (Stage 1).
 *
 * The landing shows the Helix + intro with two entry points (About, Projects).
 * Choosing one drives the shared dive signal 0→1: the Helix CameraRig flies the
 * camera INTO the orb (inward for About, outward along the orbits for Projects),
 * the landing copy dissolves, and a themed interior fades in over the orb (which
 * keeps glowing behind it, so the flight reads as unbroken). Back / Esc reverse
 * the dive. The interior CONTENT is placeholder for now — Stage 2/3 fill it.
 *
 * Reduced-motion: no flight — entering/leaving jumps instantly.
 */

const IN_MS = 1400;
const OUT_MS = 1100;

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
  const progressRef = useRef(0);
  const sectionRef = useRef<DiveSection>(null);
  const rafRef = useRef(0);

  const applyOpacities = useCallback((p: number) => {
    if (fadeRef.current) fadeRef.current.style.opacity = String(1 - p);
    if (overlayRef.current) overlayRef.current.style.opacity = String(p);
  }, []);

  const animateTo = useCallback(
    (to: number, dur: number, onDone?: () => void) => {
      cancelAnimationFrame(rafRef.current);
      const from = progressRef.current;
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / dur);
        const p = from + (to - from) * easeInOutCubic(k);
        progressRef.current = p;
        setDive(p, sectionRef.current);
        applyOpacities(p);
        if (k < 1) rafRef.current = requestAnimationFrame(tick);
        else onDone?.();
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [applyOpacities],
  );

  const enter = useCallback(
    (s: DiveSection) => {
      sectionRef.current = s;
      setSection(s);
      if (reducedMotion()) {
        progressRef.current = 1;
        setDive(1, s);
        requestAnimationFrame(() => applyOpacities(1));
        return;
      }
      animateTo(1, IN_MS);
    },
    [animateTo, applyOpacities],
  );

  const back = useCallback(() => {
    const finish = () => {
      sectionRef.current = null;
      setDive(0, null);
      setSection(null);
    };
    if (reducedMotion()) {
      progressRef.current = 0;
      applyOpacities(0);
      finish();
      return;
    }
    animateTo(0, OUT_MS, finish);
  }, [animateTo, applyOpacities]);

  // Esc to exit + lock page scroll while inside.
  useEffect(() => {
    if (!section) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [section, back]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <>
      <HeroStage className="flex flex-col items-center gap-6 sm:gap-8">
        <HelixMark />
        <div ref={fadeRef}>
          <Intro />
          <div className="mt-10 flex items-center justify-center gap-8">
            <EntryButton label="About" onClick={() => enter('about')} />
            <EntryButton label="Projects" onClick={() => enter('projects')} />
          </div>
        </div>
      </HeroStage>

      {section && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={overlayRef}
              role="dialog"
              aria-modal="true"
              aria-label={section === 'about' ? 'About' : 'Projects'}
              className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[rgba(2,3,7,0.82)] px-6 py-20 backdrop-blur-sm"
              style={{ opacity: 0 }}
            >
              <button
                type="button"
                onClick={back}
                className="group fixed left-6 top-6 z-10 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.22em] text-white/70 transition-colors duration-300 hover:text-white focus:outline-none focus-visible:text-white sm:left-8 sm:top-8"
              >
                <span aria-hidden className="transition-transform duration-300 group-hover:-translate-x-1">
                  &larr;
                </span>
                Back to the orb
              </button>

              <Interior section={section} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function EntryButton({ label, onClick }: { label: string; onClick: () => void }) {
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

/** Placeholder interior worlds (content lands in Stage 2/3). */
function Interior({ section }: { section: Exclude<DiveSection, null> }) {
  if (section === 'about') {
    return (
      <div className="max-w-2xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/50">
          01 · About
        </p>
        <h2 className="mt-5 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
          The person behind the build.
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-white/70 sm:text-lg">
          You&rsquo;ve flown into the core. This is where the story lives &mdash;
          who I am, how I think, and why I chase the hard problems. Real content
          materialises here next.
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-3xl text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/50">
        02 · Projects
      </p>
      <h2 className="mt-5 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
        Selected work, in orbit.
      </h2>
      <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-white/70 sm:text-lg">
        Out here along the orbits is where the projects live. The case studies
        are materialising &mdash; each one will sit on its own orbit you can
        travel to.
      </p>
    </div>
  );
}
