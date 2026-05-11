import { useRef, useCallback } from 'react';
import { usePrototype } from '../../context/PrototypeContext';
import FilmstripItem from './FilmstripItem';

export default function Filmstrip() {
  const { state, dispatch, addScreensFromFiles } = usePrototype();
  const dragFrom = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragFrom.current = index;
  }, []);

  const handleDrop = useCallback(() => {
    // drop target index is stored via onDragOver
  }, []);

  const handleDragOver = useCallback(
    (toIndex: number) => {
      const fromIndex = dragFrom.current;
      if (fromIndex === null || fromIndex === toIndex) return;
      dispatch({ type: 'REORDER_SCREENS', fromIndex, toIndex });
      dragFrom.current = toIndex;
    },
    [dispatch]
  );

  const handleFileAdd = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = () => {
      if (input.files?.length) {
        addScreensFromFiles(Array.from(input.files));
      }
    };
    input.click();
  }, [addScreensFromFiles]);

  return (
    <aside className="w-48 flex-shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col overflow-hidden" style={{ backgroundColor: '#1a1f2e' }}>
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Screens</span>
        <button
          onClick={handleFileAdd}
          className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-sm leading-none transition-colors"
          title="Add screens"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {state.screens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-gray-600 text-xs px-2">
            <p>Drop images here</p>
            <p className="mt-1">or click + above</p>
          </div>
        ) : (
          state.screens.map((screen, i) => (
            <FilmstripItem
              key={screen.id}
              screen={screen}
              index={i}
              isActive={screen.id === state.activeScreenId}
              onClick={() => dispatch({ type: 'SET_ACTIVE_SCREEN', id: screen.id })}
              onDelete={() => dispatch({ type: 'REMOVE_SCREEN', id: screen.id })}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>
    </aside>
  );
}
