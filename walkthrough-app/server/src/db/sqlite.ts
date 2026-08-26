import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DB_PATH } from '../config/env.js';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    address TEXT,
    price_display TEXT,
    agent_name TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    thumbnail_key TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    room_label TEXT,
    original_filename TEXT,
    width INTEGER,
    height INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_photos_project_order ON photos(project_id, order_index);

  CREATE TABLE IF NOT EXISTS render_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued',
    progress_percent REAL NOT NULL DEFAULT 0,
    options_json TEXT NOT NULL,
    output_key TEXT,
    error_message TEXT,
    started_at TEXT,
    finished_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_render_jobs_project ON render_jobs(project_id, created_at);
`);

/**
 * Any render job still marked "processing" at boot was interrupted by a
 * server restart (no durable external queue in v1 - see plan phasing).
 * Mark it failed rather than leaving it stuck forever.
 */
export function reconcileStaleRenderJobs(): void {
  const result = db
    .prepare(
      `UPDATE render_jobs SET status = 'failed', error_message = 'Interrupted by server restart', finished_at = datetime('now')
       WHERE status IN ('queued', 'processing')`
    )
    .run();
  if (result.changes > 0) {
    console.log(`[db] Marked ${result.changes} stale render job(s) as failed after restart`);
  }
}
