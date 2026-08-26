import type { Project } from '../types/project';
import type { Photo } from '../types/photo';
import type { MusicTrack, RenderJob, RenderOptions } from '../types/renderJob';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ProjectDetail {
  project: Project;
  photos: Photo[];
  latestRenderJob: RenderJob | null;
}

export const api = {
  listProjects: () => request<{ projects: Project[] }>('/api/projects'),

  createProject: (input: { title: string; address?: string; priceDisplay?: string; agentName?: string }) =>
    request<{ project: Project }>('/api/projects', { method: 'POST', body: JSON.stringify(input) }),

  getProject: (id: string) => request<ProjectDetail>(`/api/projects/${id}`),

  updateProject: (id: string, input: Partial<{ title: string; address: string; priceDisplay: string; agentName: string }>) =>
    request<{ project: Project }>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  uploadPhotos: (projectId: string, files: FileList | File[]) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('photos', file));
    return request<{ photos: Photo[]; failed: { filename: string; error: string }[] }>(
      `/api/projects/${projectId}/photos`,
      { method: 'POST', body: formData }
    );
  },

  deletePhoto: (projectId: string, photoId: string) =>
    request<{ photos: Photo[] }>(`/api/projects/${projectId}/photos/${photoId}`, { method: 'DELETE' }),

  reorderPhotos: (projectId: string, photoIds: string[]) =>
    request<{ photos: Photo[] }>(`/api/projects/${projectId}/photos/order`, {
      method: 'PUT',
      body: JSON.stringify({ photoIds }),
    }),

  setRoomLabel: (projectId: string, photoId: string, roomLabel: string | null) =>
    request<{ photo: Photo }>(`/api/projects/${projectId}/photos/${photoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ roomLabel }),
    }),

  listMusicTracks: () => request<{ tracks: MusicTrack[] }>('/api/music-tracks'),

  startRender: (projectId: string, options: RenderOptions) =>
    request<{ jobId: string }>(`/api/projects/${projectId}/render`, { method: 'POST', body: JSON.stringify(options) }),

  getRenderJob: (jobId: string) => request<RenderJob>(`/api/render-jobs/${jobId}`),
};
