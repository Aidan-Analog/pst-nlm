import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ACTIVITY_CATEGORIES, type ActivityCategory } from './activities';
import { useNotifications } from './useNotifications';

type Status = 'idle' | 'submitting' | 'success' | 'error';

function CategorySection({
  category,
  checked,
  onToggle,
}: {
  category: ActivityCategory;
  checked: Record<string, boolean>;
  onToggle: (item: string) => void;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
        {category.label}
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {category.items.map((item) => (
          <label
            key={item}
            className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"
          >
            <input
              type="checkbox"
              className="accent-blue-600 w-4 h-4 flex-shrink-0"
              checked={!!checked[item]}
              onChange={() => onToggle(item)}
            />
            <span className="leading-tight">{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ActivityTrackerPage() {
  const { permissionState } = useNotifications();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function toggle(item: string) {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const body: Record<string, string> = { notes };
    for (const cat of ACTIVITY_CATEGORIES) {
      const selected = cat.items.filter((item) => checked[item]);
      body[cat.id] = selected.join(', ');
    }

    try {
      const res = await fetch('/api/tracker/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setStatus('success');
      setChecked({});
      setNotes('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <Link
            to="/"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Product Browser
          </Link>
        </div>

        {/* Notification denied banner */}
        {permissionState === 'denied' && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <strong>Notifications blocked.</strong> Enable them in your browser settings to receive
            4-hour reminders.
          </div>
        )}

        {/* Success message */}
        {status === 'success' && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            Logged successfully to your Google Sheet.
          </div>
        )}

        {/* Error message */}
        {status === 'error' && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
            <p className="text-sm text-gray-600 mb-6">
              Check everything you've done in the past 4 hours.
            </p>

            {ACTIVITY_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat.id}
                category={cat}
                checked={checked}
                onToggle={toggle}
              />
            ))}

            {/* Notes */}
            <div className="mt-2">
              <label className="block text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Notes
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={3}
                placeholder="Anything else you did or want to note…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'submitting'
              ? 'Saving…'
              : checkedCount > 0
              ? `Submit ${checkedCount} item${checkedCount === 1 ? '' : 's'}`
              : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
