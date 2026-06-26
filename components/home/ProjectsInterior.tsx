'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { projects, type Project } from '@/lib/projects';
import { TECH_ICON_PATHS } from '@/lib/tech-icons';
import { PrimaryLink } from '@/components/home/PrimaryLink';
import type { DiveSection } from '@/lib/dive';

/**
 * The cinematic Projects interior — a 3D CARD STACK (deck). Selecting a project
 * brings its card to the front; arrows / dots / swipe shuffle the deck.
 *
 * "Expand" plays a procedurally-generated SHATTER: random crack lines slow-form
 * out of an impact point and run until they intersect, then the card breaks along
 * those exact seams into pieces (clip-path slices of the REAL card — no html2canvas)
 * that enlarge and fly out as the full case study forms. Going back re-forms the
 * SAME cracks across the screen and the pieces shrink back together into the card.
 *
 * Lazy-loaded by Hero (out of First Load). Crawlable copy lives in SeoContent.
 */

type Rect = { left: number; top: number; width: number; height: number };
type Pt = [number, number];
type GenCrack = { d: string; len: number; dur: number; delay: number };
type GenShard = { clip: string; dx: string; dy: string; rot: string };
type Shatter = { cracks: GenCrack[]; shards: GenShard[] };

// ---- procedural shatter geometry (0..100 viewBox coords) --------------------
const clamp = (v: number) => Math.max(0, Math.min(100, v));

function perimeterPoint(t: number): Pt {
  const u = ((t % 4) + 4) % 4;
  if (u < 1) return [u * 100, 0];
  if (u < 2) return [100, (u - 1) * 100];
  if (u < 3) return [100 - (u - 2) * 100, 100];
  return [0, 100 - (u - 3) * 100];
}
function pointToT([x, y]: Pt): number {
  if (y <= 0.5) return x / 100;
  if (x >= 99.5) return 1 + y / 100;
  if (y >= 99.5) return 2 + (100 - x) / 100;
  return 3 + (100 - y) / 100;
}
function rayExit(ix: number, iy: number, ang: number): Pt {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let s = Infinity;
  if (dx > 1e-6) s = Math.min(s, (100 - ix) / dx);
  if (dx < -1e-6) s = Math.min(s, (0 - ix) / dx);
  if (dy > 1e-6) s = Math.min(s, (100 - iy) / dy);
  if (dy < -1e-6) s = Math.min(s, (0 - iy) / dy);
  return [clamp(ix + dx * s), clamp(iy + dy * s)];
}
function jagged(a: Pt, b: Pt, segs: number, jit: number): Pt[] {
  const out: Pt[] = [a];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const px = -dy / L;
  const py = dx / L;
  for (let i = 1; i < segs; i++) {
    const f = i / segs;
    const j = (Math.random() - 0.5) * jit * (1 - Math.abs(f - 0.5));
    out.push([a[0] + dx * f + px * j, a[1] + dy * f + py * j]);
  }
  out.push(b);
  return out;
}
function polyLen(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
const pathD = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
function cornersBetween(t0: number, t1: number): Pt[] {
  let span = t1 - t0;
  if (span <= 1e-6) span += 4;
  const cs: { d: number; p: Pt }[] = [];
  for (let c = 0; c < 4; c++) {
    let d = c - t0;
    if (d <= 1e-6) d += 4;
    if (d < span - 1e-6) cs.push({ d, p: perimeterPoint(c) });
  }
  cs.sort((a, b) => a.d - b.d);
  return cs.map((x) => x.p);
}
const pointAlong = (pts: Pt[], f: number): Pt => pts[Math.max(1, Math.min(pts.length - 2, Math.round(f * (pts.length - 1))))];

/** Build a fresh random shatter: radial cracks from an impact point (sectors =
 *  shards), plus connector cracks that run between them and intersect. */
function generateShatter(): Shatter {
  const k = 5 + Math.floor(Math.random() * 3); // 5..7 main cracks
  const ix = 38 + Math.random() * 24;
  const iy = 42 + Math.random() * 16;
  const radials = Array.from({ length: k }, (_, j) => {
    const ang = (j / k) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI * 2 / k) * 0.85;
    const exit = rayExit(ix, iy, ang);
    const pts = jagged([ix, iy], exit, 4 + Math.floor(Math.random() * 3), 8);
    return { pts, t: pointToT(exit), d: pathD(pts), len: polyLen(pts) };
  }).sort((a, b) => a.t - b.t);

  const shards: GenShard[] = radials.map((c, i) => {
    const next = radials[(i + 1) % k];
    const poly = [...c.pts, ...cornersBetween(c.t, next.t), ...[...next.pts].reverse()];
    const clip = `polygon(${poly.map(([x, y]) => `${clamp(x).toFixed(1)}% ${clamp(y).toFixed(1)}%`).join(', ')})`;
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    let nx = cx - ix;
    let ny = cy - iy;
    const L = Math.hypot(nx, ny) || 1;
    nx /= L;
    ny /= L;
    return { clip, dx: `${(nx * 42).toFixed(0)}vw`, dy: `${(ny * 44).toFixed(0)}vh`, rot: `${((Math.random() * 2 - 1) * 48).toFixed(0)}deg` };
  });

  const connectors: GenCrack[] = [];
  for (let i = 0; i < k; i++) {
    if (Math.random() < 0.65) {
      const a = pointAlong(radials[i].pts, 0.4 + Math.random() * 0.4);
      const b = pointAlong(radials[(i + 1) % k].pts, 0.4 + Math.random() * 0.4);
      const pts = jagged(a, b, 3 + Math.floor(Math.random() * 2), 7);
      connectors.push({ d: pathD(pts), len: polyLen(pts), dur: 0.34 + Math.random() * 0.18, delay: 0.34 + Math.random() * 0.26 });
    }
  }
  const cracks: GenCrack[] = [
    ...radials.map((c) => ({ d: c.d, len: c.len, dur: 0.5 + Math.random() * 0.32, delay: Math.random() * 0.14 })),
    ...connectors,
  ];
  return { cracks, shards };
}

