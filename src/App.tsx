import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import Breadcrumb from './components/Breadcrumb';
import LeftSidebar from './components/LeftSidebar';
import ProductTable from './components/ProductTable/ProductTable';
import { useFilteredProducts } from './hooks/useProducts';
import { useCompanion } from './hooks/useCompanion';
import type { FilterCondition, Product, SortConfig } from './types/product';
import { getMockProducts } from './data/mockProducts';
import Workbench from './pages/Workbench';

// Simple path-based routing — module-level constant, never changes at runtime
const isWorkbench = window.location.pathname.startsWith('/workbench');

const BREADCRUMB = [
  { label: 'Home', href: '#' },
  { label: 'Clock and Timing', href: '#' },
  { label: 'Counters, Timers and Delay Lines', href: '#' },
  { label: 'TimerBlox' },
];

/** PST (Product Selection Table) view — extracted so hooks are never
 *  called conditionally (React rules of hooks). */
function PSTApp() {
  const [allProducts, setAllProducts] = useState<Product[]>(getMockProducts());
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [companionFilters, setCompanionFilters] = useState<FilterCondition[]>([]);
  const [columnSort, setColumnSort] = useState<SortConfig | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load products from server (Excel data) on mount
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.ok ? r.json() : null)
      .then((data: Product[] | null) => {
        if (data && data.length > 0) {
          setAllProducts(data);
          console.log(`[app] Loaded ${data.length} products from server`);
        }
      })
      .catch(() => {
        console.log('[app] Server not available, using mock data');
      });
  }, []);

  const handleFiltersChange = useCallback(
    (filters: FilterCondition[], sort: SortConfig | null) => {
      setCompanionFilters(filters);
      if (sort) setColumnSort(sort);
    },
    []
  );

  const { messages, loading, sendQuery, clearFilters } = useCompanion(handleFiltersChange);

  const handleClearFilters = () => {
    clearFilters();
    setCompanionFilters([]);
    setColumnSort(null);
  };

  const toggleQuickFilter = (id: string) => {
    setQuickFilters(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSort = (col: string) => {
    setColumnSort(prev => {
      if (prev?.column === col) {
        return { column: col, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column: col, direction: 'asc' };
    });
  };

  const filteredProducts = useFilteredProducts(
    allProducts,
    quickFilters,
    companionFilters,
    columnSort,
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <Header />

      {/* Page header band */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--adi-gray-200)' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '16px 16px 0' }}>
          <Breadcrumb items={BREADCRUMB} />
          <h1 style={{ margin: '12px 0 16px', fontSize: 32, fontWeight: 300, color: 'var(--adi-gray-900)' }}>
            TimerBlox
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Collapse toggle button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 16 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{
              width: 28, height: 28, borderRadius: 4,
              background: 'none', border: '1px solid var(--adi-gray-300)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--adi-gray-500)', margin: '0 8px',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {sidebarOpen
                ? <polyline points="15 18 9 12 15 6"/>
                : <polyline points="9 18 15 12 9 6"/>
              }
            </svg>
          </button>
        </div>

        {/* Left sidebar */}
        {sidebarOpen && (
          <LeftSidebar
            quickFilters={quickFilters}
            onToggleQuickFilter={toggleQuickFilter}
            messages={messages}
            loading={loading}
            onSend={sendQuery}
            onClearFilters={handleClearFilters}
          />
        )}

        {/* Product table area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 12px', minWidth: 0 }}>
          <ProductTable
            products={filteredProducts}
            sort={columnSort}
            onSort={handleSort}
          />
        </div>
      </div>
    </div>
  );
}

/** Root component — routes between PST and Workbench based on URL path */
export default function App() {
  return isWorkbench ? <Workbench /> : <PSTApp />;
}
