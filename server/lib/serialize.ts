/**
 * Strip server-only secrets before a record goes into an HTTP response. Every place a `User` is
 * placed into a response body (login, session, membership lists, team directory, etc.) must run
 * it through this — easy to miss since `passwordHash` otherwise rides along silently on the
 * object like any other field.
 */

import type { User } from '../../src/services/types.js';

export function toPublicUser<T extends User>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export function toPublicUsers<T extends User>(users: T[]): Omit<T, 'passwordHash'>[] {
  return users.map(toPublicUser);
}