// ---- card visuals -----------------------------------------------------------

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

/** Card surface — no glass blur, so the shatter clones match it exactly. */
function CardVisual({ project, onExpand, still }: { project: Project; onExpand?: () => void; still?: boolean }) {
  const { codename, name, tagline, story, accent } = project;
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/12 p-5 sm:p-7" style={{ background: 'linear-gradient(165deg, rgba(13,16,26,0.97), rgba(6,8,13,0.98))' }}>
      <div className="h-[46%] min-h-0 shrink-0">
        <MediaViewport project={project} fill still={still} />
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
            tabIndex={still ? -1 : 0}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-xs uppercase tracking-[0.16em] text-white transition-all duration-300 hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={{ backgroundColor: `${accent}2a`, border: `1px solid ${accent}88`, boxShadow: `0 0 22px ${accent}44` }}
          >
            Expand
            <span aria-hidden>⤢</span>
          </button>
          <CtaRow project={project} />
        </div>
      </div>
    </div>
  );
}

function DeckCard({ project, pos, total, onExpand }: { project: Project; pos: number; total: number; onExpand: () => void }) {
  const { accent } = project;
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
    <div className="absolute inset-0" style={style} aria-hidden={!front}>
      <CardVisual project={project} onExpand={onExpand} still={!front} />
    </div>
  );
}

/** The real card sliced into the generated shards — spread out / converge back. */
function ShatterCard({ project, rect, shards, mode }: { project: Project; rect: Rect; shards: GenShard[]; mode: 'spread' | 'converge' }) {
  const anim = mode === 'spread' ? 'gdg-shard-spread 0.7s ease-in 0.66s both' : 'gdg-shard-converge 0.66s ease-out 0.18s both';
  return (
    <div className="pointer-events-none fixed z-[96]" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} aria-hidden>
      {shards.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{ clipPath: s.clip, filter: `drop-shadow(0 0 10px ${project.accent}55)`, '--dx': s.dx, '--dy': s.dy, '--rot': s.rot, animation: anim } as CSSProperties}
        >
          <CardVisual project={project} still />
        </div>
      ))}
    </div>
  );
}

/** The generated crack lines, drawn (slow-forming) over the card rect or full screen. */
function Cracks({ accent, area, cracks }: { accent: string; area: Rect | 'full'; cracks: GenCrack[] }) {
  const box: { left: number | string; top: number | string; width: number | string; height: number | string } =
    area === 'full' ? { left: 0, top: 0, width: '100vw', height: '100vh' } : area;
  return (
    <svg aria-hidden className="pointer-events-none fixed z-[97] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
      <g style={{ filter: `drop-shadow(0 0 3px ${accent}) drop-shadow(0 0 9px ${accent}aa)` }}>
        {cracks.map((c, i) => (
          <path
            key={i}
            d={c.d}
            fill="none"
            stroke={accent}
            strokeWidth={1.4}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={c.len}
            strokeDashoffset={c.len}
            style={{ '--len': c.len, animation: `gdg-crack-draw ${c.dur}s ease-out ${c.delay}s both` } as CSSProperties}
          />
        ))}
      </g>
    </svg>
  );
}

