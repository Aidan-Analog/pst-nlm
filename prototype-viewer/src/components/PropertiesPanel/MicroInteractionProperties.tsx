import { usePrototype } from '../../context/PrototypeContext';
import type { AnimationType, MicroTrigger, Easing } from '../../types/prototype';

const ANIMATIONS: { value: AnimationType; label: string }[] = [
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-in-left', label: 'Slide In Left' },
  { value: 'slide-in-right', label: 'Slide In Right' },
  { value: 'slide-in-up', label: 'Slide In Up' },
  { value: 'slide-in-down', label: 'Slide In Down' },
  { value: 'scale-in', label: 'Scale In' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'bounce', label: 'Bounce' },
];

const TRIGGERS: { value: MicroTrigger; label: string; desc: string }[] = [
  { value: 'on-enter', label: '▶ On Enter', desc: 'Fires when the screen loads' },
  { value: 'on-hover', label: '⊙ On Hover', desc: 'Fires when mouse enters zone' },
  { value: 'on-click', label: '✦ On Click', desc: 'Fires when zone is clicked' },
];

const EASINGS: Easing[] = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'];

export default function MicroInteractionProperties() {
  const { state, activeScreen, dispatch } = usePrototype();
  if (!activeScreen || !state.selectedMicroId) return null;

  const micro = activeScreen.microInteractions.find((m) => m.id === state.selectedMicroId);
  if (!micro) return null;

  const update = (patch: Partial<typeof micro>) =>
    dispatch({
      type: 'UPDATE_MICRO',
      screenId: activeScreen.id,
      micro: { ...micro, ...patch },
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Micro-interaction</p>
        <button
          onClick={() => dispatch({ type: 'DELETE_MICRO', screenId: activeScreen.id, microId: micro.id })}
          className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-900/30 transition-colors"
        >
          Delete
        </button>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Animation</label>
        <select
          value={micro.animation}
          onChange={(e) => update({ animation: e.target.value as AnimationType })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        >
          {ANIMATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Trigger</label>
        <div className="space-y-1">
          {TRIGGERS.map((tr) => (
            <label key={tr.value} className="flex items-start gap-2 cursor-pointer group">
              <input
                type="radio"
                name="trigger"
                value={tr.value}
                checked={micro.trigger === tr.value}
                onChange={() => update({ trigger: tr.value })}
                className="mt-0.5 accent-blue-500"
              />
              <div>
                <span className="text-sm text-gray-200 group-hover:text-white">{tr.label}</span>
                <p className="text-xs text-gray-500">{tr.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-700" />

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Timing</p>

        <label className="block text-xs text-gray-400 mb-1">Duration (ms)</label>
        <input
          type="number"
          min={50}
          max={5000}
          step={50}
          value={micro.duration}
          onChange={(e) => update({ duration: Number(e.target.value) })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        />

        <label className="block text-xs text-gray-400 mb-1 mt-3">Delay (ms)</label>
        <input
          type="number"
          min={0}
          max={5000}
          step={50}
          value={micro.delay}
          onChange={(e) => update({ delay: Number(e.target.value) })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        />

        <label className="block text-xs text-gray-400 mb-1 mt-3">Easing</label>
        <select
          value={micro.iterationCount === 'infinite' ? 'infinite' : 'once'}
          onChange={(e) => update({ iterationCount: e.target.value === 'infinite' ? 'infinite' : 1 })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500 mb-3"
        >
          <option value="once">Play once</option>
          <option value="infinite">Loop</option>
        </select>

        <label className="block text-xs text-gray-400 mb-1">Easing</label>
        <select
          value={micro.easing}
          onChange={(e) => update({ easing: e.target.value as Easing })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        >
          {EASINGS.map((ea) => <option key={ea} value={ea}>{ea}</option>)}
        </select>
      </div>
    </div>
  );
}
