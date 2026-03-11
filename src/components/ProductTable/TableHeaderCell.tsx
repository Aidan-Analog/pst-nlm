import type { SortConfig } from '../../types/product';

interface Props {
  label: string;
  colKey: string;
  sort: SortConfig | null;
  onSort: (key: string) => void;
}

export default function TableHeaderCell({ label, colKey, sort, onSort }: Props) {
  const isActive = sort?.column === colKey;
  const direction = isActive ? sort!.direction : null;

  return (
    <th onClick={() => onSort(colKey)} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Drag handle dots */}
        <span style={{ opacity: 0.4, fontSize: 10, letterSpacing: -1 }}>⠿</span>
        <span>{label}</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, marginLeft: 2 }}>
          {/* Filter icon */}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 0, opacity: isActive ? 1 : 0.5 }}>
          <svg
            width="8" height="6" viewBox="0 0 10 6" fill="none"
            style={{ fill: direction === 'asc' ? '#60A5FA' : 'rgba(255,255,255,0.5)' }}
          >
            <path d="M5 0L10 6H0L5 0Z"/>
          </svg>
          <svg
            width="8" height="6" viewBox="0 0 10 6" fill="none"
            style={{ fill: direction === 'desc' ? '#60A5FA' : 'rgba(255,255,255,0.5)', marginTop: 1 }}
          >
            <path d="M5 6L0 0H10L5 6Z"/>
          </svg>
        </span>
      </div>
    </th>
  );
}
