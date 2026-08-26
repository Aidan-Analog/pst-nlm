import { Router, type Request } from 'express';
import { getRenderJobById } from '../db/repositories/renderJobsRepo.js';
import { startRenderJob } from '../services/renderService.js';
import { storage } from '../services/storage.js';
import type { RenderOptions } from '../types.js';

export const renderRouter = Router({ mergeParams: true });
export const renderJobsRouter = Router();

type ProjectParams = { projectId: string };

renderRouter.post('/', (req: Request<ProjectParams>, res) => {
  const { projectId } = req.params;
  const body = req.body ?? {};
  const options: RenderOptions = {
    musicTrackId: typeof body.musicTrackId === 'string' ? body.musicTrackId : null,
    showAddressOverlay: Boolean(body.showAddressOverlay),
    showRoomLabels: Boolean(body.showRoomLabels),
  };

  try {
    const job = startRenderJob(projectId, options);
    res.status(202).json({ jobId: job.id });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to start render' });
  }
});

renderJobsRouter.get('/:jobId', (req, res) => {
  const job = getRenderJobById(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Render job not found' });
  res.json({ ...job, outputUrl: job.outputKey ? storage.publicUrl(job.outputKey) : null });
});

renderJobsRouter.get('/:jobId/download', (req, res) => {
  const job = getRenderJobById(req.params.jobId);
  if (!job || job.status !== 'done' || !job.outputKey) {
    return res.status(404).json({ error: 'Render is not ready for download' });
  }
  res.download(storage.absolutePath(job.outputKey), `walkthrough-${job.projectId}.mp4`);
});
