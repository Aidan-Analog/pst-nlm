import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Project } from '../types/project';

const STATUS_LABEL: Record<Project['status'], string> = {
  draft: 'Draft',
  rendering: 'Rendering…',
  ready: 'Ready',
};

const STATUS_CLASS: Record<Project['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  rendering: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
};

export function ProjectListScreen() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listProjects()
      .then((res) => setProjects(res.projects))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load projects'));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { project } = await api.createProject({ title: title.trim() });
      navigate(`/projects/${project.id}/upload`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Your walkthroughs</h1>
      <p className="mb-8 text-sm text-slate-500">
        Upload your own listing photos and turn them into a polished video walkthrough — no camera crew required.
      </p>

      <form onSubmit={handleCreate} className="mb-8 flex gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New listing title, e.g. 12 Ashgrove Terrace, Cork"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          New walkthrough
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!projects ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-slate-400">No walkthroughs yet — create one above.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                onClick={() => navigate(`/projects/${project.id}/upload`)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{project.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[project.status]}`}>
                  {STATUS_LABEL[project.status]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
