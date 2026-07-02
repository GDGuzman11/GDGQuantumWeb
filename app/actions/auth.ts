'use server';

import { registerSchema, loginSchema, resetRequestSchema, resetSchema, type AuthFieldErrors } from '@/lib/schema';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { authSecretConfigured } from '@/lib/auth/jwt';
import { setSession, clearSession } from '@/lib/auth/session';
import { getSessionUser } from '@/lib/auth/user';
import { checkAuthRateLimit, getClientInfo, hashIp, randomToken, sha256, verifyTurnstile } from '@/lib/security';
import { sendAccountEmail } from '@/lib/email';
import { siteUrl } from '@/lib/site-url';

/**
 * Starshell account Server Actions (no public JSON endpoint). Mirrors the
 * contact-action pattern: validate against the shared Zod schema → rate-limit →
 * act → typed result. Auth errors are GENERIC (no account enumeration); password
 * reset always reports success. Passwords are argon2id-hashed; sessions are
 * httpOnly JWT cookies. Turnstile guards register + reset when configured.
 */

export type AuthResult = { ok: true } | { ok: false; error: string; fieldErrors?: AuthFieldErrors };

const RESET_TTL_MS = 30 * 60 * 1000; // 30 min
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

function fieldErrorsFrom(issues: readonly { path: PropertyKey[]; message: string }[]): AuthFieldErrors {
  const out: AuthFieldErrors = {};
  for (const i of issues) {
    const key = i.path[0];
    if (typeof key === 'string' && !out[key]) out[key] = i.message;
  }
  return out;
}

function envelope(raw: unknown): { turnstileToken?: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  return { turnstileToken: typeof r.turnstileToken === 'string' ? r.turnstileToken : undefined };
}

/** After a successful reset/verify, the raw token is single-use — remove all of the user's. */
async function createToken(userId: string, type: 'verify' | 'reset', ttlMs: number): Promise<string> {
  const token = randomToken();
  await prisma.verificationToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

// ── register ────────────────────────────────────────────────────────────────
export async function registerUser(raw: unknown): Promise<AuthResult> {
  if (!authSecretConfigured()) {
    console.error('[auth] AUTH_SECRET is not set — cannot issue sessions (register aborted before creating an account).');
    return { ok: false, error: 'Sign-in is temporarily unavailable (server config). Please try again shortly.' };
  }
  const { ip } = getClientInfo();
  if (!(await checkAuthRateLimit(`reg:${hashIp(ip)}`))) {
    return { ok: false, error: 'Too many attempts. Please try again in a few minutes.' };
  }
  if (!(await verifyTurnstile(envelope(raw).turnstileToken, ip))) {
    return { ok: false, error: 'Verification failed. Please try again.' };
  }
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Please check the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { displayName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: 'That email is already registered.', fieldErrors: { email: 'That email is already registered.' } };

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, displayName, passwordHash, progress: { create: {} } },
    });
    await setSession(user.id, user.sessionVersion);
    // Non-blocking verification email (play doesn't require a verified email).
    try {
      const token = await createToken(user.id, 'verify', VERIFY_TTL_MS);
      await sendAccountEmail('verify', email, `${siteUrl}/verify/${token}`);
    } catch (err) {
      console.error('[auth] verify email failed (registration still succeeded):', err);
    }
    return { ok: true };
  } catch (err) {
    console.error('[auth] register failed:', err);
    return { ok: false, error: 'Something went wrong creating your account. Please try again.' };
  }
}

// ── login ─────────────────────────────────────────────────────────────────--
export async function loginUser(raw: unknown): Promise<AuthResult> {
  if (!authSecretConfigured()) {
    console.error('[auth] AUTH_SECRET is not set — cannot issue sessions.');
    return { ok: false, error: 'Sign-in is temporarily unavailable (server config). Please try again shortly.' };
  }
  const { ip } = getClientInfo();
  if (!(await checkAuthRateLimit(`login:${hashIp(ip)}`))) {
    return { ok: false, error: 'Too many attempts. Please try again in a few minutes.' };
  }
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Please enter your email and password.' };
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(user.passwordHash, password) : false;
  if (!user || !ok) return { ok: false, error: 'Invalid email or password.' };

  await setSession(user.id, user.sessionVersion);
  return { ok: true };
}

// ── logout ────────────────────────────────────────────────────────────────--
export async function logout(): Promise<void> {
  clearSession();
}

// ── request password reset (no enumeration) ──────────────────────────────────
export async function requestPasswordReset(raw: unknown): Promise<AuthResult> {
  const { ip } = getClientInfo();
  if (!(await checkAuthRateLimit(`reset:${hashIp(ip)}`))) {
    return { ok: true }; // silent — don't reveal throttling on a no-enumeration path
  }
  if (!(await verifyTurnstile(envelope(raw).turnstileToken, ip))) return { ok: true };
  const parsed = resetRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: true }; // always report success
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    try {
      const token = await createToken(user.id, 'reset', RESET_TTL_MS);
      await sendAccountEmail('reset', user.email, `${siteUrl}/reset/${token}`);
    } catch (err) {
      console.error('[auth] reset email failed:', err);
    }
  }
  return { ok: true };
}

// ── reset password (consume token) ───────────────────────────────────────────
export async function resetPassword(raw: unknown): Promise<AuthResult> {
  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Please choose a valid new password (8+ characters).', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { token, password } = parsed.data;

  const rec = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.type !== 'reset' || rec.expiresAt < new Date()) {
    return { ok: false, error: 'This reset link is invalid or has expired. Please request a new one.' };
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    // Bump sessionVersion → invalidate all existing sessions on password change.
    prisma.user.update({ where: { id: rec.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
    prisma.verificationToken.deleteMany({ where: { userId: rec.userId, type: 'reset' } }),
  ]);
  const user = await prisma.user.findUnique({ where: { id: rec.userId } });
  if (user) await setSession(user.id, user.sessionVersion); // sign the fresh session in
  return { ok: true };
}

// ── verify email ─────────────────────────────────────────────────────────────
export async function verifyEmail(token: string): Promise<AuthResult> {
  const rec = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.type !== 'verify' || rec.expiresAt < new Date()) {
    return { ok: false, error: 'This verification link is invalid or has expired.' };
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.deleteMany({ where: { userId: rec.userId, type: 'verify' } }),
  ]);
  return { ok: true };
}

/** Resend a verification email to the signed-in user (used from the hub later). */
export async function resendVerification(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in first.' };
  if (user.emailVerified) return { ok: true };
  try {
    const token = await createToken(user.id, 'verify', VERIFY_TTL_MS);
    await sendAccountEmail('verify', user.email, `${siteUrl}/verify/${token}`);
  } catch (err) {
    console.error('[auth] resend verify failed:', err);
  }
  return { ok: true };
}
