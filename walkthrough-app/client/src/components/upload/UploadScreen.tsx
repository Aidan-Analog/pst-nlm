import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../common/Header';
import { StepperNav } from '../common/StepperNav';
import { UploadDropzone } from './UploadDropzone';
import { useProject } from '../../hooks/useProject';
import { api } from '../../lib/api';

export function UploadScreen() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useProject(id);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ address: '', priceDisplay: '', agentName: '' });
  const navigate = useNavigate();

  async function handleFiles(files: FileList) {
    if (!id) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await api.uploadPhotos(id, files);
      if (result.failed.length > 0) {
        setUploadError(`${result.failed.length} photo(s) failed to upload: ${result.failed.map((f) => f.filename).join(', ')}`);
      }
      await reload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function saveMetaAndContinue() {
    if (!id) return;
    const payload: Record<string, string> = {};
    if (meta.address) payload.address = meta.address;
    if (meta.priceDisplay) payload.priceDisplay = meta.priceDisplay;
    if (meta.agentName) payload.agentName = meta.agentName;
    if (Object.keys(payload).length > 0) {
      await api.updateProject(id, payload);
    }
    navigate(`/projects/${id}/reorder`);
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
        <StepperNav current="upload" />
        <h1 className="mb-1 text-xl font-semibold text-slate-900">{data.project.title}</h1>
        <p className="mb-6 text-sm text-slate-500">Upload the listing photos you own or are licensed to use.</p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {uploadError && <p className="mb-4 text-sm text-red-600">{uploadError}</p>}

        <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <input
            placeholder="Address"
            value={meta.address}
            onChange={(e) => setMeta((m) => ({ ...m, address: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Price (e.g. AMV €395,000)"
            value={meta.priceDisplay}
            onChange={(e) => setMeta((m) => ({ ...m, priceDisplay: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Agent / agency name"
            value={meta.agentName}
            onChange={(e) => setMeta((m) => ({ ...m, agentName: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <UploadDropzone onFiles={handleFiles} uploading={uploading} />

        {data.photos.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {data.photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.thumbnailUrl}
                alt={photo.originalFilename ?? 'Uploaded photo'}
                className="aspect-video w-full rounded-md object-cover"
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={saveMetaAndContinue}
            disabled={data.photos.length === 0}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Continue to reorder ({data.photos.length} photo{data.photos.length === 1 ? '' : 's'})
          </button>
        </div>
      </div>
    </div>
  );
}
