import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../common/Header';
import { StepperNav } from '../common/StepperNav';
import { useProject } from '../../hooks/useProject';
import { api } from '../../lib/api';
import type { MusicTrack } from '../../types/renderJob';

export function RenderOptionsForm() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useProject(id);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [musicTrackId, setMusicTrackId] = useState<string | null>(null);
  const [showAddressOverlay, setShowAddressOverlay] = useState(true);
  const [showRoomLabels, setShowRoomLabels] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.listMusicTracks().then((res) => setTracks(res.tracks));
  }, []);

  async function handleGenerate() {
    if (!id) return;
    setStarting(true);
    setError(null);
    try {
      const { jobId } = await api.startRender(id, { musicTrackId, showAddressOverlay, showRoomLabels });
      navigate(`/projects/${id}/progress/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start render');
      setStarting(false);
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
        <StepperNav current="render" />
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Render options</h1>
        <p className="mb-6 text-sm text-slate-500">
          {data.photos.length} photo{data.photos.length === 1 ? '' : 's'}, ~5s each with a 1s crossfade between rooms.
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Background music</label>
            <select
              value={musicTrackId ?? ''}
              onChange={(e) => setMusicTrackId(e.target.value || null)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No music</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name} ({Math.round(track.durationSec)}s)
                </option>
              ))}
            </select>
            {tracks.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                No tracks added yet — see walkthrough-app/assets/music/README.md to add licensed music.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showAddressOverlay}
              onChange={(e) => setShowAddressOverlay(e.target.checked)}
              disabled={!data.project.address}
            />
            Show address overlay on the opening shot
            {!data.project.address && <span className="text-xs text-slate-400">(add an address on the upload step)</span>}
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={showRoomLabels} onChange={(e) => setShowRoomLabels(e.target.checked)} />
            Show room labels where set
          </label>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={starting}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {starting ? 'Starting…' : 'Generate walkthrough'}
          </button>
        </div>
      </div>
    </div>
  );
}
