'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/components/ui/Field';
import { contactSchema, type ContactInput } from '@/lib/schema';
import { submitContact } from '@/app/actions/contact';

/**
 * Contact form (Phase 4) — React Hook Form wired to the SHARED Zod schema
 * (client validation) and submitting to the `submitContact` Server Action
 * (which re-validates, persists, and emails). Success/error render IN PLACE on
 * the panel — no navigation away. Server-side field errors (belt-and-braces)
 * are mapped back onto the fields.
 */
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

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await submitContact(values);

    if (result.ok) {
      reset();
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
      className="mt-10 space-y-6"
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

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
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
