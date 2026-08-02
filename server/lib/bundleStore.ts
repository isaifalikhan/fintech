/**
 * Read/write the single-row app bundle (same JSON as browser localStorage / dataStore).
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { appBundle } from '../db/schema.js';

export function loadBundleRow(): {
  schemaVersion: number;
  payload: Record<string, unknown>;
} | null {
  const rows = db.select().from(appBundle).where(eq(appBundle.id, 1)).all();
  const row = rows[0];
  if (!row) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(row.payloadJson);
  } catch {
    return null;
  }
  if (payload == null || typeof payload !== 'object') return null;
  return { schemaVersion: row.schemaVersion, payload: payload as Record<string, unknown> };
}

export function saveBundle(schemaVersion: number, payload: Record<string, unknown>): void {
  const payloadJson = JSON.stringify(payload);
  const updatedAt = new Date().toISOString();
  db.insert(appBundle)
    .values({
      id: 1,
      schemaVersion,
      payloadJson,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: appBundle.id,
      set: {
        schemaVersion,
        payloadJson,
        updatedAt,
      },
    })
    .run();
}
