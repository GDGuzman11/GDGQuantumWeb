import { Panel } from './Panel';
import { PanelReveal } from './PanelReveal';
import { ContactForm } from './ContactForm';
import { siteConfig } from '@/lib/site-config';

/**
 * Panel 03 — Contact + footer (#contact).
 * The intro + form sit in a single column; the footer pins to the bottom.
 *
 * Phase 4 wires the real submit pipeline: the `ContactForm` client component
 * uses React Hook Form + the shared Zod schema and submits to the
 * `submitContact` Server Action (validate → persist → email). The spam/security
 * layer is Phase 5.
 */
export function Contact() {
  const year = 2026;

  return (
    <Panel id="contact" index="03" ariaLabel="Contact" className="justify-between" theme="dark" transparent>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center">
        <PanelReveal index={2} className="w-full max-w-2xl">
          <div data-reveal>
            <h2 className="font-sans text-xs uppercase tracking-[0.28em] text-muted">
              Contact
            </h2>
            <p className="mt-6 font-serif text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.1] tracking-tight text-ink">
              Let&rsquo;s build something considered.
            </p>
            <p className="mt-5 font-sans text-base leading-relaxed text-muted">
              Tell us about the system you have in mind. We read every message
              and reply within a couple of working days.
            </p>
          </div>

          {/* Live form (Phase 4): RHF + shared Zod schema → submitContact action. */}
          <div data-reveal>
            <ContactForm />
          </div>
        </PanelReveal>
      </div>

      {/* Footer */}
      <footer className="mx-auto mt-12 flex w-full max-w-6xl flex-col gap-4 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-muted">
          {siteConfig.brand}
        </p>
        <p className="font-sans text-xs text-muted">
          &copy; {year} {siteConfig.brand}. All rights reserved.
        </p>
      </footer>
    </Panel>
  );
}
