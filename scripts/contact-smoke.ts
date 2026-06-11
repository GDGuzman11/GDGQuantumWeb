/**
 * Phase 4 runtime smoke test (NOT shipped — lives only to drive the Human Test
 * Gate 4 verification). Mirrors the `submitContact` server action pipeline:
 *   validate (shared Zod schema) -> persist (real Prisma client) -> email x2.
 *
 * The email payloads mirror lib/email.ts exactly, but here we capture each
 * Resend response (id on success, error object on failure) so we get a
 * trustworthy delivery signal — lib/email.ts intentionally swallows send
 * errors so a failed email never fails the user's submit.
 *
 * The submitter email is set to CONTACT_OWNER_EMAIL so that, under the Resend
 * sandbox (which only delivers to the account's own address), BOTH the owner
 * notification and the sender confirmation arrive in the one inbox.
 *
 * Run: node --env-file=.env .smoke/scripts/contact-smoke.js
 */
import { contactSchema } from '../lib/schema';
import { prisma } from '../lib/db';
import { Resend } from 'resend';

function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mask(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const u = user.length <= 2 ? user[0] + '*' : user.slice(0, 2) + '***';
  return `${u}@${domain}`;
}

async function main() {
  const OWNER = process.env.CONTACT_OWNER_EMAIL;
  const FROM = process.env.CONTACT_FROM_EMAIL ?? 'GDG Quantum <onboarding@resend.dev>';
  const KEY = process.env.RESEND_API_KEY;

  if (!OWNER) {
    console.error('FAIL: CONTACT_OWNER_EMAIL is not set in .env');
    process.exit(1);
  }

  const raw = {
    name: 'Phase 4 Smoke Test',
    email: OWNER,
    message:
      'Automated Phase 4 end-to-end test of the GDG Quantum contact pipeline ' +
      '(persist + dual email). Safe to delete. <b>html?</b>',
  };

  // 1. Validate against the shared schema (same as the server action).
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('FAIL: validation rejected the test payload', parsed.error.issues);
    await prisma.$disconnect();
    process.exit(1);
  }
  const data = parsed.data;
  console.log('VALIDATE_OK');

  // 2. Persist via the real Prisma client.
  const row = await prisma.contactSubmission.create({
    data: { name: data.name, email: data.email, message: data.message },
  });
  const count = await prisma.contactSubmission.count();
  console.log(
    `PERSIST_OK id=${row.id} name="${row.name}" email=${mask(row.email)} createdAt=${row.createdAt.toISOString()} totalRows=${count}`,
  );

  // 3. Email x2 (mirrors lib/email.ts payloads; captures the Resend response).
  if (!KEY) {
    console.log('EMAIL_SKIPPED: RESEND_API_KEY not set');
    await prisma.$disconnect();
    return;
  }
  const resend = new Resend(KEY);
  const name = esc(data.name);
  const email = esc(data.email);
  const message = esc(data.message).replace(/\n/g, '<br />');

  const owner = await resend.emails.send({
    from: FROM,
    to: OWNER,
    replyTo: data.email,
    subject: `New enquiry from ${name}`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#0E1116"><h2 style="margin:0 0 12px">New contact submission</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${message}</p></div>`,
  });
  console.log(
    owner.data?.id
      ? `OWNER_EMAIL_OK id=${owner.data.id} -> ${mask(OWNER)}`
      : `OWNER_EMAIL_ERROR ${JSON.stringify(owner.error)}`,
  );

  const conf = await resend.emails.send({
    from: FROM,
    to: data.email,
    subject: 'Thanks for reaching out to GDG Quantum',
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#0E1116"><p>Hi ${name},</p><p>Thanks for getting in touch with GDG Quantum. We&rsquo;ve received your message and will reply within a couple of working days.</p><p style="color:#6B7280">For reference, here&rsquo;s what you sent:</p><blockquote style="margin:8px 0;padding:8px 14px;border-left:2px solid #2563EB;color:#6B7280">${message}</blockquote><p>&mdash; GDG Quantum</p></div>`,
  });
  console.log(
    conf.data?.id
      ? `CONFIRM_EMAIL_OK id=${conf.data.id} -> ${mask(data.email)}`
      : `CONFIRM_EMAIL_ERROR ${JSON.stringify(conf.error)}`,
  );

  await prisma.$disconnect();
  console.log('DONE');
}

main().catch(async (e) => {
  console.error('FATAL', e);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
