/**
 * Local SQLite API — stores the same JSON bundle as the browser `dataStore` / localStorage.
 * `/api/v1/*` (server/routes/apiV1.ts) implements the full REST surface from
 * `architecture/api-backend-rollout.md` §1–§19 against the shared in-memory `store`
 * (server/lib/store.ts), which persists to `data/finance-os.db` after every mutation.
 *
 * Run with `npm run dev:server` or `npm run dev:full` alongside the Vite app.
 */

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { store, storeReady } from './lib/store.js';
import { createApiV1Router } from './routes/apiV1.js';
import { requireAuth, requirePlatformRole } from './middleware/auth.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1gb' }));
app.use(cookieParser());

app.use('/api/v1', createApiV1Router());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'finance-os-local-db',
    routes: ['/api/bundle', '/api/v1/auth/login', '/api/v1/auth/session', '/api/v1/organizations/:orgId/...', '…'],
  });
});

/** Whole-bundle read/write — legacy sync path for the browser `dataStore` when
 *  `VITE_USE_LOCAL_DB=true`. Restricted to platform staff: it exposes/replaces every
 *  organization's data in one shot, which no single-org user or employee should be able to do. */
app.get('/api/bundle', requireAuth, requirePlatformRole('platform_admin', 'platform_manager'), (_req, res) => {
  const { schemaVersion, payload } = store.toBundle();
  res.json({ schemaVersion, payload });
});

app.put('/api/bundle', requireAuth, requirePlatformRole('platform_admin', 'platform_manager'), (req, res) => {
  const body = req.body as { schemaVersion?: unknown; payload?: unknown };
  if (
    body == null ||
    typeof body.schemaVersion !== 'number' ||
    body.payload == null ||
    typeof body.payload !== 'object'
  ) {
    res.status(400).json({ error: 'Expected { schemaVersion: number, payload: object }' });
    return;
  }
  store.replaceFromBundle(body.schemaVersion, body.payload as Record<string, unknown>);
  res.json({ ok: true });
});

await storeReady;

app.listen(env.port, () => {
  console.log(`[finance-os] API http://localhost:${env.port} — SQLite bundle + /api/v1 REST (§1-§19)`);
});
