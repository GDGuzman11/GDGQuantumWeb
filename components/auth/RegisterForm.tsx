'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/ui/Field';
import { Turnstile } from '@/components/sections/Turnstile';
import { authButtonClass } from '@/components/auth/AuthShell';
import { registerSchema, type RegisterInput } from '@/lib/schema';
import { registerUser } from '@/app/actions/auth';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), mode: 'onTouched' });
  const [formError, setFormError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const handleToken = useCallback((t: string | null) => setToken(t), []);
  const needsToken = Boolean(TURNSTILE_SITE_KEY);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (needsToken && !token) {
      setFormError('Please complete the verification check.');
      return;
    }
    const res = await registerUser({ ...values, turnstileToken: token ?? undefined });
    if (res.ok) {
      router.push('/play');
      router.refresh();
      return;
    }
    if (res.fieldErrors) {
      for (const [name, message] of Object.entries(res.fieldErrors)) {
        if (message) setError(name as keyof RegisterInput, { type: 'server', message });
      }
    }
    setToken(null);
    setTurnstileKey((k) => k + 1);
    setFormError(res.error);
  });

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Create account" className="space-y-5">
      <Field id="reg-name" label="Call sign" autoComplete="nickname" placeholder="Your pilot name" error={errors.displayName?.message} {...register('displayName')} />
      <Field id="reg-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
      <Field id="reg-password" label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" error={errors.password?.message} {...register('password')} />
      {TURNSTILE_SITE_KEY ? <Turnstile key={turnstileKey} siteKey={TURNSTILE_SITE_KEY} onToken={handleToken} /> : null}
      {formError ? (
        <p role="alert" className="font-sans text-xs text-red-400">
          {formError}
        </p>
      ) : null}
      <button type="submit" disabled={isSubmitting || (needsToken && !token)} className={authButtonClass}>
        {isSubmitting ? 'Enlisting…' : 'Create account ▸'}
      </button>
    </form>
  );
}
