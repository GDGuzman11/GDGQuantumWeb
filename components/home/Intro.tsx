'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BASE_HEADLINE, type OrbMood } from '@/lib/orb-lines';

/**
 * Landing intro — the opening statement (doubles as "About"). Carries the
 * document's single <h1>. The headline + statement materialise in on load and
 * the headline keeps a subtle "living" glow/flicker (see the gdg-holo-* keyframes
 * in globals.css); reduced-motion users just get the final, legible text.
 *
 * Prop-driven so the Hero orb-tap easter egg can drive it: each tap hands a new
 * `headline` + `mood` and bumps `pulse`, which typewriter-erases the current
 * line and types the new one with a blinking caret. `mood === 'base'` (load and
 * after the finale/back reset) snaps instantly — no typewriter. Reduced-motion
 * also snaps instantly (no caret motion, no erase/type).
 *
 * LCP: the base headline is the initial state, so it's part of the server-
 * rendered HTML — the typewriter only ever runs client-side, after a tap.
 */

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Per-mood headline styling (glow + colour). Base keeps the living hologram. */
const BASE_STYLE: CSSProperties = {
  textShadow: '0 2px 40px rgba(0,0,0,0.65), 0 0 22px rgba(126,223,255,0.22)',
  animation:
    'gdg-holo-in 1.25s ease-out 0.45s both, gdg-holo-live 6s ease-in-out 2.2s infinite',
};

const MOOD_STYLE: Record<Exclude<OrbMood, 'base'>, CSSProperties> = {
  white: {
    color: '#f7fbff',
    textShadow: '0 2px 30px rgba(0,0,0,0.6), 0 0 32px rgba(255,255,255,0.85)',
  },
  blue: {
    color: '#bcd4ff',
    textShadow: '0 2px 30px rgba(0,0,0,0.6), 0 0 34px rgba(110,168,255,0.9)',
  },
  faint: {
    color: 'rgba(234,236,242,0.55)',
    textShadow: '0 2px 20px rgba(0,0,0,0.55)',
  },
  red: {
    color: '#ff8a8a',
    textShadow: '0 2px 30px rgba(0,0,0,0.6), 0 0 40px rgba(255,77,77,0.95)',
  },
};

/** Render the typed text, wrapping any 👏 in the clap animation. */
function renderHeadline(text: string, clap: boolean) {
  if (!clap || !text.includes('👏')) return text;
  const parts = text.split('👏');
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 ? (
        <span
          aria-hidden
          className="inline-block"
          style={{ animation: 'gdg-clap 0.5s ease-in-out infinite' }}
        >
          👏
        </span>
      ) : null}
    </span>
  ));
}

export function Intro({
  headline = BASE_HEADLINE,
  mood = 'base',
  clap = false,
  pulse = 0,
  onTyped,
}: {
  headline?: string;
  mood?: OrbMood;
  clap?: boolean;
  pulse?: number;
  /** Fires once the new line has fully landed (typed out, or instant-swapped). */
  onTyped?: () => void;
}) {
  const [display, setDisplay] = useState(headline);
  const displayRef = useRef(headline);
  const firstRun = useRef(true);

  // Keep a ref of what's currently shown, so the next tap erases from there.
  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    // The initial mount renders the base headline (LCP) — never animate it.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    // Base reset (after finale / back) and reduced-motion both snap instantly.
    if (mood === 'base' || reducedMotion()) {
      setDisplay(headline);
      onTyped?.(); // the line has "landed" — let the finale redirect proceed
      return;
    }

    // Typewriter: erase the current line code-point by code-point, then type the
    // new one. Array.from keeps emoji (surrogate pairs) intact.
    const target = Array.from(headline);
    let chars = Array.from(displayRef.current);
    let timer: ReturnType<typeof setTimeout>;

    const erase = () => {
      if (chars.length > 0) {
        chars = chars.slice(0, -1);
        setDisplay(chars.join(''));
        timer = setTimeout(erase, 16);
      } else {
        type();
      }
    };
    const type = () => {
      if (chars.length < target.length) {
        chars = target.slice(0, chars.length + 1);
        setDisplay(chars.join(''));
        timer = setTimeout(type, 30);
      } else {
        onTyped?.(); // fully typed — the finale waits for this before diving
      }
    };

    erase();
    return () => clearTimeout(timer);
    // pulse is the explicit trigger (handles repeat lines); headline/mood gate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse, headline, mood]);

  const headingStyle =
    mood === 'base' ? BASE_STYLE : MOOD_STYLE[mood];

  return (
    <div className="relative max-w-2xl">
      <div>
        <h1
          className="font-serif text-[clamp(2rem,6vw,4.25rem)] leading-[1.02] tracking-tight text-ink"
          style={{ transition: 'color 0.3s ease, text-shadow 0.3s ease', ...headingStyle }}
        >
          {renderHeadline(display, clap)}
          {mood !== 'base' ? (
            <span
              aria-hidden
              className="ml-1 inline-block h-[0.82em] w-[2px] translate-y-[0.06em] bg-current align-baseline"
              style={{ animation: 'gdg-blink 1s steps(1) infinite' }}
            />
          ) : null}
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-muted [text-shadow:0_1px_24px_rgba(0,0,0,0.7)] sm:text-lg"
          style={{ animation: 'gdg-holo-in 1.25s ease-out 0.95s both' }}
        >
          I&rsquo;m a developer chasing the hard problems &mdash; I want to know
          how everything works, then use it to build things that feel
          impossible. Got one of those? Let&rsquo;s talk.
        </p>
      </div>
    </div>
  );
}
