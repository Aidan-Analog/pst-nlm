import fs from 'node:fs';
import path from 'node:path';
import { STORAGE_DIR } from '../config/env.js';

/**
 * Narrow seam between the app and where files actually live. Everything
 * outside this module deals only in opaque "storage keys" (e.g.
 * `uploads/<projectId>/<photoId>.jpg`) and public URLs - swapping the local
 * disk impl for S3/Supabase Storage later means changing only this file.
 */
export interface StorageAdapter {
  savePhoto(projectId: string, photoId: string, buffer: Buffer): Promise<string>;
  saveThumbnail(projectId: string, photoId: string, buffer: Buffer): Promise<string>;
  deleteByKey(storageKey: string): Promise<void>;
  absolutePath(storageKey: string): string;
  renderOutputPath(projectId: string, jobId: string): { absolutePath: string; storageKey: string };
  publicUrl(storageKey: string): string;
}

class LocalDiskStorage implements StorageAdapter {
  constructor(private readonly baseDir: string) {}

  private ensureDir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
  }

  async savePhoto(projectId: string, photoId: string, buffer: Buffer): Promise<string> {
    const storageKey = `uploads/${projectId}/${photoId}.jpg`;
    const abs = this.absolutePath(storageKey);
    this.ensureDir(path.dirname(abs));
    await fs.promises.writeFile(abs, buffer);
    return storageKey;
  }

  async saveThumbnail(projectId: string, photoId: string, buffer: Buffer): Promise<string> {
    const storageKey = `thumbnails/${projectId}/${photoId}.jpg`;
    const abs = this.absolutePath(storageKey);
    this.ensureDir(path.dirname(abs));
    await fs.promises.writeFile(abs, buffer);
    return storageKey;
  }

  async deleteByKey(storageKey: string): Promise<void> {
    const abs = this.absolutePath(storageKey);
    await fs.promises.rm(abs, { force: true });
  }

  absolutePath(storageKey: string): string {
    const resolved = path.resolve(this.baseDir, storageKey);
    if (!resolved.startsWith(path.resolve(this.baseDir))) {
      throw new Error(`Refusing to resolve storage key outside base dir: ${storageKey}`);
    }
    return resolved;
  }

  renderOutputPath(projectId: string, jobId: string): { absolutePath: string; storageKey: string } {
    const storageKey = `renders/${projectId}/${jobId}.mp4`;
    const abs = this.absolutePath(storageKey);
    this.ensureDir(path.dirname(abs));
    return { absolutePath: abs, storageKey };
  }

  publicUrl(storageKey: string): string {
    return `/media/${storageKey}`;
  }
}

export const storage: StorageAdapter = new LocalDiskStorage(STORAGE_DIR);
