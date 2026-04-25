'use client';

import { useState } from 'react';
import { useSharedFolders } from '@/hooks/useSharedFolders';
import { useFolderContext } from '@/context/FolderContext';
import { Folder, Loader2, Mail, User } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export function SharedFoldersView() {
  const { folders, loading, error } = useSharedFolders();
  const { setSelectedFolderId } = useFolderContext();
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const uniqueRoles = Array.from(new Set(folders.map((f: any) => f.owner_role).filter(Boolean)));

  const filteredFolders = folders.filter((f: any) => 
    roleFilter === 'all' || f.owner_role === roleFilter
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared Folders</h1>
          <p className="text-sm text-gray-500 mt-1">Folders that have been shared with you by other users</p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="role-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by Role:</label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all shadow-sm"
          >
            <option value="all">All Roles</option>
            {uniqueRoles.map((role: any) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredFolders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {roleFilter === 'all' ? 'No shared folders' : `No shared folders from ${roleFilter}`}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {roleFilter === 'all' 
              ? "You don't have access to any folders shared by other users yet."
              : `No one with the role "${roleFilter}" has shared any folders with you.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFolders.map((folder) => (
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
                <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-600 font-medium truncate">{(folder as any).owner_name || 'Unknown'}</span>
                  </div>
                  {(folder as any).owner_email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-400 truncate">{(folder as any).owner_email}</span>
                    </div>
                  )}
                  {(folder as any).owner_role && (
                    <span className="inline-block mt-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">
                      {(folder as any).owner_role}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center text-xs text-gray-400">
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
