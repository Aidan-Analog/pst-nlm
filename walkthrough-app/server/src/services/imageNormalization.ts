import sharp from 'sharp';
import { OUTPUT_WIDTH, OUTPUT_HEIGHT } from './ffmpeg/buildFilterGraph.js';

const MAX_LONG_EDGE = 2400;
const THUMBNAIL_WIDTH = 400;
const TARGET_ASPECT_RATIO = OUTPUT_WIDTH / OUTPUT_HEIGHT;

export interface NormalizedPhoto {
  jpegBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Fixes EXIF orientation (iPhone photos are frequently rotated via EXIF
 * rather than physically), converts to JPEG (handles HEIC input), caps
 * resolution, and center-crops to the video's 16:9 output aspect ratio so
 * ffmpeg's zoompan never has to guess how to fit a mismatched frame.
 */
export async function normalizePhoto(inputBuffer: Buffer): Promise<NormalizedPhoto> {
  const oriented = sharp(inputBuffer).rotate();
  const metadata = await oriented.metadata();
  const width = metadata.width ?? OUTPUT_WIDTH;
  const height = metadata.height ?? OUTPUT_HEIGHT;

  const currentAspect = width / height;
  let cropWidth = width;
  let cropHeight = height;
  if (currentAspect > TARGET_ASPECT_RATIO) {
    cropWidth = Math.round(height * TARGET_ASPECT_RATIO);
  } else {
    cropHeight = Math.round(width / TARGET_ASPECT_RATIO);
  }

  const cropped = sharp(inputBuffer)
    .rotate()
    .resize({
      width: cropWidth,
      height: cropHeight,
      fit: 'cover',
      position: 'centre',
    })
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    });

  const jpegBuffer = await cropped.jpeg({ quality: 88 }).toBuffer();
  const finalMeta = await sharp(jpegBuffer).metadata();
  const thumbnailBuffer = await sharp(jpegBuffer).resize({ width: THUMBNAIL_WIDTH }).jpeg({ quality: 80 }).toBuffer();

  return {
    jpegBuffer,
    thumbnailBuffer,
    width: finalMeta.width ?? cropWidth,
    height: finalMeta.height ?? cropHeight,
  };
}
