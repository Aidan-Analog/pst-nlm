import { spawn } from 'node:child_process';
import { resolveFfmpegPath } from '../../config/env.js';
import { buildFilterGraph, type FilterGraphPhoto } from './buildFilterGraph.js';

export interface RenderWalkthroughInput {
  photos: FilterGraphPhoto[];
  address: string | null;
  showAddressOverlay: boolean;
  showRoomLabels: boolean;
  musicAbsolutePath: string | null;
  fontAbsolutePath: string | null;
  outputAbsolutePath: string;
  onProgress?: (progressPercent: number) => void;
}

const OUT_TIME_MS_RE = /out_time_ms=(\d+)/;

/**
 * Spawns ffmpeg for one render and resolves once the file is written, or
 * rejects with the tail of stderr on a non-zero exit. Progress is derived
 * from ffmpeg's own `-progress pipe:1` stream (out_time_ms vs the
 * precomputed total duration), not guessed.
 */
export function renderWalkthrough(input: RenderWalkthroughInput): Promise<void> {
  const { args, totalDurationSec } = buildFilterGraph({
    photos: input.photos,
    address: input.address,
    showAddressOverlay: input.showAddressOverlay,
    showRoomLabels: input.showRoomLabels,
    musicAbsolutePath: input.musicAbsolutePath,
    fontAbsolutePath: input.fontAbsolutePath,
    outputAbsolutePath: input.outputAbsolutePath,
  });

  return new Promise((resolve, reject) => {
    const ffmpegPath = resolveFfmpegPath();
    const child = spawn(ffmpegPath, args);

    let stderrTail = '';
    let stdoutBuffer = '';

    child.stderr.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-4000);
    });

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() ?? '';
      for (const line of lines) {
        const timeMatch = line.match(OUT_TIME_MS_RE);
        if (timeMatch && input.onProgress) {
          const outTimeSec = Number(timeMatch[1]) / 1_000_000;
          const percent = Math.min(99, Math.max(0, (outTimeSec / totalDurationSec) * 100));
          input.onProgress(percent);
        }
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg (${ffmpegPath}): ${err.message}`));
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderrTail || '(no stderr captured)'}`));
      }
    });
  });
}
