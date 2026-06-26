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
function GalleryMedia({ item, accent, thumb }: { item: GalleryItem; accent: string; thumb?: boolean }) {
  const [failed, setFailed] = useState(false);
  const isVideo = item.kind === 'video';
  const ok = !failed;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
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

/** The media gallery: a main viewer + selectable thumbnails. */
function Gallery({ project }: { project: Project }) {
  const items = project.gallery ?? [];
  const [sel, setSel] = useState(0);
  if (items.length === 0) return <MediaViewport project={project} />;
  const i = Math.min(sel, items.length - 1);
  const cur = items[i];
  return (
    <div>
      <GalleryMedia item={cur} accent={project.accent} />
      {cur.caption && <p className="mt-2 text-center font-sans text-xs text-white/55">{cur.caption}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {items.map((it, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`View ${it.caption ?? `item ${idx + 1}`}`}
            onClick={() => setSel(idx)}
            className="w-20 overflow-hidden rounded-md transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={{ outline: idx === i ? `2px solid ${project.accent}` : '2px solid transparent', outlineOffset: 2, opacity: idx === i ? 1 : 0.6 }}
          >
            <GalleryMedia item={it} accent={project.accent} thumb />
          </button>
        ))}
      </div>
    </div>
  );
}

/** The full case study — sectioned for a recruiter / fellow-dev skim then deep read. */
function DetailView({ project, onBack }: { project: Project; onBack: () => void }) {
  const { codename, name, tagline, story, role, highlights, tech, sections, unique, accent } = project;
  return (
    <div className="w-full max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="group inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.22em] text-white/70 transition-colors duration-300 hover:text-white focus:outline-none focus-visible:text-white"
      >
        <span aria-hidden className="transition-transform duration-300 group-hover:-translate-x-1">&larr;</span>
        Back to projects
      </button>

      {/* HERO — name, scope, links, and the metrics strip up top for the skim */}
      <div className="mt-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em]" style={{ color: accent }}>
          {codename}
        </p>
        <h2 className="mt-2 font-serif text-[clamp(2rem,5vw,3rem)] leading-tight text-ink">{name}</h2>
        <p className="mt-2 font-sans text-base text-white/60">{tagline}</p>
        {role && <p className="mt-2 font-sans text-sm text-white/45">{role}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <CtaRow project={project} />
        </div>
        <ul className="mt-5 flex flex-wrap gap-2">
          {highlights.map((h) => (
            <li key={h} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] text-white/70">
              <span aria-hidden style={{ color: accent }}>
                ▸
              </span>
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* GALLERY */}
      <section className="mt-12">
        <SectionLabel accent={accent}>Gallery</SectionLabel>
        <div className="mt-4">
          <Gallery project={project} />
        </div>
      </section>

      {/* OVERVIEW */}
      <section className="mt-12">
        <SectionLabel accent={accent}>Overview</SectionLabel>
        <p className="mt-4 font-sans text-base leading-relaxed text-white/85">{story}</p>
      </section>

      {/* HOW IT'S BUILT — the component breakdown */}
      {sections && sections.length > 0 && (
        <section className="mt-12">
          <SectionLabel accent={accent}>How it&rsquo;s built</SectionLabel>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sections.map((s, idx) => (
              <div key={s.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-4" style={{ animation: `gdg-holo-in 0.5s ease-out ${0.05 + idx * 0.07}s both` }}>
                <p className="font-mono text-[10px] tracking-widest text-white/30">{String(idx + 1).padStart(2, '0')}</p>
                <h3 className="mt-1 font-sans text-[0.98rem] font-medium" style={{ color: accent }}>
                  {s.title}
                </h3>
                <p className="mt-1.5 font-sans text-sm leading-relaxed text-white/70">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* WHAT MAKES IT UNIQUE */}
      {unique && (
        <section className="mt-12">
          <SectionLabel accent={accent}>What makes it unique</SectionLabel>
          <div className="mt-4 rounded-2xl border p-5 sm:p-6" style={{ borderColor: `${accent}55`, background: `linear-gradient(160deg, ${accent}14, rgba(6,8,14,0.5))`, boxShadow: `0 0 44px -12px ${accent}44` }}>
            <p className="font-serif text-[clamp(1.1rem,2.4vw,1.45rem)] italic leading-relaxed text-white/90">{unique}</p>
          </div>
        </section>
      )}

      {/* STACK */}
      <section className="mt-12">
        <SectionLabel accent={accent}>Stack</SectionLabel>
        <ul className="mt-4 flex flex-wrap gap-2">
          {tech.map((t) => (
            <TechChip key={t} name={t} accent={accent} />
          ))}
        </ul>
      </section>

      {/* FOOTER — links repeated + back */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
        <div className="flex flex-wrap gap-2.5">
          <CtaRow project={project} />
        </div>
        <button type="button" onClick={onBack} className="font-sans text-xs uppercase tracking-[0.22em] text-white/55 transition-colors hover:text-white focus:outline-none focus-visible:text-white">
          &larr; Back to projects
        </button>
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
