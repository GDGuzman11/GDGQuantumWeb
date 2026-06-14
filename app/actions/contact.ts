'use server';

import { contactSchema, type ContactFieldErrors } from '@/lib/schema';
import { prisma } from '@/lib/db';
import { sendContactEmails } from '@/lib/email';
import {
  checkRateLimit,
  getClientInfo,
  hashIp,
  verifyTurnstile,
} from '@/lib/security';

/**
 * Contact Server Action. No public JSON endpoint — invoked directly from the
 * client form. Flow: bot gate (honeypot + time-trap) → Turnstile → rate limit →
 * re-validate (never trust the client) → persist (with salted ipHash + UA) →
 * email owner + sender → typed result.
 *
 * Bot rejections are SILENT: they return `{ ok: true }` without persisting or
 * emailing, so an automated client gets the same response as success and learns
 * nothing. Rate-limited humans get a polite, explicit message.
 */

export type ContactResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: ContactFieldErrors };

// Submissions faster than this after the form mounted are treated as bots.
const MIN_FILL_MS = 2500;

/** Pull the security envelope (non-content fields) off the raw payload. */
function readEnvelope(raw: unknown): {
  extraField: string;
  renderedAt: number;
  turnstileToken: string | undefined;
} {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    // Non-semantic key so browser autofill doesn't recognise/fill the honeypot.
    extraField: typeof r.extraField === 'string' ? r.extraField : '',
    renderedAt: typeof r.renderedAt === 'number' ? r.renderedAt : 0,
    turnstileToken:
      typeof r.turnstileToken === 'string' ? r.turnstileToken : undefined,
  };
}

export async function submitContact(raw: unknown): Promise<ContactResult> {
  const { extraField, renderedAt, turnstileToken } = readEnvelope(raw);
  const { ip, userAgent } = getClientInfo();

  // 1. Honeypot — a real user never fills the hidden honeypot field.
  if (extraField.trim() !== '') {
    console.warn('[contact][diag] honeypot fired — field length:', extraField.length);
    return { ok: true }; // silent accept; do nothing
  }

  // 2. Time-trap — submitted implausibly fast after mount → bot.
  if (renderedAt > 0 && Date.now() - renderedAt < MIN_FILL_MS) {
    console.warn(
      '[contact][diag] time-trap fired — elapsed ms:',
      Date.now() - renderedAt,
      'renderedAt:',
      renderedAt,
    );
    return { ok: true }; // silent accept; do nothing
  }

  // 3. Cloudflare Turnstile (skipped in dev when no secret configured).
  const human = await verifyTurnstile(turnstileToken, ip);
  if (!human) {
    console.warn(
      '[contact][diag] turnstile rejected — token present:',
      Boolean(turnstileToken),
    );
    return { ok: true }; // silent reject; do nothing
  }

  console.warn('[contact][diag] passed all bot gates — proceeding to rate-limit/persist/email');

  // 4. Rate limit per hashed IP (skipped in dev; fails closed when configured).
  const ipHash = hashIp(ip);
  const allowed = await checkRateLimit(ipHash);
  if (!allowed) {
    return {
      ok: false,
      error:
        "You've sent a few messages already — please try again in a few minutes.",
    };
  }

  // 5. Validate against the SHARED schema (authoritative on the server).
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: ContactFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ContactFieldErrors | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: 'Please check the highlighted fields.',
      fieldErrors,
    };
  }

  const data = parsed.data;

  // 6. Persist (store the salted IP hash + UA, never the raw IP).
  try {
    await prisma.contactSubmission.create({
      data: {
        name: data.name,
        email: data.email,
        message: data.message,
        ipHash,
        userAgent,
      },
    });
  } catch (err) {
    console.error('[contact] failed to persist submission:', err);
    return {
      ok: false,
      error: 'Something went wrong saving your message. Please try again.',
    };
  }

  // 7. Email (owner notification + sender confirmation). The row is already
  //    saved, so an email failure logs but does not fail the user's submit.
  try {
    await sendContactEmails(data);
  } catch (err) {
    console.error('[contact] failed to send emails (submission was saved):', err);
  }

  return { ok: true };
}
