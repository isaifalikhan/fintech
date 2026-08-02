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
import { store } from './lib/store.js';
import { createApiV1Router } from './routes/apiV1.js';

const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/v1', createApiV1Router());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'finance-os-local-db',
    routes: ['/api/bundle', '/api/v1/auth/login', '/api/v1/auth/session', '/api/v1/organizations/:orgId/...', '…'],
  });
});

/** Whole-bundle read (used by the browser `dataStore` when `VITE_USE_LOCAL_DB=true`). */
app.get('/api/bundle', (_req, res) => {
  const { schemaVersion, payload } = store.toBundle();
  res.json({ schemaVersion, payload });
});

/** Whole-bundle write (browser `dataStore` debounced sync). Shares the same in-memory store
 *  as `/api/v1`, so writes from either surface are immediately visible to the other. */
app.put('/api/bundle', (req, res) => {
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

app.listen(PORT, () => {
  console.log(`[finance-os] API http://localhost:${PORT} — SQLite bundle + /api/v1 REST (§1-§19)`);
});
