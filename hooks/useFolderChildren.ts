'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import type { FolderOverviewItem } from '@/types';

// Module-level cache: survives re-renders, cleared on page reload.
// Stores fetched children per folderId so repeated expand/collapse doesn't re-fetch.
const childrenCache = new Map<string, FolderOverviewItem[]>();

export function useFolderChildren(folderId: string | null, refreshKey: number = 0) {
  const [children, setChildren] = useState<FolderOverviewItem[]>(() =>
    folderId ? (childrenCache.get(folderId) ?? []) : [],
  );
  const [loading, setLoading] = useState(false);
  const prevRefreshKeyRef = useRef(0);

  useEffect(() => {
    if (!folderId) {
      setChildren([]);
      return;
    }

    // When refreshKey increments, invalidate the cache entry to force a re-fetch
    if (refreshKey !== prevRefreshKeyRef.current) {
      prevRefreshKeyRef.current = refreshKey;
      childrenCache.delete(folderId);
    }

    // Serve from cache when available
    if (childrenCache.has(folderId)) {
      setChildren(childrenCache.get(folderId)!);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiClient
      .getFolderChildren(folderId)
      .then((data) => {
        if (cancelled) return;
        childrenCache.set(folderId, data);
        setChildren(data);
      })
      .catch(() => {
        if (!cancelled) setChildren([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [folderId, refreshKey]);

  // Call this after a mutation (create/delete folder) to force a re-fetch
  const invalidate = useCallback((id: string) => {
    childrenCache.delete(id);
  }, []);

  return { children, loading, invalidate };
}

// Exported so FolderStatsCard can invalidate the root-level cache on refresh
export function invalidateFolderChildrenCache(folderId?: string) {
  if (folderId) {
    childrenCache.delete(folderId);
  } else {
    childrenCache.clear();
  }
}
