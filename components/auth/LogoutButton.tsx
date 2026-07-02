'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/actions/auth';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await logout();
        router.push('/login');
        router.refresh();
      }}
      className={className ?? 'font-pixel text-[8px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white disabled:opacity-50'}
    >
      {busy ? 'Signing out…' : 'Log out'}
    </button>
  );
}
