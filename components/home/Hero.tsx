'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Intro } from '@/components/home/Intro';
import { OrbHotspot } from '@/components/home/OrbHotspot';
import { PrimaryLink } from '@/components/home/PrimaryLink';
import { BASE_HEADLINE, orbStep, type OrbMood } from '@/lib/orb-lines';
import { about } from '@/lib/profile';
import { setDepth, type DiveSection } from '@/lib/dive';

// Code-split: the form (RHF + Zod + Turnstile + server action graph) loads only
// when the Contact singularity is opened, never on first paint.
const TransmitForm = dynamic(
  () => import('@/components/home/TransmitForm').then((m) => m.TransmitForm),
  { ssr: false },
);

// Code-split: the About interior carries ~45 kB of brand-logo path data, so it
// loads only when you dive into the core — never in First Load.
const AboutInterior = dynamic(
  () => import('@/components/home/AboutInterior').then((m) => m.AboutInterior),
  { ssr: false },
);

/** Pick a random About header, never the same one twice in a row. */
let lastHeaderIdx = -1;
function pickAboutHeader(): string {
  const n = about.headers.length;
  let i = Math.floor(Math.random() * n);
  if (i === lastHeaderIdx) i = (i + 1) % n;
  lastHeaderIdx = i;
  return about.headers[i];
}

/**
 * Enter-the-orb hero controller.
 *
 * The orb lives in the full-screen world canvas; this is the DOM overlay (intro
 * copy + entry points) plus the tween that drives the shared dive DEPTH:
 *   0 = rest · 1 = core (About) · 2 = quantum field (Projects) · 3 = singularity (Contact).
 * One continuous scalar, so ANY leg animates smoothly — landing→section AND
 * section→section (About→Projects→Contact and back). The descent ends at the
 * singularity, where the contact form transmits through to the AI (Helix).
 *
 * Reduced-motion: no flight — navigation jumps instantly.
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

/** Target dive depth per destination — the descent: core → quantum → singularity. */
function depthOf(s: Exclude<DiveSection, null>): number {
  if (s === 'projects') return 2;
  if (s === 'contact') return 3;
  return 1; // about → the core
}

