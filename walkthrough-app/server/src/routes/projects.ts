import { Router } from 'express';
import { createProject, getProjectById, listProjects, updateProject } from '../db/repositories/projectsRepo.js';
import { listPhotosByProject } from '../db/repositories/photosRepo.js';
import { getLatestRenderJobForProject } from '../db/repositories/renderJobsRepo.js';
import { storage } from '../services/storage.js';

export const projectsRouter = Router();

projectsRouter.post('/', (req, res) => {
  const { title, address, priceDisplay, agentName } = req.body ?? {};
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' });
  }
  const project = createProject({
    title,
    address: address ?? null,
    priceDisplay: priceDisplay ?? null,
    agentName: agentName ?? null,
  });
  res.status(201).json({ project });
});

projectsRouter.get('/', (_req, res) => {
  res.json({ projects: listProjects() });
});

projectsRouter.get('/:id', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const photos = listPhotosByProject(project.id).map((p) => ({
    ...p,
    url: storage.publicUrl(p.storageKey),
    thumbnailUrl: storage.publicUrl(p.thumbnailKey),
  }));
  const latestRenderJob = getLatestRenderJobForProject(project.id);

  res.json({
    project,
    photos,
    latestRenderJob: latestRenderJob
      ? { ...latestRenderJob, outputUrl: latestRenderJob.outputKey ? storage.publicUrl(latestRenderJob.outputKey) : null }
      : null,
  });
});

projectsRouter.patch('/:id', (req, res) => {
  const { title, address, priceDisplay, agentName } = req.body ?? {};
  const project = updateProject(req.params.id, { title, address, priceDisplay, agentName });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({ project });
});
