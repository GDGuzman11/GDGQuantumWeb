import { Panel } from './Panel';
import { PanelReveal } from './PanelReveal';
import { Field } from '@/components/ui/Field';
import { siteConfig } from '@/lib/site-config';

/**
 * Panel 04 — Contact + footer (#contact).
 * The intro + form sit in a single column; the footer pins to the bottom.
 *
 * Phase 1 ships a VISUAL-ONLY form layout (no Server Action, no validation).
 * The real submit pipeline (shared Zod + React Hook Form + Server Action) is
 * Phase 4; the spam/security layer is Phase 5. The submit button is disabled
 * here so the static form can't pretend to work.
 */
export function Contact() {
  const year = 2026;

  return (
    <Panel id="contact" index="04" ariaLabel="Contact" className="justify-between" theme="dark" transparent>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center">
        <PanelReveal index={3} className="w-full max-w-2xl">
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

          {/* Form (visual only — wired up in Phase 4). No onSubmit here: the
              submit control is disabled this phase, so the form cannot submit. */}
          <form data-reveal aria-label="Contact form" className="mt-10 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field
                id="contact-name"
                name="name"
                label="Name"
                autoComplete="name"
                placeholder="Your name"
              />
              <Field
                id="contact-email"
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                placeholder="you@studio.com"
              />
            </div>

            <Field
              as="textarea"
              id="contact-message"
              name="message"
              label="Message"
              rows={4}
              placeholder="What are you building?"
            />

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled
                aria-disabled="true"
                className="inline-flex items-center gap-2 border border-hairline px-7 py-3 font-sans text-xs uppercase tracking-[0.18em] text-ink/60 transition-colors duration-300 ease-out disabled:cursor-not-allowed"
              >
                Send message
              </button>
              <span className="font-sans text-xs text-muted">
                Form activates in a later release.
              </span>
            </div>
          </form>
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
