import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../common/Header';
import { StepperNav } from '../common/StepperNav';
import { PhotoReorderGrid } from './PhotoReorderGrid';
import { useProject } from '../../hooks/useProject';
import { api } from '../../lib/api';
import type { ProjectDetail } from '../../lib/api';
import type { Photo } from '../../types/photo';

export function ReorderScreen() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, reload } = useProject(id);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Seed local (reorderable) photo state from `data` as soon as it loads,
  // without an effect - this is React's documented "adjust state while
  // rendering" pattern (react.dev/learn/you-might-not-need-an-effect) for
  // syncing local state from a prop/value that only becomes available later.
  const [seededFrom, setSeededFrom] = useState<ProjectDetail | null>(null);
  if (data && data !== seededFrom) {
    setSeededFrom(data);
    setPhotos(data.photos);
  }

  function handleReorder(photoIds: string[]) {
    const byId = new Map(photos.map((p) => [p.id, p]));
    setPhotos(photoIds.map((pid) => byId.get(pid)!).filter(Boolean));
  }

  function handleRoomLabelChange(photoId: string, roomLabel: string) {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, roomLabel } : p)));
  }

  async function handleRoomLabelBlur(photoId: string, roomLabel: string) {
    if (!id) return;
    try {
      await api.setRoomLabel(id, photoId, roomLabel || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save room label');
    }
  }

  async function handleDelete(photoId: string) {
    if (!id) return;
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    try {
      await api.deletePhoto(id, photoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
      await reload();
    }
  }

  async function handleSaveAndContinue() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await api.reorderPhotos(id, photos.map((p) => p.id));
      navigate(`/projects/${id}/render`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save photo order');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <div>
        <Header />
        <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <StepperNav current="reorder" />
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Order the walkthrough</h1>
        <p className="mb-6 text-sm text-slate-500">
          Drag photos into the order you want them to appear — e.g. exterior, hallway, kitchen, bedrooms, garden.
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {photos.length === 0 ? (
          <p className="text-sm text-slate-400">No photos yet.</p>
        ) : (
          <PhotoReorderGrid
            photos={photos}
            onReorder={handleReorder}
            onDelete={handleDelete}
            onRoomLabelChange={handleRoomLabelChange}
            onRoomLabelBlur={handleRoomLabelBlur}
          />
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveAndContinue}
            disabled={saving || photos.length === 0}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
