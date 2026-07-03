import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth/jwt';

// Starshell areas require an account. This is a CHEAP signature gate in the Edge;
// the authoritative session check (user exists + sessionVersion) runs server-side.
const PROTECTED_PREFIXES = ['/play', '/arcade', '/profile'];

/**
 * Per-request Content-Security-Policy with a fresh nonce (Phase 5) + the Starshell
 * auth gate.
 *
 * Follows the official Next.js nonce pattern: generate a nonce, set it on the
 * REQUEST headers (so Next.js stamps its own inline bootstrap scripts with it)
 * AND on the response CSP header. `'strict-dynamic'` lets those trusted scripts
 * load the rest (incl. the Turnstile widget), so script-src needs NO
 * `'unsafe-inline'` — satisfying Human Test Gate 5.
 *
 * `style-src` keeps `'unsafe-inline'` (NOT a nonce): the app relies on many
 * inline `style={}` attributes + next/font's injected styles, which nonces
 * don't cover. The gate only forbids unsafe-inline *script*. `'unsafe-eval'` is
 * added in development only (React Refresh needs it); production has neither.
 *
 * Static security headers (HSTS, nosniff, frame-options, etc.) live in
 * next.config.mjs.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Auth gate: Starshell requires login ──────────────────────────────────
  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV !== 'production';

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${
      isDev ? " 'unsafe-eval'" : ''
    }`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' https://challenges.cloudflare.com`,
    `frame-src https://challenges.cloudflare.com`,
    `worker-src 'self' blob:`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Run on documents/actions; skip static assets, the image optimizer, the
    // favicon, and prefetches (no nonce needed there).
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
