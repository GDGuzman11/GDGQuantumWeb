'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { projects, type Project } from '@/lib/projects';
import { TECH_ICON_PATHS } from '@/lib/tech-icons';
import { PrimaryLink } from '@/components/home/PrimaryLink';
import type { DiveSection } from '@/lib/dive';

/**
 * The "quantum field" chamber — the cinematic Projects interior, as a 3D CARD
 * STACK. The projects are layered like a deck; selecting one brings it to the
 * front (the others recede behind it with depth), so a single card is always
 * centred and nothing is clipped. Arrows / dots / swipe shuffle the deck.
 *
 * Each card's "Expand" button opens the full case study with a cinematic shard
 * transition: the screen breaks into 3D glass shards that dissolve to form the
 * full page, and reverses on exit (see ShardField + the gdg-shard-* keyframes).
 *
 * Lazy-loaded by Hero (kept out of First Load). Crawlable copy lives in SeoContent.
 */

/** One tech: brand glyph (accent-glowing) or a text chip when no glyph exists. */
function TechChip({ name, accent }: { name: string; accent: string }) {
  const path = TECH_ICON_PATHS[name];
  return (
    <li className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
      {path ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0" style={{ color: accent, filter: `drop-shadow(0 0 5px ${accent}88)` }}>
          <path d={path} />
        </svg>
      ) : (
        <span aria-hidden className="shrink-0 text-[9px]" style={{ color: accent }}>
          ▢
        </span>
      )}
      <span className="whitespace-nowrap font-sans text-[0.72rem] text-white/75">{name}</span>
    </li>
  );
}

