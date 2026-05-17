'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api/client';
import type { FolderOverviewItem } from '@/types';

export type FolderSortOption = 'recently-updated' | 'most-files' | 'a-z';

const sortFns: Record<FolderSortOption, (a: FolderOverviewItem, b: FolderOverviewItem) => number> = {
  'recently-updated': (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  'most-files': (a, b) => b.file_count - a.file_count,
  'a-z': (a, b) => a.name.localeCompare(b.name),
};

export function useFolderOverview(roleVersion: number) {
  const [rawItems, setRawItems] = useState<FolderOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<FolderSortOption>('recently-updated');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getFolderOverview();
      setRawItems(data);
    } catch {
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, roleVersion]);

  const items = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return [...rawItems]
      .filter((item) => item.name.toLowerCase().includes(lowerSearch))
      .sort(sortFns[sortBy]);
  }, [rawItems, search, sortBy]);

  return {
    items,
    loading,
    search,
    setSearch,
    sortBy,
    setSortBy,
    refresh: fetchData,
    totalCount: rawItems.length,
  };
}
