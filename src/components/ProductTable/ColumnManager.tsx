import { useState, useRef, useEffect } from 'react';
import type { ALL_COLUMNS } from '../../types/product';

interface Props {
  columns: typeof ALL_COLUMNS;
  visibleColumns: string[];
  onToggle: (key: string) => void;
}

export default function ColumnManager({ columns, visibleColumns, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: open ? 'var(--adi-blue-light)' : '#fff',
          border: '1px solid var(--adi-gray-300)',
          borderRadius: 6, padding: '5px 12px',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          color: 'var(--adi-gray-700)',
          transition: 'all 0.15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        Manage Columns {visibleColumns.length} of {columns.length}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: '#fff', border: '1px solid var(--adi-gray-200)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 100, minWidth: 220, padding: '8px 0',
        }}>
          <div style={{ padding: '4px 12px 8px', fontSize: 11, fontWeight: 600, color: 'var(--adi-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--adi-gray-100)', marginBottom: 4 }}>
            Toggle Columns
          </div>
          {columns.map(col => (
            <label
              key={col.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 16px', cursor: 'pointer', fontSize: 13,
                color: 'var(--adi-gray-700)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--adi-gray-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.key)}
                onChange={() => onToggle(col.key)}
                style={{ accentColor: 'var(--adi-blue)', cursor: 'pointer' }}
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
