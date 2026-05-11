import { usePrototype } from '../../context/PrototypeContext';
import ScreenProperties from './ScreenProperties';
import HotspotProperties from './HotspotProperties';
import MicroInteractionProperties from './MicroInteractionProperties';

export default function PropertiesPanel() {
  const { state, activeScreen } = usePrototype();

  const hasHotspot = !!state.selectedHotspotId;
  const hasMicro = !!state.selectedMicroId;

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {hasHotspot ? 'Hotspot' : hasMicro ? 'Micro-interaction' : 'Properties'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!activeScreen ? (
          <p className="text-xs text-gray-600 text-center mt-8">No screen selected</p>
        ) : hasHotspot ? (
          <HotspotProperties />
        ) : hasMicro ? (
          <MicroInteractionProperties />
        ) : (
          <ScreenProperties />
        )}
      </div>

      {/* Help hints */}
      <div className="border-t border-gray-700 px-3 py-2 space-y-0.5">
        <p className="text-xs text-gray-600">V · Select&nbsp;&nbsp; H · Hotspot&nbsp;&nbsp; M · Micro</p>
        <p className="text-xs text-gray-600">Del · Remove selected&nbsp;&nbsp; Esc · Deselect</p>
      </div>
    </aside>
  );
}
