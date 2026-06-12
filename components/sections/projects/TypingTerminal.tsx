'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Monospace "live AI compilation" terminal.
 *
 * IDLE (active=false): holds at just the first line (the `[SYSTEM]` line) with a
 * blinking caret — frozen, no progression.
 * ACTIVE (active=true, i.e. the card is hovered): resumes typing the remaining
 * lines character by character, holds the finished block, then loops (keeping
 * the first line) for as long as it stays active. On de-activation it snaps back
 * to the idle first-line state.
 *
 * Reduced-motion (CLAUDE.md §2): no loop, no caret animation — every line is
 * shown in full immediately so the content is still legible and stable.
 *
 * Self-contained timers (no GSAP) keyed off a single recursive timeout, so it's
 * cheap and pauses cleanly on unmount / de-activation.
 */

type TypingTerminalProps = {
  lines: readonly string[];
  /** Hovered → resume typing the rest. Idle holds at the first line. */
  active?: boolean;
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
  active = false,
  speed = 26,
  hold = 1400,
  className = '',
}: TypingTerminalProps) {
  // Completed lines + the line currently being typed.
  const [done, setDone] = useState<string[]>([]);
  const [partial, setPartial] = useState(lines[0] ?? '');
  const [reduced, setReduced] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const clear = () => {
      if (timer.current) window.clearTimeout(timer.current);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
      setDone([...lines]);
      setPartial('');
      return;
    }

    // Idle: hold at the first line with a blinking caret, no progression.
    if (!active) {
      clear();
      setDone([]);
      setPartial(lines[0] ?? '');
      return;
    }

    // Active: keep the first line, type lines 1..n, hold, then loop.
    const first = lines[0] ?? '';
    let li = 1; // line index (line 0 already shown)
    let ci = 0; // char index within current line
    const completed: string[] = [first];
    setDone([first]);
    setPartial('');

    const tick = () => {
      if (li >= lines.length) {
        // Whole block typed → hold, then restart from line 1 (keep line 0).
        timer.current = window.setTimeout(() => {
          completed.length = 1; // keep the first line only
          li = 1;
          ci = 0;
          setDone([first]);
          setPartial('');
          timer.current = window.setTimeout(tick, speed * 2);
        }, hold);
        return;
      }
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
      timer.current = window.setTimeout(tick, speed * 2);
    };

    timer.current = window.setTimeout(tick, speed * 2);
    return clear;
  }, [lines, active, speed, hold]);

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
