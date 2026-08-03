/**
 * One-time backfill: give every seeded user a real bcrypt hash of the demo password, instead of
 * the app checking a single shared literal string ("demo") for everyone. After this runs once,
 * verification is genuinely per-user (see `passwordHash` on each `User`), even though every
 * seeded account happens to hash the same plaintext today — nothing about the login flow itself
 * treats the password as shared. Any user's hash can be changed independently afterward.
 */

import { hashPassword } from './passwords.js';
import { DEMO_AUTH_PASSWORD } from '../../src/data/mockDatabase.js';
import type { User } from '../../src/services/types.js';

/** Mutates `users` in place. Returns true if any hash was newly computed (caller should persist). */
export async function ensurePasswordHashes(users: User[]): Promise<boolean> {
  let changed = false;
  for (const u of users) {
    if (!u.passwordHash) {
      u.passwordHash = await hashPassword(DEMO_AUTH_PASSWORD);
      changed = true;
    }
  }
  return changed;
}
