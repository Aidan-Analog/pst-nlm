import { randomUUID } from 'node:crypto';
import { db } from '../sqlite.js';
import type { Photo } from '../../types.js';

interface PhotoRow {
  id: string;
  project_id: string;
  storage_key: string;
  thumbnail_key: string;
  order_index: number;
  room_label: string | null;
  original_filename: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    projectId: row.project_id,
    storageKey: row.storage_key,
    thumbnailKey: row.thumbnail_key,
    orderIndex: row.order_index,
    roomLabel: row.room_label,
    originalFilename: row.original_filename,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  };
}

export function insertPhoto(input: {
  projectId: string;
  storageKey: string;
  thumbnailKey: string;
  originalFilename: string | null;
  width: number;
  height: number;
}): Photo {
  const id = randomUUID();
  const nextIndex = (
    db.prepare(`SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM photos WHERE project_id = ?`).get(input.projectId) as {
      next: number;
    }
  ).next;

  db.prepare(
    `INSERT INTO photos (id, project_id, storage_key, thumbnail_key, order_index, original_filename, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.projectId, input.storageKey, input.thumbnailKey, nextIndex, input.originalFilename, input.width, input.height);

  return getPhotoById(id)!;
}

export function listPhotosByProject(projectId: string): Photo[] {
  const rows = db
    .prepare(`SELECT * FROM photos WHERE project_id = ? ORDER BY order_index ASC`)
    .all(projectId) as PhotoRow[];
  return rows.map(toPhoto);
}

export function getPhotoById(id: string): Photo | null {
  const row = db.prepare(`SELECT * FROM photos WHERE id = ?`).get(id) as PhotoRow | undefined;
  return row ? toPhoto(row) : null;
}

export function deletePhotoAndReindex(projectId: string, photoId: string): Photo | null {
  const photo = getPhotoById(photoId);
  if (!photo || photo.projectId !== projectId) return null;

  const reindex = db.transaction(() => {
    db.prepare(`DELETE FROM photos WHERE id = ?`).run(photoId);
    const remaining = db
      .prepare(`SELECT id FROM photos WHERE project_id = ? ORDER BY order_index ASC`)
      .all(projectId) as { id: string }[];
    const update = db.prepare(`UPDATE photos SET order_index = ? WHERE id = ?`);
    remaining.forEach((row, index) => update.run(index, row.id));
  });
  reindex();

  return photo;
}

export function reorderPhotos(projectId: string, orderedPhotoIds: string[]): Photo[] {
  const existing = listPhotosByProject(projectId);
  const existingIds = new Set(existing.map((p) => p.id));

  if (orderedPhotoIds.length !== existing.length || !orderedPhotoIds.every((id) => existingIds.has(id))) {
    throw new Error('orderedPhotoIds must be a permutation of the project\'s existing photo ids');
  }

  const reorder = db.transaction(() => {
    const update = db.prepare(`UPDATE photos SET order_index = ? WHERE id = ?`);
    orderedPhotoIds.forEach((id, index) => update.run(index, id));
  });
  reorder();

  return listPhotosByProject(projectId);
}

export function updatePhotoRoomLabel(projectId: string, photoId: string, roomLabel: string | null): Photo | null {
  const photo = getPhotoById(photoId);
  if (!photo || photo.projectId !== projectId) return null;

  db.prepare(`UPDATE photos SET room_label = ? WHERE id = ?`).run(roomLabel, photoId);
  return getPhotoById(photoId);
}
