import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { VerifyClient } from '@/components/auth/VerifyClient';

export const metadata: Metadata = { title: 'Verify email · Starshell', robots: { index: false, follow: false } };

export default function VerifyPage({ params }: { params: { token: string } }) {
  return (
    <AuthShell title="Verify email">
      <VerifyClient token={params.token} />
    </AuthShell>
  );
}
