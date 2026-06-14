'use client';

import { useEffect, useRef, useState } from 'react';
import { isWhiteWorld, onWorld } from '@/lib/world';

/**
 * Face screen (white world) — clicking anywhere EXCEPT the core makes a small
 * screen flicker on inside the bust's face, with random lines of code typing out
 * like it's initializing something. DOM overlay positioned over the face region
 * (crisp text); purely decorative → aria-hidden, pointer-events-none.
 *
 * Only fires in the white world (where the bust exists); clearing on the way
 * back to the dark world. The core hotspot (id="core-hotspot") is excluded — a
 * click there toggles the world instead.
 */

const SNIPPETS = [
  '> initializing neural core',
  '> bootstrapping consciousness',
  'synapse.link(0x7F3A)',
  '> loading weights ...',
  'tensor.alloc(4096)',
  '> calibrating cortex',
  'train(epoch=42) loss=0.0031',
  'graph.compile() :: ok',
  '0xA1F0: handshake accepted',
  '> mounting memory banks',
  'await think(input)',
  '> SYSTEM ONLINE',
];

function pickSequence(): string {
  const n = 6 + Math.floor(Math.random() * 4);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(SNIPPETS[(Math.random() * SNIPPETS.length) | 0]);
  }
  return out.join('\n');
}

export function FaceScreen() {
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const typer = useRef<number>(0);
  const hideTimer = useRef<number>(0);

  const clearTimers = () => {
    if (typer.current) window.clearInterval(typer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    typer.current = 0;
    hideTimer.current = 0;
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isWhiteWorld()) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest('#core-hotspot')) return; // core toggles the world
      // (Re)start the boot sequence.
      clearTimers();
      const full = pickSequence();
      setText('');
      setActive(true);
      let i = 0;
      typer.current = window.setInterval(() => {
        i += 1;
        setText(full.slice(0, i));
        if (i >= full.length) {
          window.clearInterval(typer.current);
          typer.current = 0;
          hideTimer.current = window.setTimeout(() => setActive(false), 2600);
        }
      }, 26);
    };

    // Hide if we leave the white world.
    const unsub = onWorld((v) => {
      if (v < 0.5 && active) {
        clearTimers();
        setActive(false);
      }
    });

    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('click', onClick);
      unsub();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[45]"
      style={{ left: '50%', top: '40%', transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative w-[clamp(190px,22vw,290px)] overflow-hidden rounded-md border border-cyan-400/40 bg-[#02060a]/85 px-3 py-2 shadow-[0_0_30px_rgba(34,211,238,0.28)]">
        <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[10px] leading-[1.5] text-cyan-300/90">
          {text}
          <span style={{ animation: 'gdg-blink 1s steps(1) infinite' }}>▋</span>
        </pre>
        {/* CRT scanlines */}
        <div
          className="pointer-events-none absolute inset-0 rounded-md"
          style={{
            background:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.18) 3px)',
          }}
        />
      </div>
    </div>
  );
}
