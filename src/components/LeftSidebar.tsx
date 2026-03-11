import QuickFilters from './QuickFilters';
import PSTCompanion from './PSTCompanion';
import type { CompanionMessage, FilterCondition, SortConfig } from '../types/product';

interface Props {
  quickFilters: string[];
  onToggleQuickFilter: (id: string) => void;
  messages: CompanionMessage[];
  loading: boolean;
  onSend: (query: string) => void;
  onClearFilters: () => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _companionFilters?: FilterCondition[];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _companionSort?: SortConfig | null;
}

export default function LeftSidebar({
  quickFilters, onToggleQuickFilter,
  messages, loading, onSend, onClearFilters,
}: Props) {
  return (
    <div style={{
      width: 'var(--sidebar-width)',
      minWidth: 'var(--sidebar-width)',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      padding: '24px 20px',
      borderRight: '1px solid var(--adi-gray-200)',
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* Quick Filters */}
      <QuickFilters active={quickFilters} onToggle={onToggleQuickFilter} />

      {/* Spacer */}
      <div style={{ flex: 1, minHeight: 24 }} />

      {/* PST Companion */}
      <PSTCompanion
        messages={messages}
        loading={loading}
        onSend={onSend}
        onClearFilters={onClearFilters}
      />
    </div>
  );
}
