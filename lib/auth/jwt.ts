import { SignJWT, jwtVerify } from 'jose';

/**
 * Session JWT — the ONLY auth primitive that runs in the Edge middleware, so it
 * must stay dependency-light (jose is edge-safe; no next/headers, no Prisma here).
 * HS256 over AUTH_SECRET. The token carries the user id (`sub`) + `v` (the user's
 * sessionVersion) so a password reset / logout-all can invalidate old tokens.
 */

const isDev = process.env.NODE_ENV !== 'production';
// AUTH_SECRET is required in production; a fixed dev fallback keeps local dev working.
const secretStr = process.env.AUTH_SECRET || (isDev ? 'dev-insecure-auth-secret-change-me' : '');
const secret = new TextEncoder().encode(secretStr);
const ALG = 'HS256';

export interface SessionPayload {
  sub: string; // user id
  v: number; // sessionVersion at issue time
}

export async function signSession(userId: string, sessionVersion: number): Promise<string> {
  return new SignJWT({ v: sessionVersion })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

/** Verify signature + expiry only (no DB). Returns the payload or null. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    if (typeof payload.sub === 'string' && typeof payload.v === 'number') {
      return { sub: payload.sub, v: payload.v };
    }
    return null;
  } catch {
    return null;
  }
}

/** True when a session-signing secret is available (always in dev via the fallback;
 *  in production only when AUTH_SECRET is set). Guards against issuing/verifying
 *  tokens with a zero-length key, which jose rejects. */
export function authSecretConfigured(): boolean {
  return secretStr.length > 0;
}

export const SESSION_COOKIE = 'ss_session';
