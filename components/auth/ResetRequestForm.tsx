'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Field } from '@/components/ui/Field';
import { Turnstile } from '@/components/sections/Turnstile';
import { authButtonClass } from '@/components/auth/AuthShell';
import { resetRequestSchema, type ResetRequestInput } from '@/lib/schema';
import { requestPasswordReset } from '@/app/actions/auth';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ResetRequestForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetRequestInput>({ resolver: zodResolver(resetRequestSchema), mode: 'onTouched' });
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const handleToken = useCallback((t: string | null) => setToken(t), []);

  const onSubmit = handleSubmit(async (values) => {
    await requestPasswordReset({ ...values, turnstileToken: token ?? undefined });
    setSent(true); // always succeeds (no account enumeration)
  });

  if (sent) {
    return (
      <div role="status" aria-live="polite" className="space-y-4 text-center">
        <p className="font-sans text-sm leading-relaxed text-muted">
          If an account exists for that email, we&rsquo;ve sent a reset link. It expires in 30 minutes.
        </p>
        <Link href="/login" className="inline-block font-pixel text-[10px] uppercase tracking-[0.15em] text-[#7fdfff] hover:underline">
          ◂ Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Reset password" className="space-y-5">
      <Field id="reset-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
      {TURNSTILE_SITE_KEY ? <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={handleToken} /> : null}
      <button type="submit" disabled={isSubmitting} className={authButtonClass}>
        {isSubmitting ? 'Sending…' : 'Send reset link ▸'}
      </button>
    </form>
  );
}
