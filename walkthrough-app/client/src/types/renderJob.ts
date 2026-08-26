export type RenderJobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface RenderOptions {
  musicTrackId: string | null;
  showAddressOverlay: boolean;
  showRoomLabels: boolean;
}

export interface RenderJob {
  id: string;
  projectId: string;
  status: RenderJobStatus;
  progressPercent: number;
  options: RenderOptions;
  outputKey: string | null;
  outputUrl: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  durationSec: number;
  previewUrl: string;
}
