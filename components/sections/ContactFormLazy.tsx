'use client';

import dynamic from 'next/dynamic';

/**
 * Lazy boundary for the Contact form (Phase 6 code-split).
 *
 * React Hook Form + Zod + the Resend-bound server action import graph used to
 * sit in the route's First Load JS (~+27 kB). The Contact panel is the third
 * panel of the deck — never visible on first paint — so the form is split into
 * its own async chunk via `dynamic(ssr:false)` and only fetched in the browser.
 * `ssr:false` requires a client component, hence this thin wrapper (the Contact
 * section itself is a server component).
 *
 * A lightweight skeleton holds the layout while the chunk loads so there is no
 * height jump. It is `aria-hidden` (the real labelled form replaces it).
 */
const ContactForm = dynamic(
  () => import('./ContactForm').then((m) => m.ContactForm),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden className="mt-10 space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="h-12 border-b border-hairline" />
          <div className="h-12 border-b border-hairline" />
        </div>
        <div className="h-28 border-b border-hairline" />
        <div className="h-11 w-40 border border-hairline" />
      </div>
    ),
  },
);

export function ContactFormLazy() {
  return <ContactForm />;
}
