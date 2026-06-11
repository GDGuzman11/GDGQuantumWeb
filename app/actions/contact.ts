'use server';

import { contactSchema, type ContactFieldErrors } from '@/lib/schema';
import { prisma } from '@/lib/db';
import { sendContactEmails } from '@/lib/email';

/**
 * Contact Server Action (Phase 4). No public JSON endpoint — invoked directly
 * from the client form. Flow: re-validate (never trust the client) → [security
 * gate placeholder, Phase 5] → persist → email owner + sender → typed result.
 */

export type ContactResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: ContactFieldErrors };

export async function submitContact(
  raw: unknown,
): Promise<ContactResult> {
  // 1. Validate against the SHARED schema (authoritative on the server).
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

  // 2. SECURITY GATE PLACEHOLDER — Phase 5 fills this in (honeypot/time-trap,
  //    Cloudflare Turnstile verification, rate limiting, salted IP hashing).
  //    Until then the pipeline runs straight through.

  // 3. Persist.
  try {
    await prisma.contactSubmission.create({
      data: { name: data.name, email: data.email, message: data.message },
    });
  } catch (err) {
    console.error('[contact] failed to persist submission:', err);
    return {
      ok: false,
      error: 'Something went wrong saving your message. Please try again.',
    };
  }

  // 4. Email (owner notification + sender confirmation). The row is already
  //    saved, so an email failure logs but does not fail the user's submit.
  try {
    await sendContactEmails(data);
  } catch (err) {
    console.error('[contact] failed to send emails (submission was saved):', err);
  }

  return { ok: true };
}
