'use client';

import { about } from '@/lib/profile';
import { TECH_STACK, type Tech } from '@/lib/tech-stack';
import { PrimaryLink } from '@/components/home/PrimaryLink';
import type { DiveSection } from '@/lib/dive';

/**
 * The "core" chamber — the cinematic About. Three beats:
 *   ① intro — a randomized header (passed in) + the intro paragraph,
 *   ② the stack table — real brand logos grouped Languages / Frameworks / Tools,
 *   ③ closing — the line that reels them in, then the descent link.
 *
 * Lazy-loaded by Hero (the ~45 kB of brand-logo path data lives in this chunk,
 * not in First Load). The crawlable copy is mirrored server-side in SeoContent.
 */

/** One tech: brand logo (glowing, monochrome) or a text chip when no logo. */
function TechBadge({ item }: { item: Tech }) {
  return (
    <li className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
      {item.path ? (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className="shrink-0 text-[#7fdfff] [filter:drop-shadow(0_0_6px_rgba(126,223,255,0.55))]"
        >
          <path d={item.path} />
        </svg>
      ) : (
        <span
          aria-hidden
          className="shrink-0 text-[10px] font-semibold text-[#7fdfff]"
        >
          ▢
        </span>
      )}
      <span className="whitespace-nowrap font-sans text-[0.8rem] text-white/80">
        {item.name}
      </span>
    </li>
  );
}

export function AboutInterior({
  header,
  onNavigate,
}: {
  header: string;
  onNavigate: (s: Exclude<DiveSection, null>) => void;
}) {
  return (
    <div className="max-w-3xl text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.85)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">
        01 · About
      </p>

      {/* ① Intro */}
      <h2 className="mx-auto mt-5 max-w-2xl font-serif text-[clamp(1.8rem,4.4vw,3rem)] leading-[1.1] tracking-tight text-ink">
        {header}
      </h2>
      <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-white/80 sm:text-lg">
        {about.intro}
      </p>

      {/* ② The stack table — grouped Languages / Frameworks / Tools */}
      <div className="mx-auto mt-12 max-w-2xl space-y-5 text-left">
        {TECH_STACK.map((group, gi) => (
          <div
            key={group.label}
            className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 border-t border-white/10 pt-4 sm:gap-x-6"
            style={{ animation: `gdg-holo-in 0.6s ease-out ${0.1 + gi * 0.15}s both` }}
          >
            <div className="flex items-center gap-2 pt-1">
              <span
                aria-hidden
                className="text-base leading-none text-[#7fdfff] [text-shadow:0_0_14px_rgba(126,223,255,0.6)]"
              >
                {group.glyph}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-white/55">
                {group.label}
              </span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <TechBadge key={item.name} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ③ Closing */}
      <p className="mx-auto mt-12 max-w-xl font-serif text-[clamp(1.1rem,2.4vw,1.5rem)] italic leading-relaxed text-white/85">
        {about.closing}
      </p>

      <div className="mt-10 flex items-center justify-center gap-10">
        <PrimaryLink label="Go deeper · Projects" onClick={() => onNavigate('projects')} />
        <PrimaryLink label="Let’s build it · Contact" onClick={() => onNavigate('contact')} />
      </div>
    </div>
  );
}
