import { useCallback, useEffect, useState } from 'react';
import { api, type ProjectDetail } from '../lib/api';

export function useProject(projectId: string | undefined) {
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.getProject(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  return { data, loading, error, reload };
}
