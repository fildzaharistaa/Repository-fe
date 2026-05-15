'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { FolderTreeNode } from '@/types';

export function useSharedFolders(roleVersion = 0) {
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSharedFolderTree();
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shared folders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders, roleVersion]); // refetch when role switches

  return {
    folders,
    loading,
    error,
    refresh: fetchFolders,
  };
}
