import { useRef, useState, useCallback } from 'react';
import type { MicroInteraction, Rect, EditMode } from '../../types/prototype';

interface Props {
  micros: MicroInteraction[];
  selectedId: string | null;
  editMode: EditMode;
  scaledWidth: number;
  scaledHeight: number;
  onSelect: (id: string) => void;
  onCreate: (micro: MicroInteraction) => void;
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

const TRIGGER_ICONS: Record<string, string> = {
  'on-enter': '▶',
  'on-hover': '⊙',
  'on-click': '✦',
};

export default function MicroInteractionLayer({
  micros, selectedId, editMode, scaledWidth, scaledHeight, onSelect, onCreate, onDeselect,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef<{ startX: number; startY: number } | null>(null);
  const [preview, setPreview] = useState<Rect | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editMode !== 'micro') return;
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
          animation: 'fade-in',
          trigger: 'on-enter',
          delay: 0,
          duration: 400,
          easing: 'ease',
          iterationCount: 1,
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
      className={`absolute inset-0 ${editMode === 'micro' ? 'canvas-crosshair' : ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={handleBgClick}
    >
      {micros.map((m) => {
        const left = (m.rect.x / 100) * scaledWidth;
        const top = (m.rect.y / 100) * scaledHeight;
        const width = (m.rect.width / 100) * scaledWidth;
        const height = (m.rect.height / 100) * scaledHeight;
        const isSelected = m.id === selectedId;
        return (
          <div
            key={m.id}
            className={`micro-overlay ${isSelected ? 'selected' : ''}`}
            style={{ left, top, width, height }}
            onClick={(e) => { e.stopPropagation(); onSelect(m.id); }}
            title={`${m.animation} — ${m.trigger}`}
          >
            <span className="absolute top-0 left-0 bg-amber-500/80 text-black text-xs px-1 rounded-br leading-tight">
              {TRIGGER_ICONS[m.trigger]} {m.animation}
            </span>
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
            borderColor: '#f59e0b',
            background: 'rgba(245,158,11,0.15)',
          }}
        />
      )}
    </div>
  );
}
