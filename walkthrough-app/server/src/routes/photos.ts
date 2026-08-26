import { Router, type Request } from 'express';
import { randomUUID } from 'node:crypto';
import {
  deletePhotoAndReindex,
  insertPhoto,
  listPhotosByProject,
  reorderPhotos,
  updatePhotoRoomLabel,
} from '../db/repositories/photosRepo.js';
import { getProjectById } from '../db/repositories/projectsRepo.js';
import { normalizePhoto } from '../services/imageNormalization.js';
import { uploadPhotos } from '../middleware/upload.js';
import { storage } from '../services/storage.js';

export const photosRouter = Router({ mergeParams: true });

type ProjectParams = { projectId: string };
type PhotoParams = { projectId: string; photoId: string };

function toPublicPhoto(photo: ReturnType<typeof insertPhoto>) {
  return { ...photo, url: storage.publicUrl(photo.storageKey), thumbnailUrl: storage.publicUrl(photo.thumbnailKey) };
}

photosRouter.post('/', uploadPhotos, async (req: Request<ProjectParams>, res) => {
  const projectId = req.params.projectId;
  const project = getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) return res.status(400).json({ error: 'No photos uploaded' });

  const created = [];
  const failed: { filename: string; error: string }[] = [];

  for (const file of files) {
    try {
      const normalized = await normalizePhoto(file.buffer);
      const photoId = randomUUID();
      const storageKey = await storage.savePhoto(projectId, photoId, normalized.jpegBuffer);
      const thumbnailKey = await storage.saveThumbnail(projectId, photoId, normalized.thumbnailBuffer);
      const photo = insertPhoto({
        projectId,
        storageKey,
        thumbnailKey,
        originalFilename: file.originalname,
        width: normalized.width,
        height: normalized.height,
      });
      created.push(toPublicPhoto(photo));
    } catch (err) {
      failed.push({ filename: file.originalname, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  res.status(created.length > 0 ? 201 : 422).json({ photos: created, failed });
});

photosRouter.delete('/:photoId', async (req: Request<PhotoParams>, res) => {
  const { projectId, photoId } = req.params;
  const photo = deletePhotoAndReindex(projectId, photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  await storage.deleteByKey(photo.storageKey);
  await storage.deleteByKey(photo.thumbnailKey);

  res.json({ photos: listPhotosByProject(projectId).map(toPublicPhoto) });
});

photosRouter.put('/order', (req: Request<ProjectParams>, res) => {
  const { projectId } = req.params;
  const { photoIds } = req.body ?? {};
  if (!Array.isArray(photoIds) || photoIds.some((id) => typeof id !== 'string')) {
    return res.status(400).json({ error: 'photoIds must be an array of photo id strings' });
  }
  try {
    const photos = reorderPhotos(projectId, photoIds);
    res.json({ photos: photos.map(toPublicPhoto) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to reorder photos' });
  }
});

photosRouter.patch('/:photoId', (req: Request<PhotoParams>, res) => {
  const { projectId, photoId } = req.params;
  const { roomLabel } = req.body ?? {};
  const photo = updatePhotoRoomLabel(projectId, photoId, roomLabel ?? null);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  res.json({ photo: toPublicPhoto(photo) });
});
