'use client';

import { useEffect, useRef, useState } from 'react';
import { onSynapse, type Synapse } from '@/lib/synapse';

/**
 * DOM overlay for the white-world neuron collisions (W3/W5).
 *
 * Subscribes to `onSynapse` — fired by SnakeNeurons when two circuit-snakes
 * collide — and at each hit renders a brief light flash plus a small line of
 * code that types out of nowhere, then fades. Positioned in screen space at the
 * collision point. Purely decorative → aria-hidden, pointer-events-none.
 */

const SNIPPETS = [
  'synapse.fire(0x3F)',
  'node.connect(a, b)',
  'train(model)',
  'weights += Δ',
  'activate(relu)',
  'graph.link()',
  'tensor.flow()',
  'predict(x)',
  'backprop()',
  'spawn(neuron)',
  'σ(Σ wᵢxᵢ)',
  'mesh.route()',
];

type Flash = Synapse & { text: string };

function FlashItem({ flash }: { flash: Flash }) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(flash.text.slice(0, i));
      if (i >= flash.text.length) window.clearInterval(id);
    }, 42);
    return () => window.clearInterval(id);
  }, [flash.text]);

  return (
    <div
      className="absolute"
      style={{ left: `${flash.x}px`, top: `${flash.y}px` }}
    >
      {/* Light burst at the collision point. */}
      <span
        className="absolute block h-10 w-10 rounded-full"
        style={{
          left: 0,
          top: 0,
          background:
            'radial-gradient(circle, rgba(37,99,235,0.9) 0%, rgba(37,99,235,0) 70%)',
          animation: 'gdg-synapse-flash 0.55s ease-out forwards',
        }}
      />
      {/* Code that types out beside it. */}
      <span
        className="absolute whitespace-nowrap font-mono text-xs tracking-tight text-accent"
        style={{
          left: '12px',
          top: '-6px',
          animation: 'gdg-synapse-text 2.2s ease-out forwards',
        }}
      >
        {typed}
      </span>
    </div>
  );
}

export function CodeFlashes() {
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const cap = useRef(0);

  useEffect(() => {
    return onSynapse((s) => {
      const text = SNIPPETS[(Math.random() * SNIPPETS.length) | 0];
      cap.current += 1;
      setFlashes((f) => [...f.slice(-14), { ...s, text }]); // bound the list
      window.setTimeout(() => {
        setFlashes((f) => f.filter((x) => x.id !== s.id));
      }, 2300);
    });
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55] overflow-hidden"
    >
      {flashes.map((f) => (
        <FlashItem key={f.id} flash={f} />
      ))}
    </div>
  );
}
