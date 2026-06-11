import { Panel } from './Panel';
import { PanelReveal } from './PanelReveal';
import { ProjectsSceneStage } from './projects/ProjectsSceneStage';
import { SYSTEMS_LABEL } from '@/lib/site-config';

/**
 * Panel 02 — Projects (#systems).
 *
 * The light-speed warp dive lands here straight from Welcome. For now this is a
 * deliberate PLACEHOLDER: the real project showcase (how the work gets
 * displayed) is still being designed. The section keeps the swappable
 * SYSTEMS_LABEL constant so its name lives in one place.
 *
 * NOTE: the internal id/hash stays `systems` so deep-links and the deck wiring
 * are unchanged; only the visible label reads "Projects".
 */
export function Systems() {
  return (
    <Panel
      id="systems"
      index="02"
      ariaLabel={SYSTEMS_LABEL}
      theme="dark"
      transparent
      layer={<ProjectsSceneStage />}
    >
      <div className="mx-auto w-full max-w-6xl">
        <PanelReveal index={1} className="max-w-2xl">
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
            Selected work, coming soon.
          </p>
          <p
            data-reveal
            className="mt-5 max-w-md font-sans text-base leading-relaxed text-muted"
          >
            A considered showcase of what I&rsquo;ve been building is on its way.
            Check back shortly &mdash; or reach out and I&rsquo;ll walk you
            through it directly.
          </p>

          <div data-reveal className="mt-10 flex items-center gap-3">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
            />
            <span className="font-sans text-xs uppercase tracking-[0.2em] text-muted">
              In progress
            </span>
          </div>
        </PanelReveal>
      </div>
    </Panel>
  );
}
