'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
import { Eye, Download, Trash2, Folder, AlertCircle, FileText, X, Upload, Loader2 } from 'lucide-react';
import { useFiles } from '@/hooks/useFiles';
import { formatFileSize, formatDate, getFileTypeInfo } from '@/lib/utils/formatters';
import { handleApiError } from '@/lib/utils/errorHandler';
import { FilePreview } from '../../../components/FilePreview';
import { FileIcon } from '../../../components/FileIcon';
import { apiClient } from '@/lib/api/client';
import type { File as FileEntity } from '@/types';
import toast from 'react-hot-toast';

interface FileListProps {
  folderId: string | null;
}

export function FileList({ folderId }: FileListProps) {
  const { files, loading, error, deleteFile, downloadFile, uploadFile } = useFiles(folderId);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntity | null>(null);

  useEffect(() => {
    if (folderId) {
      apiClient.getFolder(folderId)
        .then(folder => setFolderName(folder.name))
        .catch(err => console.error('Failed to fetch folder name', err));
    } else {
      setFolderName(null);
    }
  }, [folderId]);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async (file: FileEntity) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleDelete = async (file: FileEntity) => {
    if (!confirm(`Delete file "${file.name}"?`)) return;
    
    try {
      await deleteFile(file.id);
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleQuickView = (file: FileEntity) => {
    setSelectedFile(file);
    setShowQuickView(true);
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !folderId) return;

    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
      }

      toast.success('Files uploaded successfully');
      setShowUploadModal(false);

    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };


  if (!folderId) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="text-center">
          <Folder className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <p className="text-xl font-semibold text-gray-700">Select a folder to view files</p>
          <p className="mt-2 text-sm text-gray-500">Choose a folder from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-600" />
          <p className="font-semibold text-red-800">Error loading files</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }


  return (
    <>
      <div className="h-full overflow-y-auto bg-white">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{folderName ? `${folderName}` : 'Files'}</h2>
              <p className="text-sm text-gray-500">{files.length} file{files.length !== 1 ? 's' : ''} in this folder</p>
            </div>
            {folderId && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
              >
                <Upload className="h-4 w-4" />
                Upload Files
              </button>
            )}
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
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">No files in this folder</p>
                      <p className="mt-1 text-sm text-gray-500">Upload files to get started</p>
                    </td>
                  </tr>
                ) : (
                  files.map((file) => {
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
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
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
                  );
                })
                )}
              </tbody>
            </table>
          </div>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => setShowQuickView(false)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-y-auto bg-gray-50 p-6">
              <FilePreview file={selectedFile} />
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && folderId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 p-4 backdrop-blur-md"
          onClick={() => setShowUploadModal(false)}
        >
          <div 
            className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-gray-50 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Files</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-100 shadow-lg scale-105'
                    : 'border-blue-300 bg-linear-to-br from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <Upload className="mx-auto mb-4 h-12 w-12 text-blue-600" />
                <p className="mb-2 text-base font-medium text-gray-700">
                  {isDragging ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="mb-4 text-sm text-gray-500">
                  or click the button below to browse
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Folder className="h-4 w-4" />
                      Choose Files
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
