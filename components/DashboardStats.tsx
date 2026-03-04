'use client';

import { Folder, FileText, HardDrive, Clock } from 'lucide-react';
import { useFolders } from '@/hooks/useFolders';
import { useAllFiles } from '@/hooks/useAllFiles';
import { formatFileSize } from '@/lib/utils/formatters';

export function DashboardStats() {
  const { folders, loading: foldersLoading } = useFolders(false);
  const { allFiles, loading: filesLoading } = useAllFiles(folders);

  // Calculate statistics
  const totalFolders = folders.length;
  const totalFiles = allFiles.length;
  const totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);
  const recentFiles = allFiles.slice(0, 5);

  if (foldersLoading || filesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-blue-50 to-blue-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Folders</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">{totalFolders}</p>
            </div>
            <div className="rounded-full bg-blue-200 p-3">
              <Folder className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-green-50 to-green-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Files</p>
              <p className="mt-2 text-3xl font-bold text-green-900">{totalFiles}</p>
            </div>
            <div className="rounded-full bg-green-200 p-3">
              <FileText className="h-6 w-6 text-green-700" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-purple-50 to-purple-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Storage</p>
              <p className="mt-2 text-3xl font-bold text-purple-900">{formatFileSize(totalSize)}</p>
            </div>
            <div className="rounded-full bg-purple-200 p-3">
              <HardDrive className="h-6 w-6 text-purple-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Files</h3>
        </div>
        {recentFiles.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No recent files</p>
        ) : (
          <div className="space-y-3">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


