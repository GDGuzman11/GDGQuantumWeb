import { Panel } from './Panel';
import { PanelReveal } from './PanelReveal';

/**
 * Panel 02 — About / philosophy (#about).
 * A single restrained statement, large serif. Content reveals once when the
 * panel becomes active (PanelReveal).
 */
export function About() {
  return (
    <Panel id="about" index="02" ariaLabel="About" theme="dark" transparent>
      <div className="mx-auto w-full max-w-6xl">
        <PanelReveal index={1} className="max-w-2xl">
          <h2
            data-reveal
            className="font-sans text-xs uppercase tracking-[0.28em] text-muted"
          >
            Philosophy
          </h2>

          <p
            data-reveal
            className="mt-8 font-serif text-[clamp(1.75rem,4vw,3rem)] leading-[1.12] tracking-tight text-ink"
          >
            We believe the best systems disappear. They feel inevitable, quiet,
            and exact &mdash; the product of decisions made carefully and
            revisited often.
          </p>

          <p
            data-reveal
            className="mt-8 font-sans text-base leading-relaxed text-muted"
          >
            We work in small, senior teams and ship work we would put our name
            on. Less, but better &mdash; every interaction earns its place;
            nothing is added for its own sake.
          </p>
        </PanelReveal>
      </div>
    </Panel>
  );
}
