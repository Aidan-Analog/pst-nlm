import { useRef, useState } from 'react';

export function UploadDropzone({ onFiles, uploading }: { onFiles: (files: FileList) => void; uploading: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={
        'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-16 text-center transition ' +
        (dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-slate-400')
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
      <p className="text-sm font-medium text-slate-700">
        {uploading ? 'Uploading…' : 'Drag photos here, or click to choose files'}
      </p>
      <p className="mt-1 text-xs text-slate-400">JPEG, PNG, WEBP, or HEIC — up to 60 photos</p>
    </div>
  );
}