/** The reserved media viewport: video > image > graceful placeholder. */
function MediaViewport({ project, fill }: { project: Project; fill?: boolean }) {
  const { media, accent, name } = project;
  const [failed, setFailed] = useState(false);
  const showVideo = !!media?.video && !failed;
  const showImage = !!media?.image && !media?.video && !failed;
  const showPlaceholder = !showVideo && !showImage;

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 ${fill ? 'h-full' : 'aspect-video'}`}>
      {showVideo && <video className="h-full w-full object-cover" src={media!.video} poster={media!.poster} autoPlay muted loop playsInline onError={() => setFailed(true)} />}
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="h-full w-full object-cover" src={media!.image} alt={`${name} preview`} onError={() => setFailed(true)} />
      )}
      {showPlaceholder && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: `radial-gradient(130% 130% at 30% 20%, ${accent}24, transparent 60%), linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.25))` }}>
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 rounded-full border" style={{ borderColor: `${accent}66`, boxShadow: `0 0 18px ${accent}55` }} />
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">media</p>
          </div>
        </div>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-12 opacity-40" style={{ background: `linear-gradient(${accent}00, ${accent}44, ${accent}00)`, animation: 'gdg-scanline 5.5s linear infinite' }} />
      <span aria-hidden className="absolute left-2 top-2 h-3 w-3 border-l border-t" style={{ borderColor: `${accent}99` }} />
      <span aria-hidden className="absolute bottom-2 right-2 h-3 w-3 border-b border-r" style={{ borderColor: `${accent}99` }} />
    </div>
  );
}

/** A real CTA — external link or in-app route. */
function Cta({ href, label, accent, external, muted }: { href: string; label: string; accent: string; external?: boolean; muted?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-sans text-xs uppercase tracking-[0.16em] transition-all duration-300 hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      style={muted ? { borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.72)' } : { borderColor: `${accent}66`, color: accent, boxShadow: `0 0 18px ${accent}33` }}
    >
      {label}
      <span aria-hidden>{external ? '↗' : '▸'}</span>
    </a>
  );
}

/** Buttons shared by the deck card and the expanded detail. */
function CtaRow({ project }: { project: Project }) {
  const { links, accent } = project;
  if (project.private) {
    return <span className="rounded-full border border-white/12 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Private build</span>;
  }
  return (
    <>
      {links?.live && <Cta href={links.live} label="Live" accent={accent} external />}
      {links?.play && <Cta href={links.play} label="Play" accent={accent} />}
      {links?.source && <Cta href={links.source} label="Source" accent={accent} external muted />}
    </>
  );
}

/** A deck card. `pos` = depth from the front (0 = front, centred). */
function DeckCard({ project, pos, total, onExpand }: { project: Project; pos: number; total: number; onExpand: () => void }) {
  const { codename, name, tagline, story, accent } = project;
  const hidden = pos > 2;
  const style: CSSProperties = {
    zIndex: total - pos,
    opacity: hidden ? 0 : 1 - pos * 0.22,
    transform: `translateY(${-pos * 22}px) translateZ(${-pos * 120}px) scale(${1 - pos * 0.05})`,
    transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s ease, box-shadow 0.6s ease',
    boxShadow: `0 ${30 + pos * 6}px 80px -30px ${accent}${pos === 0 ? 'aa' : '55'}`,
    pointerEvents: pos === 0 ? 'auto' : 'none',
  };
  return (
    <article className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-[rgba(6,8,14,0.7)] p-5 backdrop-blur-md sm:p-7" style={style} aria-hidden={pos !== 0}>
      <div className="h-[46%] min-h-0 shrink-0">
        <MediaViewport project={project} fill />
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: accent }}>
          {codename}
        </p>
        <h3 className="mt-1 font-serif text-[clamp(1.7rem,3.6vw,2.5rem)] leading-tight text-ink">{name}</h3>
        <p className="mt-1 font-sans text-[0.95rem] text-white/60">{tagline}</p>
        <p className="mt-3 line-clamp-3 font-sans text-[0.95rem] leading-relaxed text-white/75">{story}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-4">
          <button
            type="button"
            onClick={onExpand}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-xs uppercase tracking-[0.16em] text-white transition-all duration-300 hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={{ backgroundColor: `${accent}2a`, border: `1px solid ${accent}88`, boxShadow: `0 0 22px ${accent}44` }}
          >
            Expand
            <span aria-hidden>⤢</span>
          </button>
          <CtaRow project={project} />
        </div>
      </div>
    </article>
  );
}

/** 3D glass shards that fly in to form the page (in) / cover then scatter (out). */
function ShardField({ accent, mode }: { accent: string; mode: 'in' | 'out' }) {
  const COLS = 6;
  const ROWS = 4;
  const tiles = useMemo(() => {
    return Array.from({ length: COLS * ROWS }, (_, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const dx = col - (COLS - 1) / 2;
      const dy = row - (ROWS - 1) / 2;
      const f = ((i * 73 + 17) % 100) / 100;
      const g = ((i * 131 + 7) % 100) / 100;
      return {
        sx: `${dx * 140 + (f - 0.5) * 90}px`,
        sy: `${dy * 160 + (g - 0.5) * 90}px`,
        sz: `${(f - 0.5) * 560}px`,
        rx: `${(g - 0.5) * 95}deg`,
        ry: `${(f - 0.5) * 95}deg`,
        rz: `${(g - 0.5) * 65}deg`,
        delay: (mode === 'in' ? i : COLS * ROWS - 1 - i) * 0.01,
      };
    });
  }, [mode]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[96]" style={{ perspective: '1200px' }} aria-hidden>
      <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${COLS},1fr)`, gridTemplateRows: `repeat(${ROWS},1fr)`, transformStyle: 'preserve-3d' }}>
        {tiles.map((t, i) => (
          <div
            key={i}
            style={
              {
                '--sx': t.sx,
                '--sy': t.sy,
                '--sz': t.sz,
                '--rx': t.rx,
                '--ry': t.ry,
                '--rz': t.rz,
                animation: `${mode === 'in' ? 'gdg-shard-in 0.85s ease-out' : 'gdg-shard-out 0.6s ease-in'} ${t.delay}s both`,
                background: `linear-gradient(135deg, ${accent}33, rgba(6,8,14,0.55))`,
                border: `1px solid ${accent}55`,
                boxShadow: `0 0 22px ${accent}30`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

/** Expanded case study — focused, scrollable detail with the shard transition. */
function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const { codename, name, tagline, story, highlights, tech, accent } = project;
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    setClosing((c) => {
      if (c) return c;
      window.setTimeout(onClose, 700);
      return true;
    });
  }, [onClose]);

  // Escape collapses back — intercept on capture so Hero's Escape doesn't also fire.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [requestClose]);

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-[rgba(2,3,7,0.8)] px-5 py-14 backdrop-blur-lg sm:items-center sm:py-16">
      <ShardField accent={accent} mode={closing ? 'out' : 'in'} />
      <button
        type="button"
        onClick={requestClose}
        className="group fixed left-6 top-6 z-[97] inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.22em] text-white/70 transition-colors duration-300 hover:text-white focus:outline-none focus-visible:text-white sm:left-8 sm:top-8"
      >
        <span aria-hidden className="transition-transform duration-300 group-hover:-translate-x-1">&larr;</span>
        Back to projects
      </button>

      <div className="relative w-full max-w-3xl" style={{ animation: closing ? 'gdg-holo-out 0.42s ease-in both' : 'gdg-holo-in 0.6s ease-out 0.22s both' }}>
        <MediaViewport project={project} />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.32em]" style={{ color: accent }}>
          {codename}
        </p>
        <h2 className="mt-2 font-serif text-[clamp(2rem,5vw,3rem)] leading-tight text-ink">{name}</h2>
        <p className="mt-2 font-sans text-base text-white/60">{tagline}</p>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/85">{story}</p>

        <ul className="mt-6 flex flex-wrap gap-2">
          {tech.map((t) => (
            <TechChip key={t} name={t} accent={accent} />
          ))}
        </ul>

        <ul className="mt-6 space-y-1.5">
          {highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 font-mono text-xs leading-relaxed text-white/70">
              <span aria-hidden style={{ color: accent }}>
                ▸
              </span>
              {h}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <CtaRow project={project} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NavArrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === 'prev' ? 'Previous project' : 'Next project'}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 font-serif text-xl text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {dir === 'prev' ? '‹' : '›'}
    </button>
  );
}

