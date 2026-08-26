/**
 * Pure function: turns an ordered list of normalized photos + render options
 * into a concrete ffmpeg argv array. No process spawning here so the offset/
 * duration math (the most error-prone part of this feature) can be unit
 * tested without invoking ffmpeg at all.
 *
 * Pipeline per photo: 2x upscale -> zoompan (Ken Burns pan/zoom, alternating
 * direction per index) -> setsar=1 -> optional drawtext overlay. Clips are
 * chained pairwise with xfade crossfades. Optional background music is
 * trimmed/faded under -shortest.
 */

export const OUTPUT_WIDTH = 1920;
export const OUTPUT_HEIGHT = 1080;
const UPSCALE_WIDTH = OUTPUT_WIDTH * 2;
const UPSCALE_HEIGHT = OUTPUT_HEIGHT * 2;
export const FPS = 25;
export const CLIP_DURATION_SEC = 5;
export const TRANSITION_DURATION_SEC = 1;
const ZOOM_MAX = 1.3;
const ZOOM_STEP = 0.0015;
const AUDIO_FADE_OUT_SEC = 2;

export interface FilterGraphPhoto {
  absolutePath: string;
  roomLabel: string | null;
}

export interface BuildFilterGraphInput {
  photos: FilterGraphPhoto[];
  address: string | null;
  showAddressOverlay: boolean;
  showRoomLabels: boolean;
  musicAbsolutePath: string | null;
  fontAbsolutePath: string | null;
  outputAbsolutePath: string;
}

export interface BuildFilterGraphResult {
  args: string[];
  totalDurationSec: number;
}

/**
 * Escapes a raw string for safe use inside a single-quoted ffmpeg filter
 * option value (e.g. drawtext's text=). Per the ffmpeg filtergraph escaping
 * rules: backslashes and colons need escaping even inside quotes, and a
 * literal single quote must be closed/escaped/reopened.
 */
function escapeDrawtextValue(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\\\\\''");
}

function buildDrawtext(fontPath: string, text: string, opts: { y: string; enableStart: number; enableEnd: number; fontsize: number }): string {
  const escapedFont = fontPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  const escapedText = escapeDrawtextValue(text);
  return (
    `drawtext=fontfile='${escapedFont}':text='${escapedText}':fontcolor=white:fontsize=${opts.fontsize}:` +
    `x=(w-text_w)/2:y=${opts.y}:box=1:boxcolor=black@0.4:boxborderw=12:enable='between(t,${opts.enableStart},${opts.enableEnd})'`
  );
}

export function buildFilterGraph(input: BuildFilterGraphInput): BuildFilterGraphResult {
  const { photos } = input;
  if (photos.length === 0) {
    throw new Error('buildFilterGraph requires at least one photo');
  }

  const inputArgs: string[] = [];
  const filterParts: string[] = [];

  photos.forEach((photo, i) => {
    // -loop 1 -t D at the default image2 demuxer rate (25fps) hands zoompan
    // exactly D*FPS distinct input frame pulls, bounded deterministically by
    // container EOF. zoompan's own output count is (input frames consumed)
    // * d, so d MUST be 1 here - using d=D*FPS (one zoompan "cycle" per
    // pulled frame) multiplies frame count by itself, producing a video
    // ~D*FPS times longer than intended. The 'zoom' expression state still
    // persists smoothly across these per-frame invocations, so the pan/zoom
    // animation is unaffected by d=1.
    inputArgs.push('-loop', '1', '-t', String(CLIP_DURATION_SEC), '-i', photo.absolutePath);

    const zoomingIn = i % 2 === 0;
    // 'in' (input frame index, from 0) marks the first frame of this clip's
    // own zoompan instance, unlike 'on' (cumulative output frame count),
    // which does not reset per clip.
    const zExpr = zoomingIn
      ? `min(zoom+${ZOOM_STEP},${ZOOM_MAX})`
      : `if(eq(in,0),${ZOOM_MAX},max(zoom-${ZOOM_STEP},1.0))`;

    let chain =
      `[${i}:v]scale=${UPSCALE_WIDTH}:${UPSCALE_HEIGHT},` +
      `zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:fps=${FPS},` +
      `setsar=1`;

    if (input.fontAbsolutePath) {
      if (i === 0 && input.showAddressOverlay && input.address) {
        chain += ',' + buildDrawtext(input.fontAbsolutePath, input.address, {
          y: `h-140`,
          enableStart: 0.5,
          enableEnd: Math.max(0.5, CLIP_DURATION_SEC - 1),
          fontsize: 48,
        });
      }
      if (input.showRoomLabels && photo.roomLabel) {
        chain += ',' + buildDrawtext(input.fontAbsolutePath, photo.roomLabel, {
          y: `h-100`,
          enableStart: 0.3,
          enableEnd: Math.max(0.3, CLIP_DURATION_SEC - 2),
          fontsize: 40,
        });
      }
    }

    chain += `[v${i}]`;
    filterParts.push(chain);
  });

  // Chain xfade crossfades pairwise. For n same-length clips (duration D,
  // transition T), the k-th crossfade offset is k*(D-T): each clip after the
  // first shifts the running total forward by (D-T) once the prior T-second
  // overlap is accounted for.
  let runningLabel = 'v0';
  for (let i = 1; i < photos.length; i++) {
    const offset = i * (CLIP_DURATION_SEC - TRANSITION_DURATION_SEC);
    const outLabel = i === photos.length - 1 ? 'vout' : `vx${i}`;
    filterParts.push(
      `[${runningLabel}][v${i}]xfade=transition=fade:duration=${TRANSITION_DURATION_SEC}:offset=${offset}[${outLabel}]`
    );
    runningLabel = outLabel;
  }
  if (photos.length === 1) {
    // No crossfades needed - relabel the sole clip as the final output.
    filterParts[0] = filterParts[0].replace('[v0]', '[vout]');
  }

  const totalDurationSec = photos.length * CLIP_DURATION_SEC - (photos.length - 1) * TRANSITION_DURATION_SEC;

  const args: string[] = ['-y', ...inputArgs];

  const musicInputIndex = photos.length;
  if (input.musicAbsolutePath) {
    args.push('-stream_loop', '-1', '-i', input.musicAbsolutePath);
    const fadeStart = Math.max(0, totalDurationSec - AUDIO_FADE_OUT_SEC);
    filterParts.push(
      `[${musicInputIndex}:a]atrim=0:${totalDurationSec},afade=t=out:st=${fadeStart}:d=${AUDIO_FADE_OUT_SEC}[aout]`
    );
  }

  args.push('-filter_complex', filterParts.join(';\n'));
  args.push('-map', '[vout]');
  if (input.musicAbsolutePath) {
    args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-an');
  }

  args.push(
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-movflags', '+faststart',
    '-r', String(FPS),
    '-progress', 'pipe:1',
    '-nostats',
    input.outputAbsolutePath
  );

  return { args, totalDurationSec };
}
