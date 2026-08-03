/**
 * Signed session tokens (JWT) + httpOnly cookie transport.
 *
 * The JWT only carries identity (`sub` = userId) and a revocation handle (`sid` = ActiveSession
 * id) — it is NOT the source of truth for "is this session still valid". `requireAuth`
 * (server/middleware/auth.ts) additionally checks that the `sid` still has a matching row in
 * `store.activeSessions`, so logging out / ending a session immediately invalidates the token
 * even though its signature and expiry are still both technically valid. See that file's comment
 * for the full revocation design.
 */

import jwt from 'jsonwebtoken';
import type { Response, Request } from 'express';
import { env } from '../config/env.js';

export const AUTH_COOKIE_NAME = 'finance_os_session';

export interface AuthTokenPayload {
  sub: string; // userId
  sid: string; // ActiveSession.id
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

/** Throws (jwt.JsonWebTokenError / TokenExpiredError) on bad signature, malformed, or expired token. */
export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as unknown as AuthTokenPayload;
}

function cookieMaxAgeMs(): number {
  // Keep the cookie's Max-Age roughly in sync with the JWT's own expiry so the browser doesn't
  // hang onto a cookie for a token that's already expired server-side. Falls back to 12h if
  // JWT_EXPIRES_IN isn't a simple "<n>h" / "<n>d" string this quick parser understands — the JWT's
  // own `exp` claim is still the real enforcement point either way.
  const raw = env.jwtExpiresIn;
  const match = /^(\d+)([hd])$/.exec(raw);
  if (!match) return 12 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unitMs = match[2] === 'd' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  return value * unitMs;
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    domain: env.cookieDomain,
    path: '/',
    maxAge: cookieMaxAgeMs(),
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    domain: env.cookieDomain,
    path: '/',
  });
}

/** Cookie is the primary transport (browser); Bearer header kept as a fallback for curl/tests. */
export function readAuthToken(req: Request): string | null {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7).trim() || null;
  return null;
}
