export type ProjectStatus = 'draft' | 'rendering' | 'ready';

export interface Project {
  id: string;
  title: string;
  address: string | null;
  priceDisplay: string | null;
  agentName: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  projectId: string;
  storageKey: string;
  thumbnailKey: string;
  orderIndex: number;
  roomLabel: string | null;
  originalFilename: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

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
