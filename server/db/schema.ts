import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Single-row snapshot: same shape as `localStorage` bundle (`schemaVersion` + `payload` arrays). */
export const appBundle = sqliteTable('app_bundle', {
  id: integer('id').primaryKey(),
  schemaVersion: integer('schema_version').notNull(),
  payloadJson: text('payload_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});
