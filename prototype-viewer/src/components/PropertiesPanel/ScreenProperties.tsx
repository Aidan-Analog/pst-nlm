import { usePrototype } from '../../context/PrototypeContext';
import type { TransitionType, Easing } from '../../types/prototype';
import { TRANSITION_LABELS } from '../../utils/transitions';

const TRANSITION_TYPES: TransitionType[] = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale'];
const EASINGS: Easing[] = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'];

export default function ScreenProperties() {
  const { activeScreen, dispatch } = usePrototype();
  if (!activeScreen) return null;

  const t = activeScreen.enterTransition;

  const update = (patch: Partial<typeof t>) =>
    dispatch({
      type: 'UPDATE_SCREEN_TRANSITION',
      screenId: activeScreen.id,
      transition: { ...t, ...patch },
    });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Screen</p>
        <p className="text-sm font-medium text-gray-100 truncate">{activeScreen.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {activeScreen.hotspots.length} hotspot{activeScreen.hotspots.length !== 1 ? 's' : ''}
          {' · '}
          {activeScreen.microInteractions.length} micro-interaction{activeScreen.microInteractions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <hr className="border-gray-700" />

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Enter Transition</p>

        <label className="block text-xs text-gray-400 mb-1">Type</label>
        <select
          value={t.type}
          onChange={(e) => update({ type: e.target.value as TransitionType })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        >
          {TRANSITION_TYPES.map((tt) => (
            <option key={tt} value={tt}>{TRANSITION_LABELS[tt]}</option>
          ))}
        </select>

        {t.type !== 'none' && (
          <>
            <label className="block text-xs text-gray-400 mb-1 mt-3">Duration (ms)</label>
            <input
              type="number"
              min={50}
              max={5000}
              step={50}
              value={t.duration}
              onChange={(e) => update({ duration: Number(e.target.value) })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
            />

            <label className="block text-xs text-gray-400 mb-1 mt-3">Easing</label>
            <select
              value={t.easing}
              onChange={(e) => update({ easing: e.target.value as Easing })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
            >
              {EASINGS.map((ea) => <option key={ea} value={ea}>{ea}</option>)}
            </select>
          </>
        )}
      </div>
    </div>
  );
}
