import { useState, useEffect, useCallback } from 'react';
import { PrototypeProvider, usePrototype } from './context/PrototypeContext';
import Filmstrip from './components/Filmstrip/Filmstrip';
import Canvas from './components/Canvas/Canvas';
import PropertiesPanel from './components/PropertiesPanel/PropertiesPanel';
import Toolbar from './components/Toolbar';
import PreviewMode from './components/PreviewMode/PreviewMode';
import DropZone from './components/DropZone';

function AppInner() {
  const { state, dispatch, addScreensFromFiles } = usePrototype();
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleDrop = useCallback(
    async (files: File[]) => {
      await addScreensFromFiles(files);
    },
    [addScreensFromFiles]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

      if (e.key === 'Escape') {
        if (previewOpen) {
          setPreviewOpen(false);
        } else {
          dispatch({ type: 'DESELECT' });
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditable) {
        if (state.selectedHotspotId && state.activeScreenId) {
          dispatch({ type: 'DELETE_HOTSPOT', screenId: state.activeScreenId, hotspotId: state.selectedHotspotId });
        } else if (state.selectedMicroId && state.activeScreenId) {
          dispatch({ type: 'DELETE_MICRO', screenId: state.activeScreenId, microId: state.selectedMicroId });
        }
        return;
      }

      if (!previewOpen && !isEditable) {
        if (e.key === 'v') dispatch({ type: 'SET_EDIT_MODE', mode: 'select' });
        if (e.key === 'h') dispatch({ type: 'SET_EDIT_MODE', mode: 'hotspot' });
        if (e.key === 'm') dispatch({ type: 'SET_EDIT_MODE', mode: 'micro' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewOpen, state.selectedHotspotId, state.selectedMicroId, state.activeScreenId, dispatch]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Toolbar onPreview={() => setPreviewOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Filmstrip />
        <Canvas onDrop={handleDrop} />
        <PropertiesPanel />
      </div>
      <DropZone onDrop={handleDrop} />
      {previewOpen && <PreviewMode onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <PrototypeProvider>
      <AppInner />
    </PrototypeProvider>
  );
}
