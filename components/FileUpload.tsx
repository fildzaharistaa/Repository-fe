'use client';

import { useState, useRef, DragEvent } from 'react';
import { Upload, Folder, Loader2, X } from 'lucide-react';
import { useFiles } from '@/hooks/useFiles';
import { handleApiError } from '@/lib/utils/errorHandler';

interface FileUploadProps {
  folderId: string | null;
}

export function FileUpload({ folderId }: FileUploadProps) {
  const { uploadFile, loading } = useFiles(folderId);
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !folderId) return;

    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
      }
      alert('Files uploaded successfully');
      setShowModal(false);
    } catch (err) {
      alert(handleApiError(err));
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
    return null;
  }

  return (
    <>
      {/* Upload Button */}
      <div className="border-b border-gray-200 bg-white p-4">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
        >
          <Upload className="h-4 w-4" />
          Upload Files
        </button>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 p-4 backdrop-blur-md"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-gray-50 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Files</h3>
              <button
                onClick={() => setShowModal(false)}
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
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
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

