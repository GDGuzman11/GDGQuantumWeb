import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetRequestForm } from '@/components/auth/ResetRequestForm';

export const metadata: Metadata = { title: 'Reset password · Starshell', robots: { index: false, follow: false } };

export default function ResetRequestPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we'll send a link to set a new password."
      footer={
        <Link href="/login" className="text-[#7fdfff] hover:underline">
          ◂ Back to sign in
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthShell>
  );
}