export function ProjectsInterior({ onNavigate }: { onNavigate: (s: Exclude<DiveSection, null>) => void }) {
  const [active, setActive] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const n = projects.length;
  const go = (i: number) => setActive(((i % n) + n) % n);
  const startX = useRef<number | null>(null);

  // Arrow-key navigation while the deck is showing.
  useEffect(() => {
    if (expandedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(active - 1);
      else if (e.key === 'ArrowRight') go(active + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, expandedId]);

  const expanded = expandedId ? projects.find((p) => p.id === expandedId) ?? null : null;
  const accent = projects[active]?.accent ?? '#7fdfff';

  return (
    <div className="flex w-full flex-col items-center">
      <div className="text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.85)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">02 · Projects</p>
        <h2 className="mt-3 font-serif text-[clamp(1.7rem,4vw,2.8rem)] leading-tight tracking-tight text-ink">Built from first principles.</h2>
      </div>

      {/* 3D card deck — selecting brings a card to the front of the stack. */}
      <div
        className="relative mt-8"
        style={{ width: 'min(92vw, 760px)', height: 'clamp(440px, 64vh, 600px)', perspective: '1400px' }}
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current == null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (dx > 45) go(active - 1);
          else if (dx < -45) go(active + 1);
        }}
      >
        {projects.map((p, i) => (
          <DeckCard key={p.id} project={p} pos={((i - active) % n + n) % n} total={n} onExpand={() => setExpandedId(p.id)} />
        ))}
      </div>

      {/* Controls — arrows flanking the dots. */}
      <div className="mt-7 flex items-center justify-center gap-4">
        <NavArrow dir="prev" onClick={() => go(active - 1)} />
        <div className="flex items-center gap-2.5">
          {projects.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Go to ${p.name}`}
              aria-current={i === active}
              onClick={() => go(i)}
              className="h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              style={i === active ? { width: 22, backgroundColor: accent, boxShadow: `0 0 12px ${accent}` } : { width: 8, backgroundColor: 'rgba(255,255,255,0.28)' }}
            />
          ))}
        </div>
        <NavArrow dir="next" onClick={() => go(active + 1)} />
      </div>

      <div className="mt-7 flex items-center justify-center gap-10">
        <PrimaryLink label="Back to About" direction="left" onClick={() => onNavigate('about')} />
        <PrimaryLink label="Continue to Contact" onClick={() => onNavigate('contact')} />
      </div>

      {expanded && <ProjectDetail project={expanded} onClose={() => setExpandedId(null)} />}
    </div>
  );
}
