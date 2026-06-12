'use client';

import { useEffect, useRef } from 'react';

/**
 * Animated neural background for the expanded case study. A graph of nodes
 * connected by faint lines ("the lines"); ~20 white "neurons" travel along
 * those lines at random. When two neurons' paths cross (they pass close to one
 * another) both flash a colour, then fade back to white — so intersections
 * light up.
 *
 * Pure canvas + requestAnimationFrame (no deps), pointer-events-none, sized to
 * the viewport. Reduced-motion: a single static frame, no animation loop.
 */

const NODE_COUNT = 16;
const NEURON_COUNT = 20;
const CONNECT_PER_NODE = 3; // each node links to its nearest few → the edges
const CROSS_DIST = 26; // px proximity that counts as an intersection
const PALETTE = ['#7fdfff', '#6ea8ff', '#b07bff', '#5ce0c0'];

type Node = { x: number; y: number };
type Neuron = {
  from: number;
  to: number;
  t: number;
  speed: number;
  /** 0 = white, otherwise a palette colour; fades over time. */
  colour: string | null;
  flash: number; // 0..1 decay
};

export function NeuralField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let nodes: Node[] = [];
    let edges: number[][] = []; // adjacency list
    let neurons: Neuron[] = [];

    const buildGraph = () => {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
      }));
      // Connect each node to its nearest CONNECT_PER_NODE neighbours.
      edges = nodes.map((n, i) => {
        const order = nodes
          .map((m, j) => ({ j, d: (m.x - n.x) ** 2 + (m.y - n.y) ** 2 }))
          .filter((o) => o.j !== i)
          .sort((a, b) => a.d - b.d)
          .slice(0, CONNECT_PER_NODE)
          .map((o) => o.j);
        return order;
      });
      // Symmetrise so a neuron can always travel back.
      edges.forEach((adj, i) => {
        adj.forEach((j) => {
          if (!edges[j].includes(i)) edges[j].push(i);
        });
      });

      neurons = Array.from({ length: NEURON_COUNT }, () => {
        const from = Math.floor(Math.random() * NODE_COUNT);
        const adj = edges[from];
        const to = adj[Math.floor(Math.random() * adj.length)] ?? from;
        return {
          from,
          to,
          t: Math.random(),
          speed: 0.0016 + Math.random() * 0.0026,
          colour: null,
          flash: 0,
        };
      });
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGraph();
    };

    const pos = (n: Neuron) => {
      const a = nodes[n.from];
      const b = nodes[n.to];
      return { x: a.x + (b.x - a.x) * n.t, y: a.y + (b.y - a.y) * n.t };
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Edges — faint static lines.
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(126,223,255,0.10)';
      ctx.beginPath();
      edges.forEach((adj, i) => {
        adj.forEach((j) => {
          if (j > i) {
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
          }
        });
      });
      ctx.stroke();

      // Nodes — small dim dots.
      ctx.fillStyle = 'rgba(180,200,230,0.35)';
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Neurons — glowing dots that flash colour on intersection.
      const points = neurons.map(pos);
      neurons.forEach((n, idx) => {
        const p = points[idx];
        const col = n.flash > 0 && n.colour ? n.colour : '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = col;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    };

    const step = () => {
      // Advance + re-target at node arrivals.
      neurons.forEach((n) => {
        n.t += n.speed;
        if (n.t >= 1) {
          const adj = edges[n.to];
          const next = adj[Math.floor(Math.random() * adj.length)] ?? n.from;
          n.from = n.to;
          n.to = next;
          n.t = 0;
        }
        if (n.flash > 0) n.flash = Math.max(0, n.flash - 0.02);
      });

      // Intersections: neurons passing close together flash a shared colour.
      const points = neurons.map(pos);
      for (let i = 0; i < neurons.length; i++) {
        for (let j = i + 1; j < neurons.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          if (dx * dx + dy * dy < CROSS_DIST * CROSS_DIST) {
            const c = PALETTE[(i + j) % PALETTE.length];
            neurons[i].colour = c;
            neurons[j].colour = c;
            neurons[i].flash = 1;
            neurons[j].flash = 1;
          }
        }
      }

      draw();
      raf = window.requestAnimationFrame(step);
    };

    let raf = 0;
    resize();
    window.addEventListener('resize', resize);

    if (reduced) {
      draw(); // single static frame
    } else {
      raf = window.requestAnimationFrame(step);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 opacity-70"
    />
  );
}
