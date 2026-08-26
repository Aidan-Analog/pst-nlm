import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { RenderJob } from '../types/renderJob';

const POLL_INTERVAL_MS = 2000;

export function useRenderJob(jobId: string | undefined) {
  const [job, setJob] = useState<RenderJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const latest = await api.getRenderJob(jobId);
        if (cancelled) return;
        setJob(latest);
        if (latest.status === 'queued' || latest.status === 'processing') {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to check render status');
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [jobId]);

  return { job, error };
}
