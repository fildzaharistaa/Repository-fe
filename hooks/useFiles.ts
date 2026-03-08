'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { File as FileEntity } from '@/types';

export function useFiles(folderId: string | null) {
  const [files, setFiles] = useState<FileEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!folderId) {
      setFiles([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getFiles(folderId);
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = useCallback(async (file: globalThis.File) => {
    if (!folderId) throw new Error('No folder selected');
    
    try {
      setLoading(true);
      const newFile = await apiClient.uploadFile(folderId, file);
      await fetchFiles(); // Refresh list
      return newFile;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, [folderId, fetchFiles]);

  const deleteFile = useCallback(async (id: string) => {
    try {
      await apiClient.deleteFile(id);
      await fetchFiles(); // Refresh list
    } catch (err) {
      throw err;
    }
  }, [fetchFiles]);

  const downloadFile = useCallback(async (id: string, filename: string) => {
    try {
      const blob = await apiClient.downloadFile(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    files,
    loading,
    error,
    fetchFiles,
    uploadFile,
    deleteFile,
    downloadFile,
  };
}


