import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/user';
import { getProgress } from '@/app/actions/progress';
import { ProfileClient } from '@/components/profile/ProfileClient';

export const metadata: Metadata = { title: 'Pilot Profile · Starshell', robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/profile');
  const progress = await getProgress();
  const memberSince = user.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

  return (
    <ProfileClient
      displayName={user.displayName}
      verified={Boolean(user.emailVerified)}
      memberSince={memberSince}
      marine={progress?.marine ?? null}
      arsenal={progress?.arsenal ?? null}
      astro={progress?.astro ?? 0}
      bestLevel={progress?.bestLevel ?? 0}
    />
  );
}
