'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { File as FileEntity, FolderTreeNode } from '@/types';

// Helper function to flatten folder tree and get all folder IDs
function getAllFolderIds(folders: FolderTreeNode[]): string[] {
  const ids: string[] = [];
  
  function traverse(nodes: FolderTreeNode[]) {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  
  traverse(folders);
  return ids;
}

export function useAllFiles(folders: FolderTreeNode[]) {
  const [allFiles, setAllFiles] = useState<FileEntity[]>([]);
  const [fileFolderMap, setFileFolderMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const folderIds = getAllFolderIds(folders);
      const filePromises = folderIds.map(async (id) => {
        try {
          const files = await apiClient.getFiles(id);
          return { files, folderId: id };
        } catch {
          return { files: [], folderId: id };
        }
      });
      
      const results = await Promise.all(filePromises);
      const files: FileEntity[] = [];
      const map = new Map<string, string>();
      
      for (const { files: folderFiles, folderId } of results) {
        for (const file of folderFiles) {
          files.push(file);
          map.set(file.id, folderId);
        }
      }
      
      // Sort by created_at descending (most recent first)
      files.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setAllFiles(files);
      setFileFolderMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, [folders]);

  useEffect(() => {
    if (folders.length > 0) {
      fetchAllFiles();
    } else {
      setAllFiles([]);
      setFileFolderMap(new Map());
    }
  }, [folders, fetchAllFiles]);

  return {
    allFiles,
    fileFolderMap,
    loading,
    error,
    refresh: fetchAllFiles,
  };
}

