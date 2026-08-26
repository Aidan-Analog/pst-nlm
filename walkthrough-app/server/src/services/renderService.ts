import { resolveFontPath } from '../config/env.js';
import { listPhotosByProject } from '../db/repositories/photosRepo.js';
import { getProjectById, updateProject } from '../db/repositories/projectsRepo.js';
import {
  createRenderJob,
  markRenderJobDone,
  markRenderJobFailed,
  markRenderJobProcessing,
  updateRenderJobProgress,
} from '../db/repositories/renderJobsRepo.js';
import type { RenderOptions } from '../types.js';
import { renderJobQueue } from './jobQueue.js';
import { renderWalkthrough } from './ffmpeg/renderWalkthrough.js';
import { absolutePathForTrack } from './musicTracks.js';
import { storage } from './storage.js';

export function startRenderJob(projectId: string, options: RenderOptions) {
  const project = getProjectById(projectId);
  if (!project) throw new Error('Project not found');

  const photos = listPhotosByProject(projectId);
  if (photos.length === 0) throw new Error('Project has no photos to render');

  const job = createRenderJob(projectId, options);
  updateProject(projectId, { status: 'rendering' });

  renderJobQueue.enqueue(async () => {
    markRenderJobProcessing(job.id);
    try {
      const { absolutePath: outputAbsolutePath, storageKey } = storage.renderOutputPath(projectId, job.id);
      const musicAbsolutePath = options.musicTrackId ? absolutePathForTrack(options.musicTrackId) : null;

      await renderWalkthrough({
        photos: photos.map((p) => ({ absolutePath: storage.absolutePath(p.storageKey), roomLabel: p.roomLabel })),
        address: project.address,
        showAddressOverlay: options.showAddressOverlay,
        showRoomLabels: options.showRoomLabels,
        musicAbsolutePath,
        fontAbsolutePath: resolveFontPath(),
        outputAbsolutePath,
        onProgress: (percent) => updateRenderJobProgress(job.id, percent),
      });

      markRenderJobDone(job.id, storageKey);
      updateProject(projectId, { status: 'ready' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown render error';
      console.error(`[renderService] Job ${job.id} failed:`, message);
      markRenderJobFailed(job.id, message);
      updateProject(projectId, { status: 'draft' });
    }
  });

  return job;
}
