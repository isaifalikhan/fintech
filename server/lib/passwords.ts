/**
 * Password hashing — bcryptjs (pure JS, no native build step, unlike `bcrypt`).
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string | undefined | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}
