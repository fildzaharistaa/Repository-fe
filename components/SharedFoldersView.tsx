'use client';

import { useSharedFolders } from '@/hooks/useSharedFolders';
import { useFolderContext } from '@/context/FolderContext';
import { Folder, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export function SharedFoldersView() {
  const { folders, loading, error } = useSharedFolders();
  const { setSelectedFolderId } = useFolderContext();

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
        Error loading shared folders: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shared Folders</h1>
        <p className="text-sm text-gray-500 mt-1">Folders that have been shared with you by other users</p>
      </div>

      {folders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No shared folders</h3>
          <p className="mt-2 text-sm text-gray-500">
            You don't have access to any folders shared by other users yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className="group flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-orange-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <div className="flex w-full items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-100">
                  <Folder className="h-5 w-5" />
                </div>
              </div>
              <div className="w-full">
                <h3 className="truncate text-base font-semibold text-gray-900" title={folder.name}>
                  {folder.name}
                </h3>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span className="truncate">Owner: {(folder as any).owner_name}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{formatDate(folder.created_at)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
