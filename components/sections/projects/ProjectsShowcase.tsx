'use client';

import { useCallback, useState } from 'react';
import { useDeck } from '@/components/deck/DeckContext';
import { PanelReveal } from '@/components/sections/PanelReveal';
import { SYSTEMS_LABEL } from '@/lib/site-config';
import { projects } from '@/lib/projects';
import { ProjectCard } from './ProjectCard';
import { ProjectCaseStudy } from './ProjectCaseStudy';

/**
 * Projects section body (lives inside the Projects panel, deck index 1).
 *
 * A header + short description sit atop three terminal cards (same typographic
 * treatment as the previous placeholder blurb). Opening a card mounts the
 * full-screen case study and FREEZES the deck (`lockDeck(true)`) so the overlay
 * traps scroll; closing it restores section scrolling (`lockDeck(false)`).
 *
 * The header/cards use the deck-active reveal via PanelReveal(index=1).
 */

const PROJECTS_INDEX = 1; // Welcome 0 · Projects 1 · Contact 2

export function ProjectsShowcase() {
  const deck = useDeck();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);

  const open = useCallback(
    (id: string, rect: DOMRect) => {
      setOriginRect(rect);
      setExpandedId(id);
      deck?.lockDeck(true);
    },
    [deck],
  );

  const close = useCallback(() => {
    setExpandedId(null);
    setOriginRect(null);
    deck?.lockDeck(false);
  }, [deck]);

  const expanded = projects.find((p) => p.id === expandedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PanelReveal index={PROJECTS_INDEX}>
        {/* Description atop the section — header + small blurb */}
        <div className="max-w-2xl">
          <h2
            data-reveal
            className="font-sans text-xs uppercase tracking-[0.28em] text-muted"
          >
            {SYSTEMS_LABEL}
          </h2>
          <p
            data-reveal
            className="mt-6 font-serif text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.1] tracking-tight text-ink"
          >
            Systems I&rsquo;ve engineered.
          </p>
          <p
            data-reveal
            className="mt-5 font-sans text-base leading-relaxed text-muted"
          >
            Each module below is a live terminal. Open one to dive into the full
            case study &mdash; architecture, demos, and the code behind it.
          </p>
        </div>

        {/* Three terminal cards */}
        <div className="mt-12 grid grid-cols-1 items-start gap-5 md:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              onOpen={open}
            />
          ))}
        </div>
      </PanelReveal>

      {expanded && (
        <ProjectCaseStudy
          project={expanded}
          originRect={originRect}
          onClose={close}
        />
      )}
    </div>
  );
}
