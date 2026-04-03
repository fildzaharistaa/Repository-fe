'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { FolderTreeNode } from '@/types';

export function useFolders(adminMode = false) {
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Use admin endpoint if admin mode, otherwise use regular endpoint
      const data = adminMode 
        ? await apiClient.getAdminFolderTree()
        : await apiClient.getFolderTree();
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folders');
    } finally {
      setLoading(false);
    }
  }, [adminMode]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = useCallback(async (name: string, parentId?: string, shareWithRoles?: string[]) => {
    try {
      const newFolder = await apiClient.createFolder({
        name,
        parent_id: parentId || null,
        share_with_roles: shareWithRoles,
      });
      await fetchFolders(); // Refresh tree
      return newFolder;
    } catch (err) {
      throw err;
    }
  }, [fetchFolders]);

  const updateFolder = useCallback(async (id: string, name: string) => {
    try {
      const updatedFolder = await apiClient.updateFolder(id, { name });
      await fetchFolders(); // Refresh tree
      return updatedFolder;
    } catch (err) {
      throw err;
    }
  }, [fetchFolders]);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      await apiClient.deleteFolder(id);
      await fetchFolders(); // Refresh tree
    } catch (err) {
      throw err;
    }
  }, [fetchFolders]);

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    refresh: fetchFolders,
  };
}

