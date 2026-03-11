import { useState, useCallback } from 'react';
import type { CompanionMessage, FilterCondition, SortConfig } from '../types/product';

export function useCompanion(
  onFiltersChange: (filters: FilterCondition[], sort: SortConfig | null) => void,
) {
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setError(null);

    const userMsg: CompanionMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const { filters = [], sort = null, message = '' } = data;

      const assistantMsg: CompanionMessage = {
        role: 'assistant',
        content: message,
        filters,
        sort,
      };
      setMessages(prev => [...prev, assistantMsg]);
      onFiltersChange(filters, sort);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${msg}`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [onFiltersChange]);

  const clearFilters = useCallback(() => {
    setMessages([]);
    onFiltersChange([], null);
  }, [onFiltersChange]);

  return { messages, loading, error, sendQuery, clearFilters };
}
