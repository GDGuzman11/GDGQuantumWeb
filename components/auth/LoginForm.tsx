'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Field } from '@/components/ui/Field';
import { authButtonClass } from '@/components/auth/AuthShell';
import { loginSchema, type LoginInput } from '@/lib/schema';
import { loginUser } from '@/app/actions/auth';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const dest = next && next.startsWith('/') ? next : '/play';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), mode: 'onTouched' });
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const res = await loginUser(values);
    if (res.ok) {
      router.push(dest);
      router.refresh();
      return;
    }
    setFormError(res.error);
  });

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Log in" className="space-y-5">
      <Field id="login-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
      <Field id="login-password" label="Password" type="password" autoComplete="current-password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
      {formError ? (
        <p role="alert" className="font-sans text-xs text-red-400">
          {formError}
        </p>
      ) : null}
      <button type="submit" disabled={isSubmitting} className={authButtonClass}>
        {isSubmitting ? 'Signing in…' : 'Sign in ▸'}
      </button>
    </form>
  );
}
