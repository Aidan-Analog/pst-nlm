import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../common/Header';
import { StepperNav } from '../common/StepperNav';
import { useProject } from '../../hooks/useProject';

export function PreviewScreen() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useProject(id);
  const navigate = useNavigate();

  if (loading || !data) {
    return (
      <div>
        <Header />
        <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  const job = data.latestRenderJob;

  return (
    <div>
      <Header />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <StepperNav current="preview" />
        <h1 className="mb-1 text-xl font-semibold text-slate-900">{data.project.title}</h1>
        <p className="mb-6 text-sm text-slate-500">Your walkthrough is ready.</p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!job || job.status !== 'done' || !job.outputUrl ? (
          <p className="text-sm text-slate-400">No finished render yet for this project.</p>
        ) : (
          <>
            <video controls className="w-full rounded-lg border border-slate-200 bg-black" src={job.outputUrl} />
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`/api/render-jobs/${job.id}/download`}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
              >
                Download video
              </a>
              <button
                onClick={() => id && navigate(`/projects/${id}/render`)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Re-render with different options
              </button>
              <button
                onClick={() => navigate('/')}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                New walkthrough
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
