'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { projects, type Project, type GalleryItem } from '@/lib/projects';
import { TECH_ICON_PATHS } from '@/lib/tech-icons';
import { PrimaryLink } from '@/components/home/PrimaryLink';
import type { DiveSection } from '@/lib/dive';

/**
 * The cinematic Projects interior — a 3D CARD STACK (deck). Selecting a project
 * brings its card to the front; arrows / dots / swipe shuffle the deck.
 *
 * "Expand" plays a TV-static "tune-in": the whole screen fills with generated
 * snow (signal lost) for ~1s, the view swaps to that project's full case study
 * underneath, then the static fizzes out and it tunes in. Going back does the
 * same in reverse — static, then the deck tunes back in. Reduced-motion skips the
 * static (instant swap).
 *
 * Lazy-loaded by Hero (out of First Load). Crawlable copy lives in SeoContent.
 */

type Rect = { left: number; top: number; width: number; height: number };

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

/** The reserved media viewport: video > image > placeholder. */
function MediaViewport({ project, fill, still }: { project: Project; fill?: boolean; still?: boolean }) {
  const { media, accent, name } = project;
  const [failed, setFailed] = useState(false);
  const useVideo = !still && !!media?.video;
  const imgSrc = media?.image || (still ? media?.poster : undefined);
  const showVideo = useVideo && !failed;
  const showImage = !useVideo && !!imgSrc && !failed;
  const showPlaceholder = !showVideo && !showImage;

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 ${fill ? 'h-full' : 'aspect-video'}`}>
      {showVideo && <video className="h-full w-full object-cover" src={media!.video} poster={media!.poster} autoPlay muted loop playsInline onError={() => setFailed(true)} />}
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="h-full w-full object-cover" src={imgSrc} alt={`${name} preview`} onError={() => setFailed(true)} />
      )}
      {showPlaceholder && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: `radial-gradient(130% 130% at 30% 20%, ${accent}24, transparent 60%), linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.25))` }}>
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 rounded-full border" style={{ borderColor: `${accent}66`, boxShadow: `0 0 18px ${accent}55` }} />
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">media</p>
          </div>
        </div>
      )}
      {!still && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-12 opacity-40" style={{ background: `linear-gradient(${accent}00, ${accent}44, ${accent}00)`, animation: 'gdg-scanline 5.5s linear infinite' }} />}
      <span aria-hidden className="absolute left-2 top-2 h-3 w-3 border-l border-t" style={{ borderColor: `${accent}99` }} />
      <span aria-hidden className="absolute bottom-2 right-2 h-3 w-3 border-b border-r" style={{ borderColor: `${accent}99` }} />
    </div>
  );
}

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
  const front = pos === 0;
  const style: CSSProperties = {
    zIndex: total - pos,
    opacity: pos > 2 ? 0 : 1 - pos * 0.22,
    transform: `translateY(${-pos * 22}px) translateZ(${-pos * 120}px) scale(${1 - pos * 0.05})`,
    transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s ease, box-shadow 0.6s ease',
    boxShadow: `0 ${30 + pos * 6}px 80px -30px ${accent}${front ? 'aa' : '55'}`,
    pointerEvents: front ? 'auto' : 'none',
  };
  return (
    <article className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-white/12 p-5 sm:p-7" style={{ ...style, background: 'linear-gradient(165deg, rgba(13,16,26,0.97), rgba(6,8,13,0.98))' }} aria-hidden={!front}>
      <div className="h-[46%] min-h-0 shrink-0">
        <MediaViewport project={project} fill still={!front} />
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
            tabIndex={front ? 0 : -1}
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

/** Full-screen generated TV static that covers the screen, then fizzes out. */
function StaticBurst({ onSwap, onEnd }: { onSwap: () => void; onEnd: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvs = ref.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;
    const W = 320;
    const H = 180;
    cvs.width = W;
    cvs.height = H;
    const img = ctx.createImageData(W, H);
    const data = img.data;
    let raf = 0;
    let alive = true;
    const draw = () => {
      if (!alive) return;
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    draw();
    const tSwap = window.setTimeout(onSwap, 480); // swap the view while fully covered
    const tEnd = window.setTimeout(onEnd, 1150);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(tSwap);
      window.clearTimeout(tEnd);
    };
  }, [onSwap, onEnd]);

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black" style={{ animation: 'gdg-static-burst 1.15s ease-in-out forwards' }} aria-hidden>
      <canvas ref={ref} className="h-full w-full [image-rendering:pixelated]" style={{ filter: 'contrast(1.15) brightness(1.05)' }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 3px)' }} />
      <div className="pointer-events-none absolute inset-x-0 h-[16%] opacity-30" style={{ background: 'linear-gradient(rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)', animation: 'gdg-static-roll 0.65s linear infinite' }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 50% 50%, transparent 52%, rgba(0,0,0,0.65) 100%)' }} />
    </div>,
    document.body,
  );
}

/** The deck (card stack) view. */
function DeckView({
  active,
  setActive,
  onExpand,
  onNavigate,
  deckRef,
}: {
  active: number;
  setActive: (i: number) => void;
  onExpand: (p: Project) => void;
  onNavigate: (s: Exclude<DiveSection, null>) => void;
  deckRef: React.RefObject<HTMLDivElement>;
}) {
  const n = projects.length;
  const go = (i: number) => setActive(((i % n) + n) % n);
  const startX = useRef<number | null>(null);
  const accent = projects[active]?.accent ?? '#7fdfff';

  return (
    <div className="flex w-full flex-col items-center">
      <div className="text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.85)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">02 · Projects</p>
        <h2 className="mt-3 font-serif text-[clamp(1.7rem,4vw,2.8rem)] leading-tight tracking-tight text-ink">Built from first principles.</h2>
      </div>

      <div
        ref={deckRef}
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
          <DeckCard key={p.id} project={p} pos={(((i - active) % n) + n) % n} total={n} onExpand={() => onExpand(p)} />
        ))}
      </div>

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
    </div>
  );
}

/** A mono section eyebrow with an accent tick. */
function SectionLabel({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/55">
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
      {children}
    </p>
  );
}

/** One gallery item: real media (with graceful placeholder fallback). */
function GalleryMedia({ item, accent, thumb, fill }: { item: GalleryItem; accent: string; thumb?: boolean; fill?: boolean }) {
  const [failed, setFailed] = useState(false);
  const isVideo = item.kind === 'video';
  const ok = !failed;
  return (
    <div className={`relative w-full overflow-hidden rounded-lg border border-white/10 bg-black/40 ${fill ? 'h-full' : 'aspect-video'}`}>
      {ok && isVideo && (
        <video className="h-full w-full object-cover" src={item.src} poster={item.poster} playsInline muted={thumb} controls={!thumb} onError={() => setFailed(true)} />
      )}
      {ok && !isVideo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="h-full w-full object-cover" src={item.src} alt={item.caption ?? ''} onError={() => setFailed(true)} />
      )}
      {!ok && (
        <div className="absolute inset-0 grid place-items-center p-2 text-center" style={{ background: `radial-gradient(120% 120% at 30% 20%, ${accent}22, transparent 60%), linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.3))` }}>
          <div>
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-full border text-[11px]" style={{ borderColor: `${accent}66`, color: accent }}>
              {isVideo ? '▶' : '▢'}
            </div>
            {!thumb && item.caption && <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-white/40">{item.caption}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/** The media gallery: a main viewer (fills its tile) + selectable thumbnails. */
function Gallery({ project }: { project: Project }) {
  const items = project.gallery ?? [];
  const [sel, setSel] = useState(0);
  if (items.length === 0) return <MediaViewport project={project} fill />;
  const i = Math.min(sel, items.length - 1);
  const cur = items[i];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1">
        <GalleryMedia item={cur} accent={project.accent} fill />
        {cur.caption && (
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-center font-sans text-[11px] text-white/75">
            {cur.caption}
          </p>
        )}
      </div>
      <div className="mt-2 flex shrink-0 flex-wrap justify-center gap-1.5">
        {items.map((it, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`View ${it.caption ?? `item ${idx + 1}`}`}
            onClick={() => setSel(idx)}
            className="w-16 overflow-hidden rounded transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={{ outline: idx === i ? `2px solid ${project.accent}` : '2px solid transparent', outlineOffset: 2, opacity: idx === i ? 1 : 0.55 }}
          >
            <GalleryMedia item={it} accent={project.accent} thumb />
          </button>
        ))}
      </div>
    </div>
  );
}

/** A bento tile — a glass panel that clips (no internal scroll) on the desktop grid. */
function Tile({ className, accent, delay, children }: { className?: string; accent?: string; delay?: number; children: React.ReactNode }) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/12 bg-[rgba(10,13,22,0.62)] p-4 ${className ?? ''}`}
      style={{ animation: `gdg-holo-in 0.5s ease-out ${delay ?? 0}s both`, ...(accent ? { boxShadow: `0 18px 60px -34px ${accent}88` } : {}) }}
    >
      {children}
    </div>
  );
}

