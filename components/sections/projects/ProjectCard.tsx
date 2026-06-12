'use client';

import { useCallback, useRef, useState } from 'react';
import type { Project } from '@/lib/projects';
import { TYPING_SCRIPT } from '@/lib/projects';
import { TypingTerminal } from './TypingTerminal';

/**
 * One of the three glassmorphic "terminal" cards in the Projects grid.
 *
 * - High-end 3D tilt: a `pointermove` handler maps the cursor to a small
 *   rotateX/rotateY on the inner panel (perspective lives on the wrapper), with
 *   a subtle lift. Pointer-only + motion-on; disabled for touch / reduced-motion
 *   so it never fights a tap or an opt-out.
 * - A glowing cyan scan-line sweeps down the card; hovering shortens its
 *   duration so it visibly accelerates.
 * - Clicking opens the full-screen case study, handing up the card's current
 *   bounding rect so the overlay can zoom out of exactly this position.
 *
 * Rendered as a real <button> so keyboard users can open it (Enter/Space).
 */

type ProjectCardProps = {
  project: Project;
  index: number;
  onOpen: (id: string, rect: DOMRect) => void;
};

const MAX_TILT = 6; // deg

export function ProjectCard({ project, index, onOpen }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const tiltAllowed = useRef(true);
  if (typeof window !== 'undefined' && tiltAllowed.current) {
    tiltAllowed.current =
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !window.matchMedia('(pointer: coarse)').matches;
  }

  const onMove = useCallback((e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el || !tiltAllowed.current) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${px * MAX_TILT * 2}deg) rotateX(${
      -py * MAX_TILT * 2
    }deg) translateZ(14px)`;
  }, []);

  const reset = useCallback(() => {
    const el = cardRef.current;
    if (el) el.style.transform = '';
    setHovered(false);
  }, []);

  const handleOpen = useCallback(() => {
    const el = cardRef.current;
    if (el) onOpen(project.id, el.getBoundingClientRect());
  }, [onOpen, project.id]);

  return (
    <button
      type="button"
      data-reveal
      onClick={handleOpen}
      onPointerMove={onMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={reset}
      aria-label={`Open ${project.name} case study`}
      className="group block w-full text-left [perspective:1200px] focus:outline-none"
    >
      <div
        ref={cardRef}
        className="relative h-full overflow-hidden rounded-xl border border-hairline bg-[rgba(12,16,24,0.55)] p-5 backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 ease-out [transform-style:preserve-3d] group-hover:border-[rgba(126,223,255,0.45)] group-hover:shadow-[0_0_40px_-12px_rgba(110,168,255,0.5)] group-focus-visible:border-[rgba(126,223,255,0.7)] group-focus-visible:shadow-[0_0_44px_-10px_rgba(110,168,255,0.6)]"
      >
        {/* Faint tech grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(126,223,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(126,223,255,0.6) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />
        {/* Glowing cyan scan-line — accelerates on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(126,223,255,0.18) 60%, rgba(126,223,255,0.55))',
            animation: `gdg-scanline ${hovered ? 1.7 : 5.5}s linear infinite`,
            willChange: 'transform',
          }}
        />

        <div className="relative flex h-full flex-col">
          {/* Header: codename + index + status dot */}
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            <span>{project.codename}</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#7fdfff]" />
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>

          {/* Project name */}
          <h3 className="mt-4 font-serif text-2xl leading-tight text-ink">
            {project.name}
          </h3>
          <p className="mt-2 font-sans text-xs leading-relaxed text-muted">
            {project.tagline}
          </p>

          {/* Looping compilation console */}
          <div className="mt-4 min-h-[112px] flex-1 rounded-md border border-hairline bg-[rgba(4,6,10,0.6)] p-3">
            <TypingTerminal lines={TYPING_SCRIPT} />
          </div>

          {/* Expand affordance */}
          <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[#7fdfff] opacity-70 transition-opacity duration-300 group-hover:opacity-100">
            [ EXPAND_PROJECT&nbsp;→ ]
          </div>
        </div>
      </div>
    </button>
  );
}
