'use client';

import { useState } from 'react';
import { Clock, FileText, Download, Eye, Trash2, Folder, X } from 'lucide-react';
import { useFolders } from '@/hooks/useFolders';
import { useAllFiles } from '@/hooks/useAllFiles';
import { formatFileSize, formatDate, getFileTypeInfo } from '@/lib/utils/formatters';
import { FileIcon } from './FileIcon';
import { FilePreview } from './FilePreview';
import { useFiles } from '@/hooks/useFiles';
import { handleApiError } from '@/lib/utils/errorHandler';
import type { File } from '@/types';

export function RecentFilesView() {
  const { folders } = useFolders(false);
  const { allFiles, fileFolderMap, loading, error } = useAllFiles(folders);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { downloadFile, deleteFile } = useFiles(selectedFolderId);

  // Get recent files (last 20)
  const recentFiles = allFiles.slice(0, 20);

  const handleDownload = async (file: File) => {
    try {
      const folderId = fileFolderMap.get(file.id);
      if (folderId) {
        setSelectedFolderId(folderId);
        // Use apiClient directly for download
        const { apiClient } = await import('@/lib/api/client');
        const blob = await apiClient.downloadFile(file.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleDelete = async (file: File) => {
    if (!confirm(`Delete file "${file.name}"?`)) return;
    
    try {
      const folderId = fileFolderMap.get(file.id);
      if (folderId) {
        setSelectedFolderId(folderId);
        setTimeout(async () => {
          await deleteFile(file.id);
        }, 100);
      }
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleQuickView = (file: File) => {
    setSelectedFile(file);
    setShowQuickView(true);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading recent files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">Error loading files</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (recentFiles.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <p className="text-xl font-semibold text-gray-700">No recent files</p>
          <p className="mt-2 text-sm text-gray-500">Files you upload will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Files</h2>
          <p className="text-sm text-gray-500">Your most recently uploaded files</p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Size
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Uploaded
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {recentFiles.map((file) => {
                const fileInfo = getFileTypeInfo(file.mime_type);
                return (
                <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <span className="mr-3"><FileIcon mimeType={file.mime_type} /></span>
                      <div>
                        <button
                          onClick={() => handleQuickView(file)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                          title={file.name}
                        >
                          <span className="block truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px] lg:max-w-sm">{file.name}</span>
                        </button>
                        <p className="text-xs text-gray-500">{fileInfo.label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${fileInfo.badgeClass}`}>
                      {fileInfo.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="whitespace-nowrap px- py-4 text-sm text-gray-500">
                    {formatDate(file.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleQuickView(file)}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-all hover:shadow-sm"
                        title="Quick View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-all hover:shadow-sm"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-all hover:shadow-sm"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick View Modal */}
      {showQuickView && selectedFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 p-4 backdrop-blur-md"
          onClick={() => setShowQuickView(false)}
        >
          <div 
            className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-gray-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <FileIcon mimeType={selectedFile.mime_type} className="h-8 w-8" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">{selectedFile.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} • {formatDate(selectedFile.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickView(false)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto bg-gray-50 p-6">
              <FilePreview file={selectedFile} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