/**
 * The full case study as a BENTO GRID — every section is a tile, all on one
 * screen (no scroll on desktop): a big gallery anchors top-left (F-pattern), the
 * identity + CTAs sit top-right, and the breakdown / unique / stack tile in
 * underneath. Below `lg` the tiles stack (the overlay scrolls — a phone can't fit
 * it all). Tiles clip rather than scroll; the copy is kept scannable.
 */
function DetailView({ project, onBack }: { project: Project; onBack: () => void }) {
  const { codename, name, tagline, story, role, highlights, tech, sections, unique, accent } = project;
  return (
    <div className="flex w-full max-w-5xl flex-col">
      <button
        type="button"
        onClick={onBack}
        className="group mb-3 inline-flex shrink-0 items-center gap-2 self-start font-sans text-xs uppercase tracking-[0.22em] text-white/70 transition-colors duration-300 hover:text-white focus:outline-none focus-visible:text-white"
      >
        <span aria-hidden className="transition-transform duration-300 group-hover:-translate-x-1">&larr;</span>
        Back to projects
      </button>

      <div className="grid gap-3 lg:h-[calc(100svh-12rem)] lg:max-h-[760px] lg:grid-cols-3 lg:grid-rows-[1.25fr_1fr_auto]">
        {/* GALLERY — the big visual anchor (top-left) */}
        <Tile accent={accent} delay={0} className="lg:col-span-2 lg:row-span-2 lg:col-start-1 lg:row-start-1">
          <SectionLabel accent={accent}>Gallery</SectionLabel>
          <div className="mt-2 min-h-[220px] flex-1 lg:min-h-0">
            <Gallery project={project} />
          </div>
        </Tile>

        {/* HERO — identity, scope, links, metrics (top-right) */}
        <Tile accent={accent} delay={0.05} className="lg:col-start-3 lg:row-start-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>
            {codename}
          </p>
          <h2 className="mt-1 font-serif text-[clamp(1.5rem,3vw,2.1rem)] leading-tight text-ink">{name}</h2>
          <p className="mt-1 line-clamp-2 font-sans text-[0.85rem] text-white/60">{tagline}</p>
          {role && <p className="mt-1.5 line-clamp-1 font-sans text-[0.75rem] text-white/45">{role}</p>}
          <ul className="mt-2 flex min-h-0 flex-1 flex-wrap content-start gap-1.5 overflow-hidden">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] text-white/70">
                <span aria-hidden style={{ color: accent }}>
                  ▸
                </span>
                {h}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex shrink-0 flex-wrap gap-2">
            <CtaRow project={project} />
          </div>
        </Tile>

        {/* HOW IT'S BUILT — the component breakdown (right, mid) */}
        <Tile accent={accent} delay={0.1} className="lg:col-start-3 lg:row-start-2">
          <SectionLabel accent={accent}>How it&rsquo;s built</SectionLabel>
          <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-hidden">
            {(sections ?? []).map((s, idx) => (
              <li key={s.title}>
                <p className="font-sans text-[0.8rem] font-medium leading-tight" style={{ color: accent }}>
                  <span className="text-white/30">{String(idx + 1).padStart(2, '0')} </span>
                  {s.title}
                </p>
                <p className="line-clamp-2 font-sans text-[0.72rem] leading-snug text-white/65">{s.body}</p>
              </li>
            ))}
          </ul>
        </Tile>

        {/* OVERVIEW (bottom-left) */}
        <Tile accent={accent} delay={0.15} className="lg:col-start-1 lg:row-start-3">
          <SectionLabel accent={accent}>Overview</SectionLabel>
          <p className="mt-2 line-clamp-4 font-sans text-[0.82rem] leading-relaxed text-white/80">{story}</p>
        </Tile>

        {/* WHAT MAKES IT UNIQUE (bottom-middle, emphasized) */}
        <Tile delay={0.2} className="lg:col-start-2 lg:row-start-3" >
          <div className="-m-4 flex h-full min-h-0 flex-col p-4" style={{ background: `linear-gradient(160deg, ${accent}1c, rgba(6,8,14,0.4))`, borderRadius: '1rem' }}>
            <SectionLabel accent={accent}>What makes it unique</SectionLabel>
            <p className="mt-2 line-clamp-4 font-serif text-[0.95rem] italic leading-snug text-white/90">{unique}</p>
          </div>
        </Tile>

        {/* STACK (bottom-right) */}
        <Tile accent={accent} delay={0.25} className="lg:col-start-3 lg:row-start-3">
          <SectionLabel accent={accent}>Stack</SectionLabel>
          <ul className="mt-2 flex flex-wrap gap-1.5 overflow-hidden">
            {tech.map((t) => (
              <TechChip key={t} name={t} accent={accent} />
            ))}
          </ul>
        </Tile>
      </div>
    </div>
  );
}

