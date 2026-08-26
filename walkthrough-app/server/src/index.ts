import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { PORT, STORAGE_DIR, ASSETS_DIR, CLIENT_DIST_DIR } from './config/env.js';
import { reconcileStaleRenderJobs } from './db/sqlite.js';
import { projectsRouter } from './routes/projects.js';
import { photosRouter } from './routes/photos.js';
import { renderRouter, renderJobsRouter } from './routes/render.js';
import { musicTracksRouter } from './routes/musicTracks.js';

reconcileStaleRenderJobs();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/photos', photosRouter);
app.use('/api/projects/:projectId/render', renderRouter);
app.use('/api/render-jobs', renderJobsRouter);
app.use('/api/music-tracks', musicTracksRouter);

// Uploaded photos, thumbnails, and rendered videos.
app.use('/media', express.static(STORAGE_DIR));
// Bundled music preview files (assets/music/*.mp3).
app.use('/media-assets', express.static(ASSETS_DIR));

// Serve the built client in production (mirrors server/index.ts in the
// sibling ADI app's Docker deployment path).
app.use(express.static(CLIENT_DIST_DIR));
app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found');
  });
});

app.listen(PORT, () => {
  console.log(`[walkthrough-server] Running on http://localhost:${PORT}`);
});
