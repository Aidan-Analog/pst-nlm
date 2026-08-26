import { Router } from 'express';
import { listMusicTracks } from '../services/musicTracks.js';

export const musicTracksRouter = Router();

musicTracksRouter.get('/', async (_req, res) => {
  res.json({ tracks: await listMusicTracks() });
});
