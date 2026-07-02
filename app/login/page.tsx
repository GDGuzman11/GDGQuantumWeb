import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/user';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign in · Starshell', robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getSessionUser()) redirect('/play');
  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your pilot console and pick up where you left off."
      footer={
        <>
          New pilot?{' '}
          <Link href="/register" className="text-[#7fdfff] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <div className="mt-4 text-center">
        <Link href="/reset" className="font-sans text-xs text-muted transition-colors hover:text-ink">
          Forgot your password?
        </Link>
      </div>
    </AuthShell>
  );
}
