'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { verifyEmail } from '@/app/actions/auth';

/** Consumes an email-verification token on mount (avoids mutating during render). */
export function VerifyClient({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    verifyEmail(token).then((r) => {
      if (!alive) return;
      if (r.ok) setState('ok');
      else {
        setState('error');
        setMsg(r.error);
      }
    });
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="space-y-4 text-center" role="status" aria-live="polite">
      {state === 'loading' && <p className="font-sans text-sm text-muted">Verifying your email…</p>}
      {state === 'ok' && <p className="font-sans text-sm text-[#aef5c8]">Your email is verified. You&rsquo;re all set, pilot.</p>}
      {state === 'error' && <p className="font-sans text-sm text-red-400">{msg}</p>}
      <Link href="/play" className="inline-block font-pixel text-[10px] uppercase tracking-[0.15em] text-[#7fdfff] hover:underline">
        ▸ To the console
      </Link>
    </div>
  );
}