export function Hero() {
  const router = useRouter();
  const [section, setSection] = useState<DiveSection>(null);
  // Re-rolled each time the core is opened, so About greets you differently.
  const [aboutHeader, setAboutHeader] = useState<string>(about.headers[0]);

  // --- Orb-tap easter egg (landing only) ---------------------------------
  // Headline + mood are driven into Intro; `pulse` triggers the typewriter and
  // the orb flash/ray on each tap. The counter + last-random live in refs (no
  // re-render needed) and reset after the finale and on returning to landing.
  const [headline, setHeadline] = useState(BASE_HEADLINE);
  const [mood, setMood] = useState<OrbMood>('base');
  const [clap, setClap] = useState(false);
  const [flashColor, setFlashColor] = useState('#ffffff');
  const [pulse, setPulse] = useState(0);
  const tapRef = useRef(0);
  const lastRandomRef = useRef<string | null>(null);
  const lastTapAtRef = useRef(0); // debounce: one tap = one advance (no touch+click double-fire)
  const finaleRef = useRef(false);

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

  /** Go to any section from anywhere (landing or another interior). */
  const navigate = useCallback(
    (s: Exclude<DiveSection, null>) => {
      if (s === 'about') setAboutHeader(pickAboutHeader()); // re-roll the greeting
      setSection(s);
      const to = depthOf(s);
      if (reducedMotion()) {
        depthRef.current = to;
        setDepth(to);
        requestAnimationFrame(() => applyOpacities(to));
        return;
      }
      const dist = Math.abs(to - depthRef.current);
      animateDepth(to, 700 + dist * 700);
    },
    [animateDepth, applyOpacities],
  );

  /** Reset the orb-tap sequence back to the resting headline. */
  const resetOrb = useCallback(() => {
    tapRef.current = 0;
    lastRandomRef.current = null;
    finaleRef.current = false;
    setHeadline(BASE_HEADLINE);
    setMood('base');
    setClap(false);
  }, []);

  /** Advance the orb-tap easter egg one step (landing only). */
  const onOrbTap = useCallback(() => {
    if (section || finaleRef.current) return; // inert off-landing / during the finale
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastTapAtRef.current < 280) return; // single-fire debounce
    lastTapAtRef.current = now;

    const next = tapRef.current + 1;
    const step = orbStep(next, lastRandomRef.current);

    setHeadline(step.headline);
    setMood(step.mood);
    setClap(step.clap);
    setFlashColor(step.color);
    setPulse((p) => p + 1);

    if (step.finale) {
      // Arm the finale; the actual dive waits until the red line has FULLY typed
      // out (Intro fires onTyped when it lands) so we never redirect mid-sentence.
      finaleRef.current = true;
      return;
    }

    if (step.randomLine) lastRandomRef.current = step.headline;
    tapRef.current = next;
  }, [section]);

  /**
   * Intro signals here once a line has fully landed. Only the armed finale acts:
   * let the red line breathe for a beat, then dive to Contact and reset.
   */
  const onIntroTyped = useCallback(() => {
    if (!finaleRef.current) return;
    const dwell = reducedMotion() ? 500 : 900;
    window.setTimeout(() => {
      navigate('contact');
      resetOrb();
    }, dwell);
  }, [navigate, resetOrb]);

  const back = useCallback(() => {
    const finish = () => {
      setDepth(0);
      setSection(null);
      resetOrb(); // returning to the landing resets the orb-tap sequence
    };
    if (reducedMotion()) {
      depthRef.current = 0;
      applyOpacities(0);
      finish();
      return;
    }
    animateDepth(0, 600 + depthRef.current * 600, finish); // longer climb from deeper
  }, [animateDepth, applyOpacities, resetOrb]);

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
        {!section ? (
          <OrbHotspot onTap={onOrbTap} flashKey={pulse} flashColor={flashColor} />
        ) : null}
        <Intro headline={headline} mood={mood} clap={clap} pulse={pulse} onTyped={onIntroTyped} />
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <PrimaryLink label="About" onClick={() => navigate('about')} />
          <PrimaryLink label="Projects" onClick={() => navigate('projects')} />
          <PrimaryLink label="Contact" onClick={() => navigate('contact')} />
          {/* The arcade — styled in the retro pixel face, 90s-arcade vibe. */}
          <button
            type="button"
            onClick={() => router.push('/arcade')}
            className="font-pixel text-[9px] uppercase tracking-[0.12em] text-[#7fdfff] transition-all duration-300 [text-shadow:0_0_14px_rgba(126,223,255,0.7)] hover:text-white hover:[text-shadow:0_0_22px_rgba(126,223,255,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7fdfff] sm:text-[10px]"
          >
            ▸ STARSHELL
          </button>
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
              className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[rgba(3,4,9,0.55)] px-6 py-16 backdrop-blur-md sm:items-center sm:py-20"
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

              {/* Keyed so the content re-materialises when the section changes. */}
              <div key={section} style={{ animation: 'gdg-holo-in 0.7s ease-out both' }}>
                <Interior section={section} header={aboutHeader} onNavigate={navigate} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Interior worlds for each dive destination. */
function Interior({
  section,
  header,
  onNavigate,
}: {
  section: Exclude<DiveSection, null>;
  header: string;
  onNavigate: (s: Exclude<DiveSection, null>) => void;
}) {
  if (section === 'about') {
    return <AboutInterior header={header} onNavigate={onNavigate} />;
  }

  if (section === 'contact') {
    return (
      <div className="w-full max-w-lg">
        {/* Dark glass console — contrasts the blazing singularity behind it while
            staying in the cosmic theme. */}
        <div className="rounded-2xl border border-white/12 bg-[rgba(6,8,14,0.62)] p-6 shadow-[0_20px_70px_-25px_rgba(0,0,0,0.95)] sm:p-8">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">
            &infin; · Contact · Singularity
          </p>
          {/* The real pipeline: persists + emails (security gate intact). */}
          <TransmitForm />
        </div>

        <div className="mt-8 text-center">
          <PrimaryLink
            label="Back to Projects"
            direction="left"
            onClick={() => onNavigate('projects')}
          />
        </div>
      </div>
    );
  }

  // Projects
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
      <div className="mt-10 flex items-center justify-center gap-10">
        <PrimaryLink label="Back to About" direction="left" onClick={() => onNavigate('about')} />
        <PrimaryLink label="Continue to Contact" onClick={() => onNavigate('contact')} />
      </div>
    </div>
  );
}
