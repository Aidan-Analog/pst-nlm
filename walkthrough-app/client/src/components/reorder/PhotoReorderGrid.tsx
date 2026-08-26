import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Photo } from '../../types/photo';

function SortablePhotoTile({
  photo,
  onDelete,
  onRoomLabelChange,
  onRoomLabelBlur,
}: {
  photo: Photo;
  onDelete: (photoId: string) => void;
  onRoomLabelChange: (photoId: string, roomLabel: string) => void;
  onRoomLabelBlur: (photoId: string, roomLabel: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="group relative rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <img
          src={photo.thumbnailUrl}
          alt={photo.originalFilename ?? 'Property photo'}
          className="aspect-video w-full rounded-md object-cover"
          draggable={false}
        />
      </div>
      <input
        value={photo.roomLabel ?? ''}
        onChange={(e) => onRoomLabelChange(photo.id, e.target.value)}
        onBlur={(e) => onRoomLabelBlur(photo.id, e.target.value)}
        placeholder="Room label (optional)"
        className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-xs"
      />
      <button
        onClick={() => onDelete(photo.id)}
        className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow group-hover:flex hover:text-red-600"
        aria-label="Remove photo"
        title="Remove photo"
      >
        &times;
      </button>
    </div>
  );
}

export function PhotoReorderGrid({
  photos,
  onReorder,
  onDelete,
  onRoomLabelChange,
  onRoomLabelBlur,
}: {
  photos: Photo[];
  onReorder: (photoIds: string[]) => void;
  onDelete: (photoId: string) => void;
  onRoomLabelChange: (photoId: string, roomLabel: string) => void;
  onRoomLabelBlur: (photoId: string, roomLabel: string) => void;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(photos, oldIndex, newIndex).map((p) => p.id));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <SortablePhotoTile
              key={photo.id}
              photo={photo}
              onDelete={onDelete}
              onRoomLabelChange={onRoomLabelChange}
              onRoomLabelBlur={onRoomLabelBlur}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
