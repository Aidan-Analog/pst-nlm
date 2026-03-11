import { useState } from 'react';
import type { Product, SortConfig } from '../../types/product';
import { ALL_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from '../../types/product';
import TableHeaderCell from './TableHeaderCell';
import TableRow from './TableRow';
import ColumnManager from './ColumnManager';

interface Props {
  products: Product[];
  sort: SortConfig | null;
  onSort: (col: string) => void;
}

const SORT_OPTIONS = [
  'Latest Launch Day',
  'Part Number A-Z',
  'Price: Low to High',
  'Price: High to Low',
  'Availability: High to Low',
];

export default function ProductTable({ products, sort, onSort }: Props) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortLabel, setSortLabel] = useState('Latest Launch Day');
  const [sortOpen, setSortOpen] = useState(false);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelect = (partNumber: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(partNumber); else next.delete(partNumber);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map(p => p.partNumber)));
    }
  };

  const handleSortOption = (label: string) => {
    setSortLabel(label);
    setSortOpen(false);
    if (label === 'Part Number A-Z') onSort('partNumber');
    else if (label === 'Price: Low to High') onSort('price1ku');
    else if (label === 'Price: High to Low') onSort('price1ku');
    else if (label === 'Availability: High to Low') onSort('availability');
  };

  const displayColumns = ALL_COLUMNS.filter(c => visibleColumns.includes(c.key));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
        borderBottom: '1px solid var(--adi-gray-200)',
      }}>
        <ColumnManager
          columns={ALL_COLUMNS}
          visibleColumns={visibleColumns}
          onToggle={toggleColumn}
        />

        {/* Sort By */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setSortOpen(!sortOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fff', border: '1px solid var(--adi-gray-300)',
              borderRadius: 6, padding: '5px 12px',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--adi-gray-700)',
            }}
          >
            Sort By: {sortLabel}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {sortOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: '#fff', border: '1px solid var(--adi-gray-200)',
              borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 100, minWidth: 220, padding: '6px 0',
            }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleSortOption(opt)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 16px', background: sortLabel === opt ? 'var(--adi-blue-light)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontSize: 13,
                    color: sortLabel === opt ? 'var(--adi-blue)' : 'var(--adi-gray-700)',
                    fontWeight: sortLabel === opt ? 500 : 400,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--adi-gray-500)' }}>
          {products.length} products
          {selected.size > 0 && ` · ${selected.size} selected`}
        </span>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
        <table className="pst-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selected.size === products.length && products.length > 0}
                  onChange={toggleSelectAll}
                  style={{ accentColor: 'white', cursor: 'pointer' }}
                />
              </th>
              {displayColumns.map(col => (
                <TableHeaderCell
                  key={col.key}
                  label={col.label}
                  colKey={col.key}
                  sort={sort}
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={displayColumns.length + 1} style={{ textAlign: 'center', padding: '48px', color: 'var(--adi-gray-400)' }}>
                  No products match the current filters.
                </td>
              </tr>
            ) : (
              products.map(product => (
                <TableRow
                  key={product.partNumber}
                  product={product}
                  visibleColumns={visibleColumns}
                  selected={selected.has(product.partNumber)}
                  onSelect={checked => toggleSelect(product.partNumber, checked)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
