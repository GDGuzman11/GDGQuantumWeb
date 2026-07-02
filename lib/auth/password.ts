import 'server-only';
import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing — argon2id with OWASP-recommended parameters. Runs in the
 * Node runtime only (Server Actions), never the Edge middleware.
 */
const OPTS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 } as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export async function verifyPassword(hashStr: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashStr, plain);
  } catch {
    return false;
  }
}
