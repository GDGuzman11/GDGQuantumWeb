import { Resend } from 'resend';
import type { ContactInput } from './schema';

/**
 * Transactional email (Resend). Sends two messages on a valid submission:
 *   1. owner notification  → CONTACT_OWNER_EMAIL
 *   2. sender confirmation → the submitter
 *
 * Resilience: if RESEND_API_KEY / CONTACT_OWNER_EMAIL are not configured yet
 * (early/dev state), we DON'T throw — we log and report `sent: false` so the
 * Server Action can still persist the row. With creds present, both emails are
 * sent. HTML values are escaped here (basic) and hardened further in Phase 5.
 */

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.CONTACT_FROM_EMAIL ?? 'GDG Quantum <onboarding@resend.dev>';
const OWNER = process.env.CONTACT_OWNER_EMAIL;

const resend = apiKey ? new Resend(apiKey) : null;

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type SendResult = { sent: boolean };

export async function sendContactEmails(data: ContactInput): Promise<SendResult> {
  if (!resend || !OWNER) {
    console.warn(
      '[email] RESEND_API_KEY or CONTACT_OWNER_EMAIL not set — skipping email send (row still persisted).',
    );
    return { sent: false };
  }

  const name = esc(data.name);
  const email = esc(data.email);
  const message = esc(data.message).replace(/\n/g, '<br />');

  // 1. Owner notification
  await resend.emails.send({
    from: FROM,
    to: OWNER,
    replyTo: data.email,
    subject: `New enquiry from ${name}`,
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#0E1116">
        <h2 style="margin:0 0 12px">New contact submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      </div>`,
  });

  // 2. Sender confirmation
  await resend.emails.send({
    from: FROM,
    to: data.email,
    subject: 'Thanks for reaching out to GDG Quantum',
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#0E1116">
        <p>Hi ${name},</p>
        <p>Thanks for getting in touch with GDG Quantum. We&rsquo;ve received your
        message and will reply within a couple of working days.</p>
        <p style="color:#6B7280">For reference, here&rsquo;s what you sent:</p>
        <blockquote style="margin:8px 0;padding:8px 14px;border-left:2px solid #2563EB;color:#6B7280">${message}</blockquote>
        <p>&mdash; GDG Quantum</p>
      </div>`,
  });

  return { sent: true };
}
