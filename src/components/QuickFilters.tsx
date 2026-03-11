import { QUICK_FILTERS } from '../types/product';

interface Props {
  active: string[];
  onToggle: (id: string) => void;
}

export default function QuickFilters({ active, onToggle }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', textAlign: 'center', color: 'var(--adi-gray-900)' }}>
        Quick filter your PST
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {QUICK_FILTERS.map(filter => (
          <button
            key={filter.id}
            className={`qf-chip ${active.includes(filter.id) ? 'active' : ''}`}
            onClick={() => onToggle(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
