'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { FileIcon } from './FileIcon';
import type { File } from '@/types';

interface FilePreviewProps {
  file: File;
}

export function FilePreview({ file }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mimeType = file.mime_type.toLowerCase();

  useEffect(() => {
    // Only fetch preview for images and PDFs
    if (mimeType.startsWith('image/') || mimeType.includes('pdf')) {
      const fetchPreview = async () => {
        try {
          setLoading(true);
          setError(false);
          const blob = await apiClient.downloadFile(file.id);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        } catch (err) {
          setError(true);
        } finally {
          setLoading(false);
        }
      };
      fetchPreview();
    } else {
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file.id, mimeType]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <FileIcon mimeType={file.mime_type} className="h-16 w-16" />
          </div>
          <p className="mt-4 text-gray-600">Unable to load preview</p>
          <p className="mt-2 text-sm text-gray-500">Click download to view the file</p>
        </div>
      </div>
    );
  }

  if (mimeType.startsWith('image/') && previewUrl) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={previewUrl}
          alt={file.name}
          className="max-h-[70vh] w-auto rounded-lg shadow-lg"
        />
      </div>
    );
  }

  if (mimeType.includes('pdf') && previewUrl) {
    return (
      <iframe
        src={previewUrl}
        className="h-[70vh] w-full rounded-lg border border-gray-200"
        title={file.name}
      />
    );
  }

  return (
    <div className="flex h-96 items-center justify-center rounded-lg bg-linear-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <FileIcon mimeType={file.mime_type} className="h-16 w-16" />
        </div>
        <p className="mt-4 text-lg font-medium text-gray-700">Preview not available</p>
        <p className="mt-2 text-sm text-gray-500">This file type cannot be previewed in the browser</p>
        <p className="mt-1 text-xs text-gray-400">Click download to view the file</p>
      </div>
    </div>
  );
}

