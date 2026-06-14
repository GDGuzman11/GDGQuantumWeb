'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/components/ui/Field';
import { Turnstile } from '@/components/sections/Turnstile';
import { contactSchema, type ContactInput } from '@/lib/schema';
import { submitContact } from '@/app/actions/contact';

/**
 * Contact form — React Hook Form wired to the SHARED Zod schema (client
 * validation) and submitting to the `submitContact` Server Action (which
 * re-validates, runs the security gate, persists, and emails). Success/error
 * render IN PLACE — no navigation away.
 *
 * Phase 5 abuse defenses layered on top of the content fields:
 *  - honeypot: a hidden `website` input real users never fill;
 *  - time-trap: the mount timestamp, sent so the server can reject instant bots;
 *  - Cloudflare Turnstile: rendered only when the public site key is set; its
 *    token is sent and verified server-side.
 * None are part of the shared content schema — they ride alongside the payload.
 */

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    mode: 'onTouched',
  });

  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  // Abuse defenses.
  const honeypotRef = useRef<HTMLInputElement>(null);
  const renderedAt = useRef<number>(Date.now());
  const [token, setToken] = useState<string | null>(null);
  // Bumping this remounts the Turnstile widget to get a fresh token after a send.
  const [turnstileKey, setTurnstileKey] = useState(0);
  const handleToken = useCallback((t: string | null) => setToken(t), []);

  const needsToken = Boolean(TURNSTILE_SITE_KEY);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    if (needsToken && !token) {
      setStatus('error');
      setFormError('Please complete the verification check.');
      return;
    }

    const result = await submitContact({
      ...values,
      extraField: honeypotRef.current?.value ?? '',
      renderedAt: renderedAt.current,
      turnstileToken: token ?? undefined,
    });

    if (result.ok) {
      reset();
      setToken(null);
      setTurnstileKey((k) => k + 1); // fresh widget for the next send
      renderedAt.current = Date.now();
      setStatus('success');
      return;
    }

    // Map any server-side field errors back onto the inputs.
    if (result.fieldErrors) {
      for (const [name, message] of Object.entries(result.fieldErrors)) {
        if (message) {
          setError(name as keyof ContactInput, { type: 'server', message });
        }
      }
    }
    // A new token is single-use; force a fresh challenge after a failed attempt.
    setToken(null);
    setTurnstileKey((k) => k + 1);
    setStatus('error');
    setFormError(result.error);
  });

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-10 border-y border-hairline py-10"
      >
        <p className="font-serif text-2xl tracking-tight text-ink">
          Thank you &mdash; your message is on its way.
        </p>
        <p className="mt-3 font-sans text-base leading-relaxed text-muted">
          We&rsquo;ll reply within a couple of working days. Keep an eye on your
          inbox for a confirmation.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 inline-flex items-center gap-2 border border-hairline px-7 py-3 font-sans text-xs uppercase tracking-[0.18em] text-ink transition-colors duration-300 ease-out hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label="Contact form"
      className="relative mt-10 space-y-6"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          id="contact-name"
          label="Name"
          autoComplete="name"
          placeholder="Your name"
          error={errors.name?.message}
          {...register('name')}
        />
        <Field
          id="contact-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <Field
        as="textarea"
        id="contact-message"
        label="Message"
        rows={4}
        placeholder="What are you building?"
        error={errors.message?.message}
        {...register('message')}
      />

      {/* Honeypot — visually hidden, off the tab order; naive bots fill it,
          humans don't. Off-screen (not display:none) so bots still see it.
          Uses a NON-semantic name/label + password-manager ignore hints so
          browser autofill (Edge/Chrome address profiles, 1Password, LastPass)
          does NOT fill it — a "website"-named field was being autofilled and
          silently rejecting real users. */}
      <div aria-hidden className="absolute -left-[5000px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-extra-field">Leave this field empty</label>
        <input
          ref={honeypotRef}
          id="contact-extra-field"
          name="contact_extra_field"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore=""
          data-form-type="other"
        />
      </div>

      {/* Cloudflare Turnstile — only when configured (skipped in dev). */}
      {TURNSTILE_SITE_KEY ? (
        <Turnstile
          key={turnstileKey}
          siteKey={TURNSTILE_SITE_KEY}
          onToken={handleToken}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting || (needsToken && !token)}
          className="inline-flex items-center gap-2 border border-hairline px-7 py-3 font-sans text-xs uppercase tracking-[0.18em] text-ink transition-colors duration-300 ease-out hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
        >
          {isSubmitting ? 'Sending…' : 'Send message'}
        </button>
        {status === 'error' && formError ? (
          <span role="alert" className="font-sans text-xs text-red-400">
            {formError}
          </span>
        ) : null}
      </div>
    </form>
  );
}
