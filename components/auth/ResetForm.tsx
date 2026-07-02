'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Field } from '@/components/ui/Field';
import { authButtonClass } from '@/components/auth/AuthShell';
import { resetPassword } from '@/app/actions/auth';

// Client-only shape (the token comes from the route, not the form).
const formSchema = z.object({ password: z.string().min(8, 'Password must be at least 8 characters.').max(200) });
type FormInput = z.infer<typeof formSchema>;

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(formSchema), mode: 'onTouched' });
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    const res = await resetPassword({ token, password });
    if (res.ok) {
      router.push('/play');
      router.refresh();
      return;
    }
    setFormError(res.error);
  });

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Choose a new password" className="space-y-5">
      <Field id="new-password" label="New password" type="password" autoComplete="new-password" placeholder="At least 8 characters" error={errors.password?.message} {...register('password')} />
      {formError ? (
        <p role="alert" className="font-sans text-xs text-red-400">
          {formError}
        </p>
      ) : null}
      <button type="submit" disabled={isSubmitting} className={authButtonClass}>
        {isSubmitting ? 'Updating…' : 'Set new password ▸'}
      </button>
    </form>
  );
}
