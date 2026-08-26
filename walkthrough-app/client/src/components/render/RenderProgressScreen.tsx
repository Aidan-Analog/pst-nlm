import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../common/Header';
import { StepperNav } from '../common/StepperNav';
import { useRenderJob } from '../../hooks/useRenderJob';

export function RenderProgressScreen() {
  const { id, jobId } = useParams<{ id: string; jobId: string }>();
  const { job, error } = useRenderJob(jobId);
  const navigate = useNavigate();

  useEffect(() => {
    if (job?.status === 'done' && id) {
      navigate(`/projects/${id}/preview`);
    }
  }, [job?.status, id, navigate]);

  return (
    <div>
      <Header />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <StepperNav current="render" />
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Generating your walkthrough…</h1>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${job?.progressPercent ?? 0}%` }}
            />
          </div>
          <p className="text-sm text-slate-500">
            {job?.status === 'failed'
              ? 'Render failed.'
              : `${Math.round(job?.progressPercent ?? 0)}% — this can take a minute or two depending on how many photos you uploaded.`}
          </p>

          {job?.status === 'failed' && (
            <div className="mt-4">
              <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{job.errorMessage}</p>
              <button
                onClick={() => id && navigate(`/projects/${id}/render`)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
              >
                Back to render options
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
