import { usePrototype } from '../../context/PrototypeContext';
import type { TransitionType, Easing } from '../../types/prototype';
import { TRANSITION_LABELS } from '../../utils/transitions';

const TRANSITION_TYPES: TransitionType[] = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale'];
const EASINGS: Easing[] = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'];

export default function HotspotProperties() {
  const { state, activeScreen, dispatch } = usePrototype();
  if (!activeScreen || !state.selectedHotspotId) return null;

  const hotspot = activeScreen.hotspots.find((h) => h.id === state.selectedHotspotId);
  if (!hotspot) return null;

  const update = (patch: Partial<typeof hotspot>) =>
    dispatch({
      type: 'UPDATE_HOTSPOT',
      screenId: activeScreen.id,
      hotspot: { ...hotspot, ...patch },
    });

  const updateTransition = (patch: Partial<typeof hotspot.transition>) =>
    update({ transition: { ...hotspot.transition, ...patch } });

  const otherScreens = state.screens.filter((s) => s.id !== activeScreen.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hotspot</p>
        <button
          onClick={() => dispatch({ type: 'DELETE_HOTSPOT', screenId: activeScreen.id, hotspotId: hotspot.id })}
          className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-900/30 transition-colors"
        >
          Delete
        </button>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Navigate to</label>
        <select
          value={hotspot.targetScreenId}
          onChange={(e) => update({ targetScreenId: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        >
          <option value="">— select screen —</option>
          {otherScreens.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1 + (state.screens.indexOf(activeScreen) < state.screens.indexOf(s) ? 1 : 0)} · {s.name}
            </option>
          ))}
        </select>
        {!hotspot.targetScreenId && (
          <p className="text-xs text-yellow-500 mt-1">Set a target screen for this hotspot to work in preview</p>
        )}
      </div>

      <hr className="border-gray-700" />

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Transition</p>

        <label className="block text-xs text-gray-400 mb-1">Type</label>
        <select
          value={hotspot.transition.type}
          onChange={(e) => updateTransition({ type: e.target.value as TransitionType })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        >
          {TRANSITION_TYPES.map((tt) => (
            <option key={tt} value={tt}>{TRANSITION_LABELS[tt]}</option>
          ))}
        </select>

        {hotspot.transition.type !== 'none' && (
          <>
            <label className="block text-xs text-gray-400 mb-1 mt-3">Duration (ms)</label>
            <input
              type="number"
              min={50}
              max={5000}
              step={50}
              value={hotspot.transition.duration}
              onChange={(e) => updateTransition({ duration: Number(e.target.value) })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
            />

            <label className="block text-xs text-gray-400 mb-1 mt-3">Easing</label>
            <select
              value={hotspot.transition.easing}
              onChange={(e) => updateTransition({ easing: e.target.value as Easing })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
            >
              {EASINGS.map((ea) => <option key={ea} value={ea}>{ea}</option>)}
            </select>
          </>
        )}
      </div>

      <div className="text-xs text-gray-600">
        Position: {hotspot.rect.x.toFixed(1)}%,{hotspot.rect.y.toFixed(1)}% ·{' '}
        {hotspot.rect.width.toFixed(1)}×{hotspot.rect.height.toFixed(1)}%
      </div>
    </div>
  );
}
