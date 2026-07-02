import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetForm } from '@/components/auth/ResetForm';

export const metadata: Metadata = { title: 'Set new password · Starshell', robots: { index: false, follow: false } };

export default function ResetTokenPage({ params }: { params: { token: string } }) {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account.">
      <ResetForm token={params.token} />
    </AuthShell>
  );
}
