import { z } from 'zod';

/**
 * Shared contact-form schema — the SINGLE source of truth used by BOTH the
 * client (React Hook Form via zodResolver) and the server (the Server Action
 * re-validates, never trusting the client). Keep this dependency-light and
 * framework-agnostic so both sides import the same rules.
 *
 * Email is validated with a pragmatic regex (after trim + lowercase) rather
 * than a library format helper, so it's stable across validator versions;
 * Phase 5 hardens validation further.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please enter your name.')
    .max(100, 'Name must be under 100 characters.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Please enter your email.')
    .regex(EMAIL_RE, 'Please enter a valid email address.')
    .max(200, 'Email must be under 200 characters.'),
  message: z
    .string()
    .trim()
    .min(10, 'Please add a little more detail (at least 10 characters).')
    .max(4000, 'Message must be under 4000 characters.'),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Field-level error bag returned to the client for inline display. */
export type ContactFieldErrors = Partial<Record<keyof ContactInput, string>>;
