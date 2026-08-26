import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

// server/src/config -> server -> walkthrough-app (2 levels up from src, matching
// both `tsx src/index.ts` in dev and `node dist/index.js` in prod, since dist/
// sits at the same depth under walkthrough-app as src/ does).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '../../..');

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4001;

export const STORAGE_DIR = process.env.STORAGE_DIR ?? path.join(APP_ROOT, 'storage');
export const ASSETS_DIR = process.env.ASSETS_DIR ?? path.join(APP_ROOT, 'assets');
export const MUSIC_DIR = path.join(ASSETS_DIR, 'music');
export const CLIENT_DIST_DIR = process.env.CLIENT_DIST_DIR ?? path.join(APP_ROOT, 'client', 'dist');
export const DB_PATH = process.env.DB_PATH ?? path.join(STORAGE_DIR, 'walkthrough.db');

function hasSystemFfmpeg(): boolean {
  try {
    return spawnSync('ffmpeg', ['-version']).status === 0;
  } catch {
    return false;
  }
}

/**
 * Resolves the ffmpeg binary to spawn. A system `ffmpeg` on PATH (the Docker
 * image installs one; many dev machines already have one) is preferred over
 * the bundled `ffmpeg-static` devDependency fallback, because the prebuilt
 * ffmpeg-static binary ships WITHOUT the `drawtext` filter (no libfreetype) -
 * verified empirically, despite its own `-version` banner listing
 * `--enable-libfreetype`. Since address/room-label overlays are a real v1
 * feature, a full-featured system ffmpeg wins whenever one is available;
 * ffmpeg-static is a last-resort convenience for a bare Ken-Burns/crossfade
 * render with no text overlays.
 */
export function resolveFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (hasSystemFfmpeg()) return 'ffmpeg';
  try {
    const ffmpegStatic = require('ffmpeg-static') as unknown as string;
    if (ffmpegStatic) {
      console.warn(
        '[env] Using bundled ffmpeg-static (no system ffmpeg found on PATH). ' +
          'Note: this binary lacks the drawtext filter, so address/room-label overlays will fail to render. ' +
          'Install a system ffmpeg for full functionality.'
      );
      return ffmpegStatic;
    }
  } catch {
    // ffmpeg-static not installed (production build) - fall through
  }
  return 'ffmpeg';
}

export function resolveFfprobePath(): string {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  return 'ffprobe';
}

const FONT_CANDIDATES = [
  process.env.FONT_PATH,
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', // Debian/Ubuntu
  '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf', // Alpine (ttf-dejavu)
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf', // macOS dev fallback
].filter((candidate): candidate is string => Boolean(candidate));

/**
 * Returns an absolute path to a bold TTF for drawtext overlays, or null if
 * none of the known candidates exist. Text overlays are skipped gracefully
 * when null rather than bundling a font binary of unverified license.
 */
export function resolveFontPath(): string | null {
  for (const candidate of FONT_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