export function ProjectsInterior({ onNavigate }: { onNavigate: (s: Exclude<DiveSection, null>) => void }) {
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Project | null>(null);
  const [burst, setBurst] = useState(false);
  const busy = useRef(false);
  const pendingSwap = useRef<() => void>(() => {});
  const deckRef = useRef<HTMLDivElement>(null);

  // Run a view swap behind a static burst (or instantly under reduced motion).
  const withStatic = useCallback((swap: () => void) => {
    if (busy.current) return;
    if (reducedMotion()) {
      swap();
      return;
    }
    busy.current = true;
    pendingSwap.current = swap;
    setBurst(true);
  }, []);

  const onSwap = useCallback(() => pendingSwap.current(), []);
  const onEnd = useCallback(() => {
    setBurst(false);
    busy.current = false;
  }, []);

  const openDetail = useCallback((p: Project) => withStatic(() => setDetail(p)), [withStatic]);
  const backToDeck = useCallback(() => withStatic(() => setDetail(null)), [withStatic]);

  // Keys: in the detail, Escape returns to the deck (capture, so Hero's Escape
  // doesn't close the whole interior). In the deck, arrows shuffle.
  useEffect(() => {
    if (detail) {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          e.preventDefault();
          backToDeck();
        }
      };
      window.addEventListener('keydown', onKey, true);
      return () => window.removeEventListener('keydown', onKey, true);
    }
    const onKey = (e: KeyboardEvent) => {
      if (busy.current) return;
      if (e.key === 'ArrowLeft') setActive((a) => (a - 1 + projects.length) % projects.length);
      else if (e.key === 'ArrowRight') setActive((a) => (a + 1) % projects.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, backToDeck]);

  return (
    <>
      {detail ? (
        <DetailView project={detail} onBack={backToDeck} />
      ) : (
        <DeckView active={active} setActive={setActive} onExpand={openDetail} onNavigate={onNavigate} deckRef={deckRef} />
      )}

      {burst && <StaticBurst onSwap={onSwap} onEnd={onEnd} />}
    </>
  );
}
