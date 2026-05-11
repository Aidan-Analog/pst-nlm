import { useRef, useState, useCallback } from 'react';
import type { Hotspot, Rect, EditMode } from '../../types/prototype';
import { DEFAULT_TRANSITION } from '../../types/prototype';

interface Props {
  hotspots: Hotspot[];
  selectedId: string | null;
  editMode: EditMode;
  scaledWidth: number;
  scaledHeight: number;
  onSelect: (id: string) => void;
  onCreate: (hotspot: Hotspot) => void;
  onDeselect: () => void;
}

function pxToRect(x: number, y: number, w: number, h: number, sw: number, sh: number): Rect {
  return {
    x: (Math.min(x, x + w) / sw) * 100,
    y: (Math.min(y, y + h) / sh) * 100,
    width: (Math.abs(w) / sw) * 100,
    height: (Math.abs(h) / sh) * 100,
  };
}

function rectToPx(r: Rect, sw: number, sh: number) {
  return {
    left: (r.x / 100) * sw,
    top: (r.y / 100) * sh,
    width: (r.width / 100) * sw,
    height: (r.height / 100) * sh,
  };
}

export default function HotspotLayer({
  hotspots, selectedId, editMode, scaledWidth, scaledHeight, onSelect, onCreate, onDeselect,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef<{ startX: number; startY: number } | null>(null);
  const [preview, setPreview] = useState<Rect | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editMode !== 'hotspot') return;
      const rect = layerRef.current!.getBoundingClientRect();
      drawing.current = { startX: e.clientX - rect.left, startY: e.clientY - rect.top };
      e.stopPropagation();
    },
    [editMode]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing.current) return;
      const rect = layerRef.current!.getBoundingClientRect();
      const dx = e.clientX - rect.left - drawing.current.startX;
      const dy = e.clientY - rect.top - drawing.current.startY;
      setPreview(pxToRect(drawing.current.startX, drawing.current.startY, dx, dy, scaledWidth, scaledHeight));
    },
    [scaledWidth, scaledHeight]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing.current) return;
      const rect = layerRef.current!.getBoundingClientRect();
      const dx = e.clientX - rect.left - drawing.current.startX;
      const dy = e.clientY - rect.top - drawing.current.startY;
      const r = pxToRect(drawing.current.startX, drawing.current.startY, dx, dy, scaledWidth, scaledHeight);
      drawing.current = null;
      setPreview(null);
      if (r.width > 1 && r.height > 1) {
        onCreate({
          id: crypto.randomUUID(),
          rect: r,
          targetScreenId: '',
          transition: { ...DEFAULT_TRANSITION },
        });
      }
    },
    [scaledWidth, scaledHeight, onCreate]
  );

  const handleBgClick = useCallback(
    (e: React.MouseEvent) => {
      if (editMode === 'select' && e.target === layerRef.current) onDeselect();
    },
    [editMode, onDeselect]
  );

  return (
    <div
      ref={layerRef}
      className={`absolute inset-0 ${editMode === 'hotspot' ? 'canvas-crosshair' : ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={handleBgClick}
    >
      {hotspots.map((hs) => {
        const px = rectToPx(hs.rect, scaledWidth, scaledHeight);
        const isSelected = hs.id === selectedId;
        return (
          <div
            key={hs.id}
            className={`hotspot-overlay ${isSelected ? 'selected' : ''}`}
            style={{ left: px.left, top: px.top, width: px.width, height: px.height }}
            onClick={(e) => { e.stopPropagation(); onSelect(hs.id); }}
            title={hs.targetScreenId ? undefined : 'No target set'}
          >
            {!hs.targetScreenId && (
              <span className="absolute top-0 right-0 bg-yellow-500 text-black text-xs px-1 rounded-bl">!</span>
            )}
          </div>
        );
      })}

      {preview && (
        <div
          className="draw-preview-rect"
          style={{
            left: (preview.x / 100) * scaledWidth,
            top: (preview.y / 100) * scaledHeight,
            width: (preview.width / 100) * scaledWidth,
            height: (preview.height / 100) * scaledHeight,
          }}
        />
      )}
    </div>
  );
}
