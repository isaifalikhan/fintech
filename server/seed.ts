/**
 * Reset SQLite to mock seed (destructive). Run: `npm run db:seed`
 */

import { eq } from 'drizzle-orm';
import { buildPersistedBundleFromMocks } from '../src/services/initialBundle.ts';
import { db } from './db/client.js';
import { appBundle } from './db/schema.js';

const b = buildPersistedBundleFromMocks();

db.delete(appBundle).where(eq(appBundle.id, 1)).run();
db.insert(appBundle)
  .values({
    id: 1,
    schemaVersion: b.schemaVersion,
    payloadJson: JSON.stringify(b.payload),
    updatedAt: new Date().toISOString(),
  })
  .run();

console.log('[finance-os] Seeded data/finance-os.db from mocks.');
