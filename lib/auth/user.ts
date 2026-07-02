import 'server-only';
import { prisma } from '@/lib/db';
import { getSession } from './session';

/**
 * Authoritative session check: verify the JWT AND confirm the user still exists
 * and their sessionVersion matches (so a password reset / logout-all really
 * revokes old tokens — the Edge middleware only does a cheap signature gate).
 * Use this in Server Components / Server Actions that need the real user.
 */
export async function getSessionUser() {
  const s = await getSession();
  if (!s) return null;
  const user = await prisma.user.findUnique({ where: { id: s.sub } });
  if (!user || user.sessionVersion !== s.v) return null;
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
