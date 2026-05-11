import { useState, useEffect } from 'react';

interface Props {
  onDrop: (files: File[]) => void;
}

export default function DropZone({ onDrop }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let counter = 0;

    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      counter++;
      setVisible(true);
    };
    const onLeave = () => {
      counter--;
      if (counter === 0) setVisible(false);
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      counter = 0;
      setVisible(false);
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  if (!visible) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setVisible(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) onDrop(files);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm pointer-events-auto"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="flex flex-col items-center gap-3 p-12 border-2 border-dashed border-blue-400 rounded-2xl text-blue-300">
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-xl font-semibold">Drop screens here</p>
        <p className="text-sm text-blue-400/70">PNG, JPG, WebP accepted</p>
      </div>
    </div>
  );
}
