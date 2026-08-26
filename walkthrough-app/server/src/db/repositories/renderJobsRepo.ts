import { randomUUID } from 'node:crypto';
import { db } from '../sqlite.js';
import type { RenderJob, RenderJobStatus, RenderOptions } from '../../types.js';

interface RenderJobRow {
  id: string;
  project_id: string;
  status: RenderJobStatus;
  progress_percent: number;
  options_json: string;
  output_key: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

function toRenderJob(row: RenderJobRow): RenderJob {
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    progressPercent: row.progress_percent,
    options: JSON.parse(row.options_json) as RenderOptions,
    outputKey: row.output_key,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

export function createRenderJob(projectId: string, options: RenderOptions): RenderJob {
  const id = randomUUID();
  db.prepare(`INSERT INTO render_jobs (id, project_id, options_json) VALUES (?, ?, ?)`).run(
    id,
    projectId,
    JSON.stringify(options)
  );
  return getRenderJobById(id)!;
}

export function getRenderJobById(id: string): RenderJob | null {
  const row = db.prepare(`SELECT * FROM render_jobs WHERE id = ?`).get(id) as RenderJobRow | undefined;
  return row ? toRenderJob(row) : null;
}

export function getLatestRenderJobForProject(projectId: string): RenderJob | null {
  const row = db
    .prepare(`SELECT * FROM render_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(projectId) as RenderJobRow | undefined;
  return row ? toRenderJob(row) : null;
}

export function markRenderJobProcessing(id: string): void {
  db.prepare(`UPDATE render_jobs SET status = 'processing', started_at = datetime('now') WHERE id = ?`).run(id);
}

export function updateRenderJobProgress(id: string, progressPercent: number): void {
  db.prepare(`UPDATE render_jobs SET progress_percent = ? WHERE id = ?`).run(progressPercent, id);
}

export function markRenderJobDone(id: string, outputKey: string): void {
  db.prepare(
    `UPDATE render_jobs SET status = 'done', progress_percent = 100, output_key = ?, finished_at = datetime('now') WHERE id = ?`
  ).run(outputKey, id);
}

export function markRenderJobFailed(id: string, errorMessage: string): void {
  db.prepare(
    `UPDATE render_jobs SET status = 'failed', error_message = ?, finished_at = datetime('now') WHERE id = ?`
  ).run(errorMessage, id);
}
