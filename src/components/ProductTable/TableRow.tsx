import type { Product } from '../../types/product';

interface Props {
  product: Product;
  visibleColumns: string[];
  selected: boolean;
  onSelect: (checked: boolean) => void;
}

function formatValue(key: string, val: unknown): React.ReactNode {
  if (val == null || val === '') return <span style={{ color: 'var(--adi-gray-400)' }}>—</span>;

  if (key === 'lifecycle') {
    const isRecommended = String(val).toUpperCase().includes('RECOMMENDED');
    return (
      <span className={`lifecycle-badge ${isRecommended ? 'lifecycle-recommended' : 'lifecycle-production'}`}>
        {String(val)}
      </span>
    );
  }

  if (key === 'price1ku') {
    return `$${Number(val).toFixed(2)}`;
  }

  if (key === 'availability') {
    const n = Number(val);
    if (isNaN(n)) return <span className="availability-check">Check Distributor Inventory</span>;
    return n.toLocaleString();
  }

  if (key === 'rohsCompliant') {
    return val ? (
      <span style={{ color: 'var(--adi-teal)', fontWeight: 500, fontSize: 11 }}>✓ RoHS</span>
    ) : (
      <span style={{ color: 'var(--adi-gray-400)', fontSize: 11 }}>—</span>
    );
  }

  if (key === 'surfaceMount') {
    return val ? (
      <span style={{ fontSize: 12, color: 'var(--adi-gray-600)' }}>SMT</span>
    ) : (
      <span style={{ fontSize: 12, color: 'var(--adi-gray-400)' }}>THT</span>
    );
  }

  if (typeof val === 'number') {
    return val.toLocaleString();
  }

  return String(val);
}

export default function TableRow({ product, visibleColumns, selected, onSelect }: Props) {
  return (
    <tr>
      {/* Checkbox */}
      <td style={{ width: 40, textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={e => onSelect(e.target.checked)}
          style={{ cursor: 'pointer', accentColor: 'var(--adi-blue)' }}
        />
      </td>

      {visibleColumns.map(col => (
        <td key={col}>
          {col === 'partNumber' ? (
            <div>
              <a href="#" className="part-link">{String(product.partNumber)}</a>
              {/* Action icons */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button
                  title="Add to cart"
                  style={{ background: 'var(--adi-blue)', border: 'none', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                </button>
                <button
                  title="Datasheet"
                  style={{ background: 'none', border: '1px solid var(--adi-gray-300)', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adi-gray-500)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </button>
                <button
                  title="Compare"
                  style={{ background: 'none', border: '1px solid var(--adi-gray-300)', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adi-gray-500)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            formatValue(col, product[col])
          )}
        </td>
      ))}
    </tr>
  );
}
