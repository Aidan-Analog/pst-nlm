/**
 * LTspice Workbench — CXR (Customer Experience Reimagination) prototype
 *
 * Shell page that embeds <LTspiceNode /> as a full-page panel.
 * When the Figma Make CXR-Interaction-Model export is available,
 * import LTspiceNode + useLTspiceAgent into CircuitExplorerNode.tsx
 * and render it inside the React Flow node card.
 *
 * Route: /workbench
 */

import Header from '../components/Header';
import LTspiceNode from '../components/Workbench/LTspiceNode';

export default function Workbench() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc',
    }}>
      <Header />

      {/* Sub-header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <a href="/" style={{ fontSize: 13, color: '#0066cc', textDecoration: 'none' }}>
          ← PST
        </a>
        <span style={{ color: '#d1d5db' }}>|</span>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>
          LTspice Workbench
        </h1>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 4,
          background: '#f1f5f9', color: '#64748b', fontWeight: 500,
        }}>
          CXR Prototype
        </span>

        {/* Link to Figma Make */}
        <a
          href="https://www.figma.com/make/9VBAM9YV1yzsG3HRrTNdZX/CXR-Interaction-Model"
          target="_blank"
          rel="noreferrer"
          style={{
            marginLeft: 'auto', fontSize: 12, color: '#0066cc',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open in Figma Make
        </a>
      </div>

      {/* Main panel */}
      <div style={{
        flex: 1, display: 'flex', justifyContent: 'center',
        padding: '24px', overflow: 'auto',
      }}>
        <div style={{
          width: '100%', maxWidth: 860,
          background: '#fff', borderRadius: 12,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column',
          minHeight: 600,
          overflow: 'hidden',
        }}>
          <LTspiceNode />
        </div>
      </div>
    </div>
  );
}
