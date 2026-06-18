'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@/components/sections/Turnstile';
import { contactSchema, type ContactInput } from '@/lib/schema';
import { submitContact } from '@/app/actions/contact';

/**
 * Cinematic "transmission" form for the Contact singularity. Same pipeline +
 * security as the original ContactForm (RHF + shared Zod schema → submitContact,
 * with honeypot + time-trap + Turnstile), restyled as an AI transmission console
 * to match the singularity / HELIX theme.
 */

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const fieldClass =
  'w-full rounded-md border border-white/15 bg-white/[0.03] px-4 py-3 font-sans text-sm text-ink placeholder:text-white/30 outline-none transition-colors duration-300 focus:border-[#9fb4d8] focus:bg-white/[0.06]';
const labelClass =
  'mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-white/45';
const errClass = 'mt-1.5 font-mono text-[11px] text-[#ff9a9a]';

export function TransmitForm() {
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

  const honeypotRef = useRef<HTMLInputElement>(null);
  const renderedAt = useRef<number>(Date.now());
  const [token, setToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const handleToken = useCallback((t: string | null) => setToken(t), []);

  const needsToken = Boolean(TURNSTILE_SITE_KEY);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (needsToken && !token) {
      setStatus('error');
      setFormError('Complete the verification to open the channel.');
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
      setTurnstileKey((k) => k + 1);
      renderedAt.current = Date.now();
      setStatus('success');
      return;
    }

    if (result.fieldErrors) {
      for (const [name, message] of Object.entries(result.fieldErrors)) {
        if (message) setError(name as keyof ContactInput, { type: 'server', message });
      }
    }
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
        className="mt-8 rounded-lg border border-[#9fb4d8]/30 bg-white/[0.03] px-6 py-8 text-center"
      >
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#9fb4d8]">
          &gt; SIGNAL RECEIVED
        </p>
        <p className="mt-4 font-serif text-2xl tracking-tight text-ink">
          Your message crossed the horizon.
        </p>
        <p className="mt-3 font-sans text-sm leading-relaxed text-white/65">
          HELIX has it. I&rsquo;ll reply within a couple of working days &mdash;
          watch your inbox for a confirmation.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 font-mono text-[11px] uppercase tracking-[0.24em] text-white/70 transition-colors hover:text-white focus:outline-none focus-visible:text-white"
        >
          [ transmit another ]
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Contact transmission" className="relative mt-8 space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="t-name" className={labelClass}>
            Name
          </label>
          <input
            id="t-name"
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 't-name-err' : undefined}
            className={fieldClass}
            {...register('name')}
          />
          {errors.name?.message ? (
            <p id="t-name-err" role="alert" className={errClass}>
              {errors.name.message}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="t-email" className={labelClass}>
            Email
          </label>
          <input
            id="t-email"
            type="email"
            autoComplete="email"
            placeholder="you@signal.io"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 't-email-err' : undefined}
            className={fieldClass}
            {...register('email')}
          />
          {errors.email?.message ? (
            <p id="t-email-err" role="alert" className={errClass}>
              {errors.email.message}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="t-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="t-message"
          rows={4}
          placeholder="What do you want to build?"
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? 't-message-err' : undefined}
          className={`${fieldClass} resize-none`}
          {...register('message')}
        />
        {errors.message?.message ? (
          <p id="t-message-err" role="alert" className={errClass}>
            {errors.message.message}
          </p>
        ) : null}
      </div>

      {/* Honeypot — off-screen, non-semantic, autofill-ignored. */}
      <div aria-hidden className="absolute -left-[5000px] h-0 w-0 overflow-hidden">
        <label htmlFor="t-extra">Leave this field empty</label>
        <input
          ref={honeypotRef}
          id="t-extra"
          name="contact_extra_field"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore=""
          data-form-type="other"
        />
      </div>

      {TURNSTILE_SITE_KEY ? (
        <Turnstile key={turnstileKey} siteKey={TURNSTILE_SITE_KEY} onToken={handleToken} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <button
          type="submit"
          disabled={isSubmitting || (needsToken && !token)}
          className="inline-flex items-center gap-2 rounded-md border border-[#9fb4d8]/50 bg-[#9fb4d8]/10 px-7 py-3 font-mono text-xs uppercase tracking-[0.24em] text-[#cfe0ff] shadow-[0_0_30px_-8px_rgba(159,180,216,0.7)] transition-all duration-300 hover:bg-[#9fb4d8]/20 hover:shadow-[0_0_40px_-6px_rgba(159,180,216,0.9)] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9fb4d8]"
        >
          {isSubmitting ? 'Transmitting…' : 'Transmit ▸'}
        </button>
        {status === 'error' && formError ? (
          <span role="alert" className="font-mono text-[11px] text-[#ff9a9a]">
            {formError}
          </span>
        ) : null}
      </div>
    </form>
  );
}
