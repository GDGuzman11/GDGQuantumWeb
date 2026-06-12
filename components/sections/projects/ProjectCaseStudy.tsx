'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import type { Project } from '@/lib/projects';

/**
 * Full-screen case study for one project. Mounts when a card is opened and owns
 * its own open/close choreography:
 *
 *  - OPEN: a cinematic zoom out of the originating card's rect to full-viewport
 *    (GSAP scales the surface from the card's box to the whole screen while the
 *    content + backdrop fade in).
 *  - SCROLL TRAP: the overlay is the scroll container; the parent has already
 *    frozen the deck (`lockDeck(true)`), so wheel/touch/keys don't move sections.
 *  - CLOSE: Esc key OR the [ ESCAPE_SYSTEM ] button reverse the zoom + fade out,
 *    then call `onClose` (the parent unmounts us and calls `lockDeck(false)`).
 *
 * Reduced-motion: no zoom — instant fade in/out.
 *
 * Layout stacks to a single column on mobile (it's a normal vertical-scroll
 * document inside the overlay).
 */

type ProjectCaseStudyProps = {
  project: Project;
  /** The card's on-screen box at click time — the zoom origin. */
  originRect: DOMRect | null;
  /** Called AFTER the close animation completes. */
  onClose: () => void;
};

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function ProjectCaseStudy({
  project,
  originRect,
  onClose,
}: ProjectCaseStudyProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);

  // ---- Open animation -------------------------------------------------------
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const backdrop = backdropRef.current;
    const content = contentRef.current;
    if (!surface) return;

    if (reducedMotion() || !originRect) {
      gsap.set([surface, backdrop, content], { autoAlpha: 1, clearProps: 'transform' });
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tl = gsap.timeline();
    tl.fromTo(
      surface,
      {
        x: originRect.left,
        y: originRect.top,
        scaleX: originRect.width / vw,
        scaleY: originRect.height / vh,
        transformOrigin: '0 0',
        autoAlpha: 1,
      },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.72, ease: 'power3.inOut' },
    );
    tl.fromTo(
      backdrop,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.5, ease: 'power2.out' },
      0,
    );
    tl.fromTo(
      content,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      0.28,
    );
    return () => {
      tl.kill();
    };
  }, [originRect]);

  // ---- Close (reverse zoom → onClose) ---------------------------------------
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const surface = surfaceRef.current;
    const backdrop = backdropRef.current;
    const content = contentRef.current;

    if (reducedMotion() || !originRect || !surface) {
      onClose();
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to(content, { autoAlpha: 0, y: 16, duration: 0.28, ease: 'power2.in' }, 0);
    tl.to(
      surface,
      {
        x: originRect.left,
        y: originRect.top,
        scaleX: originRect.width / vw,
        scaleY: originRect.height / vh,
        transformOrigin: '0 0',
        autoAlpha: 0,
        duration: 0.6,
        ease: 'power3.inOut',
      },
      0.08,
    );
    tl.to(backdrop, { autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0.1);
  }, [originRect, onClose]);

  // Esc key + initial focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${project.name} case study`}
      className="fixed inset-0 z-[90]"
    >
      {/* Dimmed backdrop behind the surface */}
      <div
        ref={backdropRef}
        aria-hidden
        className="absolute inset-0 bg-[rgba(2,3,6,0.82)] backdrop-blur-sm"
      />

      {/* The zooming surface = the scroll container (the trap) */}
      <div
        ref={surfaceRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-[rgba(6,8,12,0.96)]"
      >
        {/* Tech grid wash */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(126,223,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(126,223,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div ref={contentRef} className="relative mx-auto w-full max-w-6xl px-6 py-16 sm:px-10 lg:py-20">
          <EscapeButton ref={closeBtnRef} onClick={requestClose} />
          <CommandCenter project={project} />
          <TacticalBrief project={project} />
          <VisualMatrix project={project} />
          <LogTerminal project={project} />
          <DeploymentCore project={project} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ Escape */

const EscapeButton = forwardRef<HTMLButtonElement, { onClick: () => void }>(
  function EscapeButton({ onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="fixed right-5 top-5 z-10 rounded-md border border-[rgba(126,223,255,0.45)] bg-[rgba(6,8,12,0.7)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#7fdfff] shadow-[0_0_24px_-6px_rgba(110,168,255,0.6)] backdrop-blur transition-colors duration-200 hover:bg-[rgba(126,223,255,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7fdfff] sm:right-8 sm:top-8"
      >
        [ ⤺ ESCAPE_SYSTEM ]
      </button>
    );
  },
);

/* --------------------------------------------------- A. Command Center */

function CommandCenter({ project }: { project: Project }) {
  return (
    <header className="border-b border-hairline pb-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#7fdfff]">
        {project.codename}
      </p>
      <h2 className="mt-4 font-serif text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] tracking-tight text-ink">
        {project.name}
      </h2>
      <p className="mt-5 max-w-2xl font-sans text-base leading-relaxed text-muted">
        {project.tagline}
      </p>

      <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-hairline px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted"
            >
              {t}
            </span>
          ))}
        </div>
        <LatencyDashboard baseline={project.latencyMs} />
      </div>
    </header>
  );
}

function LatencyDashboard({ baseline }: { baseline: number }) {
  const [ms, setMs] = useState(baseline);
  useEffect(() => {
    if (reducedMotion()) return;
    const id = window.setInterval(() => {
      const jitter = (Math.random() - 0.5) * baseline * 0.6;
      setMs(Math.max(1, Math.round(baseline + jitter)));
    }, 700);
    return () => window.clearInterval(id);
  }, [baseline]);

  const pct = Math.min(100, (ms / (baseline * 2)) * 100);
  return (
    <div className="min-w-[200px] rounded-md border border-hairline bg-[rgba(4,6,10,0.6)] p-3 font-mono">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-muted">
        <span>LATENCY</span>
        <span className="flex items-center gap-1.5 text-[#7fdfff]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#7fdfff]" />
          LIVE
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1 text-ink">
        <span className="text-2xl tabular-nums">{ms}</span>
        <span className="text-xs text-muted">ms</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[rgba(126,223,255,0.12)]">
        <div
          className="h-full rounded-full bg-[#7fdfff] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------- B. Tactical Brief */

function TacticalBrief({ project }: { project: Project }) {
  return (
    <section className="grid gap-8 py-12 md:grid-cols-2">
      <BriefBlock label="goals" lines={project.brief.goals} />
      <BriefBlock label="architecture" lines={project.brief.architecture} />
    </section>
  );
}

function BriefBlock({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-hairline bg-[rgba(4,6,10,0.5)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        {'// '}
        {label}
      </p>
      <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.9] text-ink/90">
        <span className="text-muted">{'{'}</span>
        {'\n'}
        <span className="text-[#7fdfff]">{`  "${label}"`}</span>
        <span className="text-muted">: [</span>
        {'\n'}
        {lines.map((l, i) => (
          <span key={i}>
            {`    ${l}${i < lines.length - 1 ? ',' : ''}`}
            {'\n'}
          </span>
        ))}
        <span className="text-muted">{'  ]'}</span>
        {'\n'}
        <span className="text-muted">{'}'}</span>
      </pre>
    </div>
  );
}

/* ------------------------------------------------- C. Visual Neural Matrix */

function VisualMatrix({ project }: { project: Project }) {
  return (
    <section className="py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        {'// visual_neural_matrix'}
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-hairline bg-[rgba(4,6,10,0.6)]">
        <VideoFrame
          src={project.media.video}
          poster={project.media.poster}
          label={project.codename}
        />
      </div>
      <Gallery items={project.media.gallery ?? []} />
    </section>
  );
}

function VideoFrame({
  src,
  poster,
  label,
}: {
  src?: string;
  poster?: string;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  const showVideo = Boolean(src) && !failed;

  return (
    <div className="relative aspect-video w-full">
      {showVideo ? (
        <video
          className="h-full w-full object-cover"
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setFailed(true)}
        />
      ) : (
        <MediaPlaceholder label={`${label} // FEED OFFLINE`} />
      )}
    </div>
  );
}

function Gallery({ items }: { items: string[] }) {
  // Always render three tiles; real images upgrade in place, missing ones fall
  // back to a placeholder (so a not-yet-committed asset never shows broken).
  const tiles = items.length ? items : ['', '', ''];
  return (
    <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [perspective:1000px]">
      {tiles.map((src, i) => (
        <GalleryTile key={i} src={src} index={i} />
      ))}
    </div>
  );
}

function GalleryTile({ src, index }: { src: string; index: number }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const show = Boolean(src) && !failed;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia('(pointer: coarse)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    el.style.transform = `rotateY(${px * 10}deg)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className="relative aspect-[4/3] w-56 shrink-0 overflow-hidden rounded-lg border border-hairline bg-[rgba(4,6,10,0.6)] transition-transform duration-300 ease-out [transform-style:preserve-3d]"
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <MediaPlaceholder label={`FRAME_${String(index + 1).padStart(2, '0')}`} small />
      )}
    </div>
  );
}

function MediaPlaceholder({ label, small }: { label: string; small?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(110,168,255,0.16),transparent_70%)]">
      <span
        className={`font-mono uppercase tracking-[0.22em] text-muted ${
          small ? 'text-[9px]' : 'text-[11px]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------- D. Log Terminal */

function LogTerminal({ project }: { project: Project }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(project.snippet.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <section className="py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        {'// log_terminal'}
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-hairline bg-[rgba(2,3,6,0.85)]">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,95,86,0.7)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,189,46,0.7)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgba(39,201,63,0.7)]" />
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              session.{project.snippet.lang}
            </span>
          </div>
          <button
            type="button"
            onClick={copy}
            className="rounded border border-hairline px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7fdfff] transition-colors hover:bg-[rgba(126,223,255,0.12)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#7fdfff]"
          >
            {copied ? 'COPIED ✓' : 'COPY'}
          </button>
        </div>
        <pre className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-[1.8] text-ink/90">
          <span className="text-[#7fdfff]">$</span> cat snippet.{project.snippet.lang}
          {'\n'}
          {project.snippet.code}
          {'\n'}
          <span className="text-[#7fdfff]">$</span> <span className="text-muted">_</span>
        </pre>
      </div>
    </section>
  );
}

/* ----------------------------------------------------- E. Deployment Core */

function DeploymentCore({ project }: { project: Project }) {
  return (
    <section className="flex flex-col gap-4 border-t border-hairline py-12 sm:flex-row">
      <NeonLink href={project.liveUrl} primary>
        [ LAUNCH_LIVE_DEMO&nbsp;→ ]
      </NeonLink>
      <NeonLink href={project.sourceUrl}>[ INSPECT_SOURCE_CODE ]</NeonLink>
    </section>
  );
}

function NeonLink({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const external = href !== '#';
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={[
        'inline-flex items-center justify-center rounded-md px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7fdfff]',
        primary
          ? 'bg-[#6ea8ff] text-[#06070a] shadow-[0_0_30px_-6px_rgba(110,168,255,0.8)] hover:shadow-[0_0_40px_-4px_rgba(110,168,255,1)]'
          : 'border border-[rgba(126,223,255,0.45)] text-[#7fdfff] hover:bg-[rgba(126,223,255,0.12)]',
      ].join(' ')}
    >
      {children}
    </a>
  );
}
