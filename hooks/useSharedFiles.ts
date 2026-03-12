'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { File as FileEntity } from '@/types';

export function useSharedFiles() {
  const [files, setFiles] = useState<(FileEntity & { owner_name: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSharedFiles();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shared files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
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
    downloadFile,
  };
}
