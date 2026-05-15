'use client';

import { useState } from 'react';
import { Folder, FolderOpen, Share2, User, Mail } from 'lucide-react';
import { useFolders } from '@/hooks/useFolders';
import { useSharedFolders } from '@/hooks/useSharedFolders';
import { useFolderContext } from '@/context/FolderContext';
import { useAuthContext } from '@/context/AuthContext';
import type { FolderTreeNode } from '@/types';

type FilterTab = 'my-folders' | 'shared-folders';

export function AllFoldersView() {
  const { selectedFolderId, setSelectedFolderId, setVirtualRootFolderId } = useFolderContext();
  const { canCreateFolder, roleVersion } = useAuthContext();
  const { folders, loading, error } = useFolders(false, roleVersion);
  const { folders: sharedFolders, loading: sharedLoading, error: sharedError } = useSharedFolders(roleVersion);
  const [activeTab, setActiveTab] = useState<FilterTab>(canCreateFolder ? 'my-folders' : 'shared-folders');
  
  // Only show parent (root) folders — subfolders appear when user clicks into a parent
  const parentFolders = folders;

  const isLoading = activeTab === 'my-folders' ? loading : sharedLoading;
  const currentError = activeTab === 'my-folders' ? error : sharedError;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading folders...</p>
        </div>
      </div>
    );
  }

  if (currentError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">Error loading folders</p>
          <p className="mt-1 text-sm text-red-600">{currentError}</p>
        </div>
      </div>
    );
  }

  const displayFolders = activeTab === 'my-folders' ? parentFolders : sharedFolders;
  const isEmpty = displayFolders.length === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">All Folders</h2>
        <p className="text-sm text-gray-500 mt-1">Kelola dan akses folder Anda</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {canCreateFolder && (
          <button
            onClick={() => setActiveTab('my-folders')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'my-folders'
                ? 'bg-white text-orange-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Folder className="h-4 w-4" />
            My Folders
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === 'my-folders'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {parentFolders.length}
            </span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('shared-folders')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'shared-folders'
              ? 'bg-white text-orange-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Share2 className="h-4 w-4" />
          Shared Folders
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            activeTab === 'shared-folders'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-gray-200 text-gray-500'
          }`}>
            {sharedFolders.length}
          </span>
        </button>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            {activeTab === 'my-folders' ? (
              <>
                <Folder className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-xl font-semibold text-gray-700">Belum ada folder</p>
                <p className="mt-2 text-sm text-gray-500">Buat folder pertama Anda untuk mulai mengelola file</p>
              </>
            ) : (
              <>
                <Share2 className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-xl font-semibold text-gray-700">Belum ada shared folder</p>
                <p className="mt-2 text-sm text-gray-500">Folder yang dibagikan oleh user lain akan muncul di sini</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Folder Grid */}
      {!isEmpty && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {displayFolders.map((folder: any) => {
            const hasChildren = folder.children && folder.children.length > 0;
            const isSelected = selectedFolderId === folder.id;
            const isShared = activeTab === 'shared-folders';
            
            return (
              <button
                key={folder.id}
                onClick={() => {
                  if (isShared) {
                    setVirtualRootFolderId(folder.id);
                  } else {
                    setVirtualRootFolderId(null);
                  }
                  setSelectedFolderId(folder.id);
                }}
                className={`group relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-lg ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : isShared
                      ? 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'
                      : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'
                }`}
              >
                {/* Folder Icon */}
                <div className="mb-3 flex items-center justify-between">
                  <div className={`rounded-lg p-2.5 ${
                    isSelected 
                      ? 'bg-orange-100' 
                      : isShared
                        ? 'bg-linear-to-br from-blue-50 to-indigo-50 group-hover:from-orange-50 group-hover:to-orange-100'
                        : 'bg-linear-to-br from-orange-50 to-amber-50 group-hover:from-orange-100 group-hover:to-amber-100'
                  }`}>
                    {hasChildren ? (
                      <FolderOpen className={`h-7 w-7 ${
                        isSelected ? 'text-orange-700' : isShared ? 'text-blue-600 group-hover:text-orange-600' : 'text-orange-600'
                      }`} />
                    ) : (
                      <Folder className={`h-7 w-7 ${
                        isSelected ? 'text-orange-700' : isShared ? 'text-blue-600 group-hover:text-orange-600' : 'text-orange-600'
                      }`} />
                    )}
                  </div>
                  {isShared && (
                    <Share2 className="h-4 w-4 text-blue-400" />
                  )}
                </div>

                {/* Folder Name */}
                <h3 className={`mb-1.5 text-sm font-semibold truncate ${
                  isSelected ? 'text-orange-900' : 'text-gray-900'
                }`} title={folder.name}>
                  {folder.name}
                </h3>

                {/* Subfolder count (for own folders) */}
                {!isShared && hasChildren && (
                  <p className="text-xs text-gray-400">
                    {folder.children!.length} subfolder{folder.children!.length !== 1 ? 's' : ''}
                  </p>
                )}

                {/* Owner info (for shared folders) */}
                {isShared && (
                  <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600 font-medium truncate">{folder.owner_name || 'Unknown'}</span>
                    </div>
                    {folder.owner_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-400 truncate">{folder.owner_email}</span>
                      </div>
                    )}
                    {folder.owner_role && (
                      <span className="inline-block mt-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">
                        {folder.owner_role}
                      </span>
                    )}
                  </div>
                )}

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute right-3 top-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-orange-600 shadow-sm"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
