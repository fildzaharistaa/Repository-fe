'use client';

import { useState } from 'react';
import { useSharedFiles } from '@/hooks/useSharedFiles';
import { FileIcon } from './FileIcon';
import { FilePreview } from './FilePreview';
import { Eye, Download, FileText, Loader2, X } from 'lucide-react';
import { formatFileSize, formatDate } from '@/lib/utils/formatters';
import type { File as FileEntity } from '@/types';

export function SharedFilesView() {
  const { files, loading, error, downloadFile } = useSharedFiles();
  const [selectedFile, setSelectedFile] = useState<FileEntity | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);

  const handleQuickView = (file: FileEntity) => {
    setSelectedFile(file);
    setShowQuickView(true);
  };

  const handleDownload = async (file: FileEntity) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        Error loading shared files: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shared Files</h1>
        <p className="text-sm text-gray-500 mt-1">Files that have been specifically shared with you</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Owner</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Size</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Shared On</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {files.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">No shared files</p>
                  <p className="mt-1 text-sm text-gray-500">Files shared directly with you will appear here</p>
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <span className="mr-3"><FileIcon mimeType={file.mime_type} /></span>
                      <div>
                        <button
                          onClick={() => handleQuickView(file)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {file.name}
                        </button>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{file.mime_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {(file as any).owner_name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(file.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleQuickView(file)}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-all hover:shadow-sm"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-all hover:shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showQuickView && selectedFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
          onClick={() => setShowQuickView(false)}
        >
          <div 
            className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 rounded-t-xl">
              <div className="flex items-center gap-3">
                <FileIcon mimeType={selectedFile.mime_type} className="h-8 w-8" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">{selectedFile.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} • Shared by {(selectedFile as any).owner_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
                <button
                  onClick={() => setShowQuickView(false)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" /> Close
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] min-h-[50vh] overflow-y-auto bg-gray-50 p-6 rounded-b-xl flex justify-center">
              <FilePreview file={selectedFile} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
