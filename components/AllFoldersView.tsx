'use client';

import { Folder, FolderOpen } from 'lucide-react';
import { useFolders } from '@/hooks/useFolders';
import { useFolderContext } from '@/context/FolderContext';
import type { FolderTreeNode } from '@/types';

// Helper function to flatten folder tree into a flat array
function flattenFolders(folders: FolderTreeNode[]): FolderTreeNode[] {
  const result: FolderTreeNode[] = [];
  
  function traverse(nodes: FolderTreeNode[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  
  traverse(folders);
  return result;
}

export function AllFoldersView() {
  const { folders, loading, error } = useFolders(false);
  const { selectedFolderId, setSelectedFolderId } = useFolderContext();
  
  // Flatten the folder tree to show all folders in cards
  const allFolders = flattenFolders(folders);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading folders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">Error loading folders</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (allFolders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Folder className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <p className="text-xl font-semibold text-gray-700">No folders available</p>
          <p className="mt-2 text-sm text-gray-500">You don't have access to any folders yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">All Folders</h2>
        <p className="text-sm text-gray-500">Click on a folder card to view its files</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {allFolders.map((folder) => {
          const hasChildren = folder.children && folder.children.length > 0;
          const isSelected = selectedFolderId === folder.id;
          
          return (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`group relative rounded-xl border-2 p-6 text-left transition-all hover:shadow-lg ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`rounded-lg p-3 ${
                  isSelected 
                    ? 'bg-blue-100' 
                    : 'bg-linear-to-br from-blue-50 to-indigo-50 group-hover:from-blue-100 group-hover:to-indigo-100'
                }`}>
                  {hasChildren ? (
                    <FolderOpen className={`h-8 w-8 ${
                      isSelected ? 'text-blue-700' : 'text-blue-600'
                    }`} />
                  ) : (
                    <Folder className={`h-8 w-8 ${
                      isSelected ? 'text-blue-700' : 'text-blue-600'
                    }`} />
                  )}
                </div>
              </div>
              <h3 className={`mb-2 text-base font-semibold ${
                isSelected ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {folder.name}
              </h3>
              {hasChildren && (
                <p className="text-xs text-gray-500">
                  {folder.children!.length} subfolder{folder.children!.length !== 1 ? 's' : ''}
                </p>
              )}
              {isSelected && (
                <div className="absolute right-3 top-3">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

