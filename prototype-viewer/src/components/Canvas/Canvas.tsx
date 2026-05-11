import { useRef, useEffect, useState, useCallback } from 'react';
import { usePrototype } from '../../context/PrototypeContext';
import HotspotLayer from './HotspotLayer';
import MicroInteractionLayer from './MicroInteractionLayer';
import type { Hotspot, MicroInteraction } from '../../types/prototype';

interface Props {
  onDrop: (files: File[]) => void;
}

export default function Canvas({ onDrop }: Props) {
  const { state, dispatch, activeScreen } = usePrototype();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const e = entries[0];
      setCanvasSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const scaleToFit = Math.min(
    canvasSize.w / imgNaturalSize.w,
    canvasSize.h / imgNaturalSize.h,
    1
  );
  const scaledW = imgNaturalSize.w * scaleToFit;
  const scaledH = imgNaturalSize.h * scaleToFit;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length) onDrop(files);
    },
    [onDrop]
  );

  const handleHotspotCreate = useCallback(
    (hotspot: Hotspot) => {
      if (!activeScreen) return;
      dispatch({ type: 'ADD_HOTSPOT', screenId: activeScreen.id, hotspot });
    },
    [activeScreen, dispatch]
  );

  const handleMicroCreate = useCallback(
    (micro: MicroInteraction) => {
      if (!activeScreen) return;
      dispatch({ type: 'ADD_MICRO', screenId: activeScreen.id, micro });
    },
    [activeScreen, dispatch]
  );

  const MODE_HINT: Record<string, string> = {
    select: 'Click a hotspot or micro-interaction to edit  ·  V',
    hotspot: 'Drag to draw a hotspot  ·  H',
    micro: 'Drag to draw a micro-interaction zone  ·  M',
  };

  return (
    <main
      ref={containerRef}
      className="flex-1 flex flex-col items-center justify-center overflow-hidden bg-gray-900 relative"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {!activeScreen ? (
        <div className="flex flex-col items-center gap-3 text-gray-600 select-none">
          <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21l6.75-6.75M3 3h18v18H3z" />
          </svg>
          <p className="text-lg">Drop screen shots to get started</p>
          <p className="text-sm">or use the + button in the Screens panel</p>
        </div>
      ) : (
        <>
          <div
            className="relative shadow-2xl"
            style={{ width: scaledW, height: scaledH }}
          >
            <img
              ref={imgRef}
              src={activeScreen.imageDataUrl}
              alt={activeScreen.name}
              className="absolute inset-0 w-full h-full object-fill select-none"
              draggable={false}
              onLoad={() => {
                if (imgRef.current) {
                  setImgNaturalSize({
                    w: imgRef.current.naturalWidth || 1,
                    h: imgRef.current.naturalHeight || 1,
                  });
                }
              }}
            />

            {/* Hotspot layer is always visible in select/hotspot modes */}
            {state.editMode !== 'micro' && (
              <HotspotLayer
                hotspots={activeScreen.hotspots}
                selectedId={state.selectedHotspotId}
                editMode={state.editMode}
                scaledWidth={scaledW}
                scaledHeight={scaledH}
                onSelect={(id) => dispatch({ type: 'SELECT_HOTSPOT', id })}
                onCreate={handleHotspotCreate}
                onDeselect={() => dispatch({ type: 'DESELECT' })}
              />
            )}

            {/* Micro layer is always visible in select/micro modes */}
            {state.editMode !== 'hotspot' && (
              <MicroInteractionLayer
                micros={activeScreen.microInteractions}
                selectedId={state.selectedMicroId}
                editMode={state.editMode}
                scaledWidth={scaledW}
                scaledHeight={scaledH}
                onSelect={(id) => dispatch({ type: 'SELECT_MICRO', id })}
                onCreate={handleMicroCreate}
                onDeselect={() => dispatch({ type: 'DESELECT' })}
              />
            )}
          </div>

          {/* Mode hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-800/90 text-gray-400 text-xs px-3 py-1.5 rounded-full">
            {MODE_HINT[state.editMode]}
          </div>
        </>
      )}
    </main>
  );
}
