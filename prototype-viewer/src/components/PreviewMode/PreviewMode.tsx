import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrototype } from '../../context/PrototypeContext';
import ScreenRenderer from './ScreenRenderer';
import type { Hotspot, Transition } from '../../types/prototype';
import { ENTER_CLASS, EXIT_CLASS } from '../../utils/transitions';

type Phase = 'idle' | 'transitioning';

interface Props {
  onClose: () => void;
}

export default function PreviewMode({ onClose }: Props) {
  const { state } = usePrototype();
  const { screens } = state;

  const startId = state.activeScreenId ?? screens[0]?.id ?? null;
  const [currentId, setCurrentId] = useState<string | null>(startId);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeTransition, setActiveTransition] = useState<Transition | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const navigateTo = useCallback(
    (hotspot: Hotspot) => {
      if (phase === 'transitioning') return;
      const target = screens.find((s) => s.id === hotspot.targetScreenId);
      if (!target) return;

      setPrevId(currentId);
      setCurrentId(target.id);
      setActiveTransition(hotspot.transition);
      setPhase('transitioning');

      timerRef.current = setTimeout(() => {
        setPrevId(null);
        setActiveTransition(null);
        setPhase('idle');
      }, hotspot.transition.duration + 30);
    },
    [phase, currentId, screens]
  );

  const current = screens.find((s) => s.id === currentId) ?? null;
  const prev = screens.find((s) => s.id === prevId) ?? null;
  const currentIndex = current ? screens.indexOf(current) : -1;

  const cssVars = activeTransition
    ? ({
        ['--tx-duration' as string]: `${activeTransition.duration}ms`,
        ['--tx-easing' as string]: activeTransition.easing,
      } as React.CSSProperties)
    : {};

  const enterClass = activeTransition ? ENTER_CLASS[activeTransition.type] : '';
  const leaveClass = activeTransition ? EXIT_CLASS[activeTransition.type] : '';

  const goToIndex = (idx: number) => {
    const s = screens[idx];
    if (!s || s.id === currentId) return;
    setPrevId(currentId);
    setCurrentId(s.id);
    setActiveTransition(s.enterTransition);
    setPhase('transitioning');
    timerRef.current = setTimeout(() => {
      setPrevId(null);
      setActiveTransition(null);
      setPhase('idle');
    }, s.enterTransition.duration + 30);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" style={cssVars}>
      {/* Close bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          {screens.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goToIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${s.id === currentId ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/60'}`}
              title={s.name}
            />
          ))}
        </div>
        <span className="text-white/60 text-xs">
          {current?.name ?? ''} ({currentIndex + 1}/{screens.length})
        </span>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors"
        >
          <span>Close</span>
          <kbd className="px-1 py-0.5 bg-white/10 rounded text-xs">Esc</kbd>
        </button>
      </div>

      {/* Screen area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Outgoing screen */}
        {prev && phase === 'transitioning' && (
          <div className={`absolute inset-0 ${leaveClass}`}>
            <ScreenRenderer
              screen={prev}
              phase="leaving"
              onHotspotClick={() => {}}
            />
          </div>
        )}

        {/* Current / incoming screen */}
        {current && (
          <div className={`absolute inset-0 ${phase === 'transitioning' ? enterClass : ''}`}>
            <ScreenRenderer
              screen={current}
              phase={phase === 'idle' ? 'active' : 'entering'}
              onHotspotClick={navigateTo}
            />
          </div>
        )}

        {!current && (
          <div className="flex items-center justify-center h-full text-white/40">
            No screens added
          </div>
        )}
      </div>
    </div>
  );
}
