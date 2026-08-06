/**
 * Central, fail-loud environment resolution for the server. Import this before anything else
 * touches `process.env` for auth/security config, so a missing required var in production surfaces
 * immediately at boot rather than as a mysterious runtime failure later.
 */

import { randomBytes } from 'node:crypto';
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The Vite dev server auto-loads `.env` / `.env.local`, but this Express server is started
// standalone (`tsx watch server/index.ts`) and Node does not do that on its own — without this,
// every var below would silently fall back to its dev default even when `.env.local` sets it.
// Mirrors Vite's own precedence: `.env.local` wins over `.env` for any key present in both.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');
loadDotenv({ path: path.join(repoRoot, '.env'), quiet: true });
loadDotenv({ path: path.join(repoRoot, '.env.local'), override: true, quiet: true });

const isProd = process.env.NODE_ENV === 'production';

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;

  if (isProd) {
    throw new Error(
      'JWT_SECRET is required when NODE_ENV=production. Set it in the environment and restart.',
    );
  }

  // Dev/test convenience: derive a stable-per-process secret and warn loudly. Tokens issued this
  // way will NOT survive a server restart (every restart invalidates all sessions) — that's an
  // acceptable, visible trade-off for local development, never for a real deployment.
  const generated = `dev-insecure-${randomBytes(24).toString('hex')}`;
  console.warn(
    '\n[finance-os] WARNING: JWT_SECRET is not set — using an ephemeral dev-only secret.\n' +
    '  Sessions will NOT survive a server restart, and this MUST NOT be used in production.\n' +
    '  Set JWT_SECRET (a long random string) in your .env / .env.local to silence this warning.\n',
  );
  return generated;
}

export const env = {
  isProd,
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '12h',
  corsOrigin: process.env.CORS_ORIGIN?.trim() || 'http://localhost:5173',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || isProd,
  cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
  port: Number(process.env.PORT ?? 3001),
  // Server-only — never prefix with VITE_ (that would bundle it into client JS). Used to call the
  // Supabase Admin API (create/invite real auth users, resolve legacy_id -> real UUID) for
  // features the anon-key browser client structurally cannot do. Optional: those endpoints report
  // a clear 501 when unset instead of the server failing to boot.
  supabaseUrl: process.env.SUPABASE_URL?.trim() || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
};
