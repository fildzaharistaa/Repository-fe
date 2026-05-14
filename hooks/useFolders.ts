'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { FolderTreeNode } from '@/types';

export function useFolders(adminMode = false, roleVersion = 0) {
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
  }, [fetchFolders, roleVersion]); // refetch when role switches

  const createFolder = useCallback(async (name: string, parentId?: string, shareWithRoles?: string[], userPermissions?: any[]) => {
    try {
      const newFolder = await apiClient.createFolder({
        name,
        parent_id: parentId || null,
        share_with_roles: shareWithRoles,
        user_permissions: userPermissions,
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

