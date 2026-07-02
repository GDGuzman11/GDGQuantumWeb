import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Server-only security primitives for the contact pipeline (Phase 5).
 *
 * Design principle (mirrors the Phase 4 email helper): every external control
 * DEGRADES GRACEFULLY when its env keys are absent (so local dev works with no
 * Turnstile / Upstash configured), ENFORCES strictly when configured, and FAILS
 * CLOSED on error when configured. `import 'server-only'` guarantees none of
 * this — or the secrets it reads — can ever be pulled into a client bundle.
 */

const IP_HASH_SALT = process.env.IP_HASH_SALT ?? '';

/** Read the caller's IP (best-effort, proxy-aware) + user-agent from headers. */
export function getClientInfo(): { ip: string; userAgent: string } {
  const h = headers();
  const fwd = h.get('x-forwarded-for');
  const ip =
    (fwd ? fwd.split(',')[0]?.trim() : '') || h.get('x-real-ip') || 'unknown';
  const userAgent = h.get('user-agent') ?? 'unknown';
  return { ip, userAgent };
}

/**
 * Salted SHA-256 of an IP. Used for the rate-limit key AND the value stored at
 * rest (`ContactSubmission.ipHash`) — the raw IP is never persisted. The salt
 * defends against rainbow tables over the small IPv4 space.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(`${IP_HASH_SALT}:${ip}`).digest('hex');
}

/** A URL-safe random token (emailed for verify/reset). Only its SHA-256 is stored. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex of a value — used to store verify/reset tokens at rest. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Drop ASCII control chars (incl. CR/LF/tab) and DEL from a value bound into a
 * mail header (keeps spaces, hyphens, normal text). Closes header-injection via
 * the name. Implemented as a char-code filter to avoid control bytes in source.
 */
export function stripHeaderChars(value: string): string {
  let out = '';
  for (const ch of value) {
    const c = ch.charCodeAt(0);
    if (c >= 0x20 && c !== 0x7f) out += ch;
  }
  return out.trim();
}

// ---- Rate limiting (Upstash sliding window) --------------------------------

const hasUpstash =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

// Lazily created singleton so a cold action invocation reuses it.
let limiter: Ratelimit | null = null;
function getLimiter(): Ratelimit | null {
  if (!hasUpstash) return null;
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      // ~4 submissions per 10 minutes per IP (CLAUDE.md §3 Phase 5: 3–5/10min).
      limiter: Ratelimit.slidingWindow(4, '10 m'),
      prefix: 'gdg:contact',
      analytics: false,
    });
  }
  return limiter;
}

/**
 * Returns true when the request is ALLOWED. Skips (allows) when Upstash is not
 * configured (dev). FAILS CLOSED (denies) when configured but the call throws,
 * so an outage can't open the floodgates.
 */
export async function checkRateLimit(key: string): Promise<boolean> {
  const rl = getLimiter();
  if (!rl) return true; // not configured → allow (dev)
  try {
    const { success } = await rl.limit(key);
    return success;
  } catch (err) {
    console.error('[security] rate-limit check failed — failing closed:', err);
    return false; // configured but errored → deny
  }
}

// Auth limiter — a little more headroom than the contact form (mistyped
// passwords, etc.): ~10 attempts / 5 min per key.
let authLimiter: Ratelimit | null = null;
function getAuthLimiter(): Ratelimit | null {
  if (!hasUpstash) return null;
  if (!authLimiter) {
    authLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '5 m'),
      prefix: 'gdg:auth',
      analytics: false,
    });
  }
  return authLimiter;
}

/** Rate-limit auth attempts (login/register/reset). Same graceful/fail-closed rules. */
export async function checkAuthRateLimit(key: string): Promise<boolean> {
  const rl = getAuthLimiter();
  if (!rl) return true;
  try {
    const { success } = await rl.limit(key);
    return success;
  } catch (err) {
    console.error('[security] auth rate-limit check failed — failing closed:', err);
    return false;
  }
}

// ---- Cloudflare Turnstile --------------------------------------------------

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify a Turnstile token server-side. Skips (passes) when no secret is
 * configured (dev). When configured: a missing token or a non-success response
 * fails. Network errors fail CLOSED.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // not configured → pass (dev)
  if (!token) return false;
  try {
    const body = new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
    });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[security] Turnstile verify failed — failing closed:', err);
    return false;
  }
}
