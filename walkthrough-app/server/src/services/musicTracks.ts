import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { MUSIC_DIR, resolveFfprobePath } from '../config/env.js';
import type { MusicTrack } from '../types.js';

function probeDurationSec(absolutePath: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(resolveFfprobePath(), [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      absolutePath,
    ]);
    let out = '';
    child.stdout.on('data', (chunk: Buffer) => (out += chunk.toString()));
    child.on('close', () => resolve(Number.parseFloat(out.trim()) || 0));
    child.on('error', () => resolve(0));
  });
}

/**
 * Scans assets/music for bundled tracks. Ships empty by default - see
 * assets/music/README.md - rather than fabricating "royalty-free" audio
 * whose licensing this repo can't actually vouch for. Auctioneers (or
 * whoever operates this app) add their own licensed .mp3 files there.
 */
export async function listMusicTracks(): Promise<MusicTrack[]> {
  if (!fs.existsSync(MUSIC_DIR)) return [];
  const files = (await fs.promises.readdir(MUSIC_DIR)).filter((f) => f.toLowerCase().endsWith('.mp3'));

  const tracks = await Promise.all(
    files.map(async (file) => {
      const absolutePath = path.join(MUSIC_DIR, file);
      const durationSec = await probeDurationSec(absolutePath);
      const id = path.basename(file, '.mp3');
      return { id, name: id, durationSec, previewUrl: `/media-assets/music/${file}` } satisfies MusicTrack;
    })
  );
  return tracks;
}

export function absolutePathForTrack(trackId: string): string | null {
  const candidate = path.join(MUSIC_DIR, `${trackId}.mp3`);
  const resolved = path.resolve(candidate);
  if (!resolved.startsWith(path.resolve(MUSIC_DIR)) || !fs.existsSync(resolved)) return null;
  return resolved;
}
