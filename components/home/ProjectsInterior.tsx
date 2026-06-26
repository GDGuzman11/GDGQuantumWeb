'use client';

import { useState } from 'react';
import { projects, type Project } from '@/lib/projects';
import { TECH_ICON_PATHS } from '@/lib/tech-icons';
import { PrimaryLink } from '@/components/home/PrimaryLink';
import type { DiveSection } from '@/lib/dive';

/**
 * The "quantum field" chamber — the cinematic Projects interior. Each project is
 * a glass holo-panel that materialises out of the field (gdg-holo-in) with a
 * living scanline. Everything is laid out (no click-to-expand); the only buttons
 * are the real CTAs. Every panel reserves a 16:9 media viewport for a clip /
 * screenshot / demo (drop a file in /public/projects and point `media` at it;
 * a missing file falls back to a tasteful placeholder, never a broken element).
 *
 * Lazy-loaded by Hero (kept out of First Load). Crawlable copy lives in SeoContent.
 */

/** One tech: brand glyph (accent-glowing) or a text chip when no glyph exists. */
function TechChip({ name, accent }: { name: string; accent: string }) {
  const path = TECH_ICON_PATHS[name];
  return (
    <li className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
      {path ? (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className="shrink-0"
          style={{ color: accent, filter: `drop-shadow(0 0 5px ${accent}88)` }}
        >
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
function MediaViewport({ project }: { project: Project }) {
  const { media, accent, name } = project;
  const [failed, setFailed] = useState(false);
  const showVideo = !!media?.video && !failed;
  const showImage = !!media?.image && !media?.video && !failed;
  const showPlaceholder = !showVideo && !showImage;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
      {showVideo && (
        <video
          className="h-full w-full object-cover"
          src={media!.video}
          poster={media!.poster}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setFailed(true)}
        />
      )}
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="h-full w-full object-cover"
          src={media!.image}
          alt={`${name} preview`}
          onError={() => setFailed(true)}
        />
      )}
      {showPlaceholder && (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            background: `radial-gradient(130% 130% at 30% 20%, ${accent}24, transparent 60%), linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.25))`,
          }}
        >
          <div className="text-center">
            <div
              className="mx-auto mb-2 h-8 w-8 rounded-full border"
              style={{ borderColor: `${accent}66`, boxShadow: `0 0 18px ${accent}55` }}
            />
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">media</p>
          </div>
        </div>
      )}
      {/* living scanline (collapses under reduced-motion via the global guard) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-12 opacity-40"
        style={{ background: `linear-gradient(${accent}00, ${accent}44, ${accent}00)`, animation: 'gdg-scanline 5.5s linear infinite' }}
      />
      {/* viewport corner ticks */}
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
      style={
        muted
          ? { borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.72)' }
          : { borderColor: `${accent}66`, color: accent, boxShadow: `0 0 18px ${accent}33` }
      }
    >
      {label}
      <span aria-hidden>{external ? '↗' : '▸'}</span>
    </a>
  );
}

/** One project panel — media viewport + story + stack + highlights + CTAs. */
function ProjectPanel({ project, index }: { project: Project; index: number }) {
  const { codename, name, tagline, story, highlights, tech, links, accent } = project;
  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-white/12 bg-[rgba(6,8,14,0.55)] p-5 backdrop-blur-md sm:p-7"
      style={{ animation: `gdg-holo-in 0.7s ease-out ${0.1 + index * 0.12}s both`, boxShadow: `0 24px 70px -30px ${accent}55` }}
    >
      <div className="grid gap-5 md:grid-cols-2 md:gap-7">
        <MediaViewport project={project} />
        <div className="flex flex-col">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>
            {codename}
          </p>
          <h3 className="mt-1.5 font-serif text-[clamp(1.5rem,3.4vw,2.1rem)] leading-tight text-ink">{name}</h3>
          <p className="mt-1 font-sans text-sm text-white/60">{tagline}</p>
          <p className="mt-4 font-sans text-[0.92rem] leading-relaxed text-white/80">{story}</p>

          <ul className="mt-4 flex flex-wrap gap-1.5">
            {tech.map((t) => (
              <TechChip key={t} name={t} accent={accent} />
            ))}
          </ul>

          <ul className="mt-4 space-y-1">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 font-mono text-[11px] leading-relaxed text-white/65">
                <span aria-hidden style={{ color: accent }}>
                  ▸
                </span>
                {h}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {project.private ? (
              <span className="rounded-full border border-white/12 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
                Private build
              </span>
            ) : (
              <>
                {links?.live && <Cta href={links.live} label="Live" accent={accent} external />}
                {links?.play && <Cta href={links.play} label="Play" accent={accent} />}
                {links?.source && <Cta href={links.source} label="Source" accent={accent} external muted />}
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectsInterior({ onNavigate }: { onNavigate: (s: Exclude<DiveSection, null>) => void }) {
  return (
    <div className="w-full max-w-4xl">
      <div className="text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.85)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">02 · Projects</p>
        <h2 className="mt-5 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-ink">
          Built from first principles.
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-white/75 sm:text-lg">
          You&rsquo;ve fallen past the core to the quantum scale, where everything is built from the
          ground up. A few of the things I&rsquo;ve built.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {projects.map((p, i) => (
          <ProjectPanel key={p.id} project={p} index={i} />
        ))}
      </div>

      <div className="mt-10 flex items-center justify-center gap-10">
        <PrimaryLink label="Back to About" direction="left" onClick={() => onNavigate('about')} />
        <PrimaryLink label="Continue to Contact" onClick={() => onNavigate('contact')} />
      </div>
    </div>
  );
}