/** Card→page shatter morph (and back). */
function ProjectMorph({ project, rect, onClose }: { project: Project; rect: Rect; onClose: () => void }) {
  const { codename, name, tagline, story, highlights, tech, accent } = project;
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening');
  const [expanded, setExpanded] = useState(false);
  const [breaking, setBreaking] = useState(false); // close step 2: page shatters in
  const gen = useState<Shatter>(generateShatter)[0]; // same cracks/shards for open AND close
  const dims = useRef({ vw: typeof window !== 'undefined' ? window.innerWidth : 0, vh: typeof window !== 'undefined' ? window.innerHeight : 0 });

  const closedClip = `inset(${rect.top}px ${dims.current.vw - (rect.left + rect.width)}px ${dims.current.vh - (rect.top + rect.height)}px ${rect.left}px round 16px)`;
  const openClip = 'inset(0px 0px 0px 0px round 0px)';

  useEffect(() => {
    const t1 = window.setTimeout(() => setExpanded(true), 700); // cracks form first, THEN the card shatters open
    const t2 = window.setTimeout(() => setPhase('open'), 1650);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const requestClose = useCallback(() => {
    setPhase('closing'); // step 1: the same cracks re-form across the full screen
    window.setTimeout(() => {
      setExpanded(false); // step 2: it shatters — page recedes, pieces converge into the card
      setBreaking(true);
    }, 440);
    window.setTimeout(onClose, 1240);
  }, [onClose]);

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

  const closing = phase === 'closing';

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${name} case study`} className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-[rgba(2,3,7,0.86)] backdrop-blur-lg transition-opacity duration-[420ms]" style={{ opacity: closing && breaking ? 0 : expanded ? 1 : 0.5 }} />

      <div className="absolute inset-0 overflow-y-auto px-5 py-14 sm:py-16" style={{ clipPath: expanded ? openClip : closedClip, transition: 'clip-path 0.6s cubic-bezier(0.7,0,0.2,1)' }}>
        <div className="mx-auto w-full max-w-3xl" style={{ animation: closing ? (breaking ? 'gdg-holo-out 0.42s ease-in both' : 'none') : 'gdg-holo-in 0.6s ease-out 0.75s both' }}>
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
      </div>

      {/* the SAME random cracks form on the card (open) or across the screen (close) */}
      {phase === 'opening' && <Cracks accent={accent} area={rect} cracks={gen.cracks} />}
      {closing && <Cracks accent={accent} area="full" cracks={gen.cracks} />}

      {/* the real card, shattered along the cracks — spreads out (open) / converges back (close) */}
      {(phase === 'opening' || (closing && breaking)) && <ShatterCard project={project} rect={rect} shards={gen.shards} mode={closing ? 'converge' : 'spread'} />}

      <button
        type="button"
        onClick={requestClose}
        className="group fixed left-6 top-6 z-[98] inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.22em] text-white/70 transition-colors duration-300 hover:text-white focus:outline-none focus-visible:text-white sm:left-8 sm:top-8"
      >
        <span aria-hidden className="transition-transform duration-300 group-hover:-translate-x-1">&larr;</span>
        Back to projects
      </button>
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
  const [expand, setExpand] = useState<{ project: Project; rect: Rect } | null>(null);
  const n = projects.length;
  const go = (i: number) => setActive(((i % n) + n) % n);
  const startX = useRef<number | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  const openExpand = (project: Project) => {
    const r = deckRef.current?.getBoundingClientRect();
    if (r) setExpand({ project, rect: { left: r.left, top: r.top, width: r.width, height: r.height } });
  };

  useEffect(() => {
    if (expand) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(active - 1);
      else if (e.key === 'ArrowRight') go(active + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, expand]);

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
          <DeckCard key={p.id} project={p} pos={(((i - active) % n) + n) % n} total={n} onExpand={() => openExpand(p)} />
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

      {expand && <ProjectMorph project={expand.project} rect={expand.rect} onClose={() => setExpand(null)} />}
    </div>
  );
}
