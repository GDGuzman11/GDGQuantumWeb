'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Looping monospace "live AI compilation" terminal. Types each line character
 * by character, holds the finished block briefly, then clears and repeats —
 * simulating an agent endlessly recompiling. A blinking caret trails the text.
 *
 * Reduced-motion (CLAUDE.md §2): no loop, no caret animation — every line is
 * shown in full immediately so the content is still legible and stable.
 *
 * Self-contained timers (no GSAP) keyed off a single recursive timeout, so it's
 * cheap and pauses cleanly on unmount.
 */

type TypingTerminalProps = {
  lines: readonly string[];
  /** ms per character while typing. */
  speed?: number;
  /** ms to hold the completed block before clearing. */
  hold?: number;
  className?: string;
};

/** Highlight a leading `[TAG]` token in cyan; rest inherits. Inline spans. */
function lineSpans(text: string) {
  const m = text.match(/^(\[[^\]]*\]?)(.*)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="text-[#7fdfff]">{m[1]}</span>
      {m[2]}
    </>
  );
}

export function TypingTerminal({
  lines,
  speed = 26,
  hold = 1400,
  className = '',
}: TypingTerminalProps) {
  // Completed lines + the line currently being typed.
  const [done, setDone] = useState<string[]>([]);
  const [partial, setPartial] = useState('');
  const [reduced, setReduced] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
      setDone([...lines]);
      setPartial('');
      return;
    }

    let li = 0; // line index
    let ci = 0; // char index within current line
    const completed: string[] = [];

    const tick = () => {
      const line = lines[li] ?? '';
      if (ci <= line.length) {
        setPartial(line.slice(0, ci));
        ci += 1;
        timer.current = window.setTimeout(tick, speed);
        return;
      }
      // Line finished → commit it and advance.
      completed.push(line);
      setDone([...completed]);
      setPartial('');
      li += 1;
      ci = 0;
      if (li < lines.length) {
        timer.current = window.setTimeout(tick, speed * 2);
      } else {
        // Whole block typed → hold, then clear and loop.
        timer.current = window.setTimeout(() => {
          completed.length = 0;
          li = 0;
          ci = 0;
          setDone([]);
          setPartial('');
          timer.current = window.setTimeout(tick, speed * 4);
        }, hold);
      }
    };

    timer.current = window.setTimeout(tick, speed * 4);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [lines, speed, hold]);

  return (
    <pre
      aria-hidden
      className={[
        'whitespace-pre-wrap break-words font-mono text-[10.5px] leading-[1.7] text-muted',
        className,
      ].join(' ')}
    >
      {done.map((l, i) => (
        <div key={i}>{lineSpans(l)}</div>
      ))}
      <div>
        {partial ? lineSpans(partial) : !reduced ? ' ' : null}
        {!reduced && (
          <span
            className="ml-0.5 inline-block h-[0.95em] w-[0.5em] translate-y-[0.15em] bg-[#7fdfff]"
            style={{ animation: 'gdg-blink 1s steps(1) infinite' }}
          />
        )}
      </div>
    </pre>
  );
}
