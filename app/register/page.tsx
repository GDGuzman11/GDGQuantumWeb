import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/user';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = { title: 'Create account · Starshell', robots: { index: false, follow: false } };

export default async function RegisterPage() {
  if (await getSessionUser()) redirect('/play');
  return (
    <AuthShell
      title="Enlist"
      subtitle="Create a pilot account — your Marine, armory and progress travel with you."
      footer={
        <>
          Already enlisted?{' '}
          <Link href="/login" className="text-[#7fdfff] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
