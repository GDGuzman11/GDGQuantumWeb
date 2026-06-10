import { Panel } from './Panel';
import { PanelReveal } from './PanelReveal';
import { SYSTEMS_LABEL } from '@/lib/site-config';

/**
 * Panel 03 — Systems / the "techy" panel (#systems).
 * What GDG builds. Uses SYSTEMS_LABEL so the section name is swappable in one
 * place. A single-column capability list.
 */

const capabilities = [
  {
    no: '01',
    title: 'Product engineering',
    body: 'Type-safe web applications built for longevity — measured, instrumented, and maintainable.',
  },
  {
    no: '02',
    title: 'Design systems',
    body: 'Tokens, primitives, and motion language that keep a product coherent as it scales.',
  },
  {
    no: '03',
    title: 'Interface & motion',
    body: 'Considered interaction and restrained animation that earns attention without demanding it.',
  },
  {
    no: '04',
    title: 'Platform & performance',
    body: 'Fast, accessible, secure delivery — Core Web Vitals and resilience treated as features.',
  },
] as const;

export function Systems() {
  return (
    <Panel id="systems" index="03" ariaLabel={SYSTEMS_LABEL} theme="dark" transparent>
      <div className="mx-auto w-full max-w-6xl">
        <PanelReveal index={2} className="max-w-2xl">
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
            What we build.
          </p>
          <p
            data-reveal
            className="mt-5 max-w-md font-sans text-base leading-relaxed text-muted"
          >
            Four disciplines, applied as one system — from first principles to
            production.
          </p>

          <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
            {capabilities.map((cap) => (
              <li key={cap.no} data-reveal className="flex gap-5 py-5">
                <span className="font-sans text-xs tracking-[0.3em] text-accent">
                  {cap.no}
                </span>
                <div>
                  <h3 className="font-serif text-xl tracking-tight text-ink">
                    {cap.title}
                  </h3>
                  <p className="mt-1.5 font-sans text-sm leading-relaxed text-muted">
                    {cap.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </PanelReveal>
      </div>
    </Panel>
  );
}
