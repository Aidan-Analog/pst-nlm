const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'reorder', label: 'Reorder' },
  { key: 'render', label: 'Render options' },
  { key: 'preview', label: 'Preview' },
] as const;

export type StepKey = (typeof STEPS)[number]['key'];

export function StepperNav({ current }: { current: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const isActive = step.key === current;
        const isDone = index < currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ' +
                (isActive
                  ? 'bg-indigo-600 text-white'
                  : isDone
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-200 text-slate-500')
              }
            >
              {index + 1}
            </span>
            <span className={isActive ? 'font-medium text-slate-900' : 'text-slate-500'}>{step.label}</span>
            {index < STEPS.length - 1 && <span className="mx-1 text-slate-300">&rarr;</span>}
          </li>
        );
      })}
    </ol>
  );
}
