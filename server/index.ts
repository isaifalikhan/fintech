/**
 * Local SQLite API — stores the same JSON bundle as the browser `dataStore` / localStorage.
 * REST `/api/v1/*` mirrors `authService` + session helpers when the app uses `VITE_API_BASE_URL=/api/v1`.
 * Run with `npm run dev:server` or `npm run dev:full` with the Vite app.
 */

import cors from 'cors';
import { eq } from 'drizzle-orm';
import express from 'express';
import { buildPersistedBundleFromMocks } from '../src/services/initialBundle.ts';
import { db, sqlite } from './db/client.js';
import { appBundle } from './db/schema.js';
import { loadBundleRow, saveBundle } from './lib/bundleStore.js';
import { createApiV1Router } from './routes/apiV1.js';

const PORT = Number(process.env.PORT ?? 3001);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS app_bundle (
  id INTEGER PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

function ensureSeedBundle(): void {
  const rows = db.select().from(appBundle).where(eq(appBundle.id, 1)).all();
  if (rows.length > 0) return;
  const b = buildPersistedBundleFromMocks();
  db.insert(appBundle)
    .values({
      id: 1,
      schemaVersion: b.schemaVersion,
      payloadJson: JSON.stringify(b.payload),
      updatedAt: new Date().toISOString(),
    })
    .run();
}

ensureSeedBundle();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/v1', createApiV1Router());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'finance-os-local-db',
    routes: ['/api/bundle', '/api/v1/auth/login', '/api/v1/auth/session', '…'],
  });
});

app.get('/api/bundle', (_req, res) => {
  const row = loadBundleRow();
  if (!row) {
    res.status(404).json({ error: 'No bundle row' });
    return;
  }
  res.json({ schemaVersion: row.schemaVersion, payload: row.payload });
});

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
  saveBundle(body.schemaVersion, body.payload as Record<string, unknown>);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[finance-os] API http://localhost:${PORT} — SQLite bundle + /api/v1 REST`);
});
