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

// ── Starshell account auth (shared client + server) ─────────────────────────
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Please enter your email.')
  .regex(EMAIL_RE, 'Please enter a valid email address.')
  .max(200, 'Email must be under 200 characters.');

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(200, 'Password must be under 200 characters.');

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Pick a call sign (at least 2 characters).')
    .max(24, 'Call sign must be under 24 characters.'),
  email: emailField,
  password: passwordField,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Please enter your password.').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const resetRequestSchema = z.object({ email: emailField });
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;

export const resetSchema = z.object({
  token: z.string().min(1),
  password: passwordField,
});
export type ResetInput = z.infer<typeof resetSchema>;

/** Generic field-error bag for the auth forms. */
export type AuthFieldErrors = Record<string, string>;
