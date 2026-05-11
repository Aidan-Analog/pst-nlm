import { usePrototype } from '../context/PrototypeContext';
import { exportJSON, importJSON } from '../utils/storage';
import type { EditMode } from '../types/prototype';

interface Props {
  onPreview: () => void;
}

const TOOLS: { mode: EditMode; label: string; key: string }[] = [
  { mode: 'select', label: 'Select', key: 'V' },
  { mode: 'hotspot', label: 'Hotspot', key: 'H' },
  { mode: 'micro', label: 'Micro', key: 'M' },
];

export default function Toolbar({ onPreview }: Props) {
  const { state, dispatch } = usePrototype();

  const handleExport = () => exportJSON(state);

  const handleImport = async () => {
    try {
      const loaded = await importJSON();
      dispatch({ type: 'LOAD_STATE', state: loaded });
    } catch {
      // user cancelled or invalid file — ignore
    }
  };

  const canPreview = state.screens.length > 0;

  return (
    <header className="h-11 flex items-center px-3 gap-3 border-b border-gray-700 bg-gray-800 flex-shrink-0">
      {/* Logo / Title */}
      <div className="flex items-center gap-2 text-white font-semibold text-sm mr-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.7-1.414 2.7H4.212c-1.444 0-2.414-1.7-1.414-2.7L4.2 15.3" />
        </svg>
        Prototype Viewer
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-700" />

      {/* Edit mode tools */}
      <div className="flex items-center gap-1 bg-gray-900 rounded-md p-0.5">
        {TOOLS.map(({ mode, label, key }) => (
          <button
            key={mode}
            onClick={() => dispatch({ type: 'SET_EDIT_MODE', mode })}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              state.editMode === mode
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title={`${label} (${key})`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Import / Export */}
      <button
        onClick={handleImport}
        className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
      >
        Import
      </button>
      <button
        onClick={handleExport}
        className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
        disabled={state.screens.length === 0}
      >
        Export
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Preview */}
      <button
        onClick={onPreview}
        disabled={!canPreview}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        Preview
      </button>
    </header>
  );
}
