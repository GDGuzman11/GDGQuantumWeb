import 'server-only';
import { cookies } from 'next/headers';
import { signSession, verifySessionToken, SESSION_COOKIE, type SessionPayload } from './jwt';

/**
 * Cookie-backed session helpers for Server Actions + Server Components. The
 * session token lives in an httpOnly · Secure · SameSite=Lax cookie. `setSession`
 * may only be called from a Server Action / Route Handler (cookie writes during
 * a Server Component render throw). Reads (`getSession`) work anywhere.
 */

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function setSession(userId: string, sessionVersion: number): Promise<void> {
  const token = await signSession(userId, sessionVersion);
  cookies().set(SESSION_COOKIE, token, cookieOpts(MAX_AGE));
}

export function clearSession(): void {
  cookies().set(SESSION_COOKIE, '', cookieOpts(0));
}

/** Signature-only session payload (no DB). Use getSessionUser for authoritative checks. */
export async function getSession(): Promise<SessionPayload | null> {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
}
