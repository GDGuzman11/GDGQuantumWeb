'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { projects, type Project } from '@/lib/projects';
import { TECH_ICON_PATHS } from '@/lib/tech-icons';
import { PrimaryLink } from '@/components/home/PrimaryLink';
import type { DiveSection } from '@/lib/dive';

/**
 * The "quantum field" chamber — the cinematic Projects interior, as a CAROUSEL.
 * One project slide locks in the centre of the screen (so nothing is clipped top
 * or bottom); arrows / dots / swipe slide the next one in. Each compact slide has
 * its real CTAs plus an "Expand" button that opens the full case study (a focused,
 * scrollable detail layer). Everything materialises out of the field (gdg-holo-in).
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
function MediaViewport({ project, compact }: { project: Project; compact?: boolean }) {
  const { media, accent, name } = project;
  const [failed, setFailed] = useState(false);
  const showVideo = !!media?.video && !failed;
  const showImage = !!media?.image && !media?.video && !failed;
  const showPlaceholder = !showVideo && !showImage;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 ${compact ? 'h-[clamp(140px,28vh,260px)]' : 'aspect-video'}`}
    >
      {showVideo && (
        <video className="h-full w-full object-cover" src={media!.video} poster={media!.poster} autoPlay muted loop playsInline onError={() => setFailed(true)} />
      )}
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

/** The buttons row shared by the compact slide and the expanded detail. */
function CtaRow({ project }: { project: Project }) {
  const { links, accent } = project;
  if (project.private) {
    return (
      <span className="rounded-full border border-white/12 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
        Private build
      </span>
    );
  }
  return (
    <>
      {links?.live && <Cta href={links.live} label="Live" accent={accent} external />}
      {links?.play && <Cta href={links.play} label="Play" accent={accent} />}
      {links?.source && <Cta href={links.source} label="Source" accent={accent} external muted />}
    </>
  );
}

/** Compact carousel slide — media + name + teaser + CTAs + Expand. */
function ProjectSlide({ project, onExpand }: { project: Project; onExpand: () => void }) {
  const { codename, name, tagline, story, accent } = project;
  return (
    <article className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/12 bg-[rgba(6,8,14,0.6)] p-5 backdrop-blur-md sm:p-6" style={{ boxShadow: `0 24px 70px -30px ${accent}66` }}>
      <MediaViewport project={project} compact />
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>
        {codename}
      </p>
      <h3 className="mt-1 font-serif text-[clamp(1.4rem,3.4vw,2rem)] leading-tight text-ink">{name}</h3>
      <p className="mt-1 font-sans text-sm text-white/60">{tagline}</p>
      <p className="mt-3 line-clamp-2 font-sans text-[0.9rem] leading-relaxed text-white/75">{story}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onExpand}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-sans text-xs uppercase tracking-[0.16em] text-white transition-all duration-300 hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ backgroundColor: `${accent}26`, border: `1px solid ${accent}88`, boxShadow: `0 0 22px ${accent}44` }}
        >
          Expand
          <span aria-hidden>⤢</span>
        </button>
        <CtaRow project={project} />
      </div>
    </article>
  );
}

/** Expanded case study — focused, scrollable detail layer (portaled to body). */
function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const { codename, name, tagline, story, highlights, tech, accent } = project;

  // Escape collapses back to the carousel — intercept on capture so Hero's own
  // Escape (close the whole interior) doesn't also fire.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-[rgba(2,3,7,0.78)] px-5 py-14 backdrop-blur-lg sm:items-center sm:py-16">
      <button
        type="button"
        onClick={onClose}
        className="group fixed left-6 top-6 z-10 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.22em] text-white/70 transition-colors duration-300 hover:text-white focus:outline-none focus-visible:text-white sm:left-8 sm:top-8"
      >
        <span aria-hidden className="transition-transform duration-300 group-hover:-translate-x-1">&larr;</span>
        Back to projects
      </button>

      <div className="w-full max-w-3xl" style={{ animation: 'gdg-holo-in 0.6s ease-out both' }}>
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

export function ProjectsInterior({ onNavigate }: { onNavigate: (s: Exclude<DiveSection, null>) => void }) {
  const [active, setActive] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const n = projects.length;
  const go = (i: number) => setActive(((i % n) + n) % n);

  const startX = useRef<number | null>(null);

  // Arrow-key navigation (only while the carousel is showing).
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
    <div className="w-full max-w-2xl">
      <div className="text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.85)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">02 · Projects</p>
        <h2 className="mt-3 font-serif text-[clamp(1.6rem,4vw,2.6rem)] leading-tight tracking-tight text-ink">
          Built from first principles.
        </h2>
      </div>

      {/* Carousel */}
      <div className="relative mt-7">
        <div
          className="overflow-hidden"
          onPointerDown={(e) => (startX.current = e.clientX)}
          onPointerUp={(e) => {
            if (startX.current == null) return;
            const dx = e.clientX - startX.current;
            startX.current = null;
            if (dx > 45) go(active - 1);
            else if (dx < -45) go(active + 1);
          }}
        >
          <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${active * 100}%)`, animation: 'gdg-holo-in 0.7s ease-out both' }}>
            {projects.map((p) => (
              <div key={p.id} className="w-full shrink-0 px-1">
                <ProjectSlide project={p} onExpand={() => setExpandedId(p.id)} />
              </div>
            ))}
          </div>
        </div>

        {/* Arrows */}
        <button
          type="button"
          aria-label="Previous project"
          onClick={() => go(active - 1)}
          className="absolute -left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 font-serif text-lg text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:-left-5"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next project"
          onClick={() => go(active + 1)}
          className="absolute -right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 font-serif text-lg text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:-right-5"
        >
          ›
        </button>
      </div>

      {/* Dots */}
      <div className="mt-5 flex items-center justify-center gap-2.5">
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

      <div className="mt-7 flex items-center justify-center gap-10">
        <PrimaryLink label="Back to About" direction="left" onClick={() => onNavigate('about')} />
        <PrimaryLink label="Continue to Contact" onClick={() => onNavigate('contact')} />
      </div>

      {expanded && <ProjectDetail project={expanded} onClose={() => setExpandedId(null)} />}
    </div>
  );
}
