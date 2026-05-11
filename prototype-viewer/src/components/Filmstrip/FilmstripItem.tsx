import { useRef } from 'react';
import type { ProtoScreen } from '../../types/prototype';

interface Props {
  screen: ProtoScreen;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: () => void;
}

export default function FilmstripItem({
  screen,
  index,
  isActive,
  onClick,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => { e.stopPropagation(); onDrop(); }}
      onClick={onClick}
      className={`group relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
        isActive ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-transparent hover:border-gray-600'
      }`}
    >
      <img
        src={screen.imageDataUrl}
        alt={screen.name}
        className="w-full aspect-video object-cover object-top"
        draggable={false}
      />

      {/* Index badge */}
      <div className="absolute top-1 left-1 bg-black/60 text-white text-xs font-mono px-1.5 py-0.5 rounded">
        {index + 1}
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-1 right-1 w-5 h-5 rounded bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
        title="Remove screen"
      >
        ×
      </button>

      {/* Screen name */}
      <div className="px-2 py-1 bg-gray-800 text-xs text-gray-300 truncate">
        {screen.name}
      </div>
    </div>
  );
}
