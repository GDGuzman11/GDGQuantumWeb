'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile widget (explicit render). Mounted by the contact form
 * ONLY when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is configured; otherwise the form
 * skips it entirely (dev). Hands the verification token up via `onToken`
 * (null on expiry/error). The script host is allow-listed in the CSP.
 */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
};

export function Turnstile({ siteKey, onToken }: TurnstileProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(
    typeof window !== 'undefined' && Boolean(window.turnstile),
  );

  useEffect(() => {
    if (!ready || !hostRef.current || !window.turnstile) return;
    if (widgetId.current !== null) return; // render exactly once

    widgetId.current = window.turnstile.render(hostRef.current, {
      sitekey: siteKey,
      theme: 'dark',
      callback: (token: string) => onToken(token),
      'expired-callback': () => onToken(null),
      'error-callback': () => onToken(null),
    });

    const id = widgetId.current;
    return () => {
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* widget already gone */
        }
      }
      widgetId.current = null;
    };
  }, [ready, siteKey, onToken]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div ref={hostRef} className="min-h-[65px]" />
    </>
  );
}
