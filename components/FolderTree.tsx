'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Folder, 
  Clock, 
  Users, 
  Lock, 
  ChevronDown, 
  ChevronRight,
  Plus,
  X,
  FolderOpen
} from 'lucide-react';
import Image from 'next/image';
import { useFolders } from '@/hooks/useFolders';
import { useAuthContext } from '@/context/AuthContext';
import { useFolderContext } from '@/context/FolderContext';
import type { FolderTreeNode } from '@/types';

interface FolderItemProps {
  folder: FolderTreeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onDelete: (id: string) => void;
}

function FolderItem({ 
  folder, 
  selectedId, 
  onSelect, 
  onCreateSubfolder,
  onDelete 
}: FolderItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 ${
          selectedId === folder.id ? 'bg-blue-100' : ''
        }`}
      >
        <button
          onClick={() => {
            if (hasChildren) setExpanded(!expanded);
            onSelect(folder.id);
          }}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-500" />
            )
          ) : (
            <span className="w-3" />
          )}
          {expanded ? (
            <FolderOpen className="h-4 w-4 text-blue-600" />
          ) : (
            <Folder className="h-4 w-4 text-gray-600" />
          )}
          <span className="text-sm font-medium">{folder.name}</span>
        </button>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubfolder(folder.id);
            }}
            className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
            title="Create subfolder"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete folder "${folder.name}"?`)) {
                onDelete(folder.id);
              }
            }}
            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            title="Delete folder"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="ml-4">
          {folder.children!.map((child: FolderTreeNode) => (
            <FolderItem
              key={child.id}
              folder={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreateSubfolder={onCreateSubfolder}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FolderTreeProps {
  selectedFolderId: string | null;
  onFolderSelect: (id: string | null) => void;
}

export function FolderTree({ selectedFolderId, onFolderSelect }: FolderTreeProps) {
  const { isAdmin } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const { activeMenu, setActiveMenu } = useFolderContext();
  const [adminMode, setAdminMode] = useState(false);
  const { folders, loading, error, createFolder, deleteFolder, refresh } = useFolders(adminMode && isAdmin);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await createFolder(newFolderName, parentId || undefined);
      setNewFolderName('');
      setParentId(null);
      setShowCreateDialog(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteFolder(id);
      if (selectedFolderId === id) {
        onFolderSelect(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete folder');
    }
  };

  const handleCreateSubfolder = (parentId: string) => {
    setParentId(parentId);
    setShowCreateDialog(true);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Loading folders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Section */}
      <div className=" p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
          <Image src="/upnvj.png" alt="Campus Repository" width={40} height={40} />
          </div>
          <div>
            <h2 className="text-base font-bold text-orange-600">Campus Repository</h2>
            <p className="text-xs text-orange-500">File Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
        <nav className="space-y-1">
          <button
            onClick={() => {
              router.push('/dashboard');
              onFolderSelect(null);
              setActiveMenu('dashboard');
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              activeMenu === 'dashboard' || (pathname === '/dashboard' && selectedFolderId === null && activeMenu === null)
                ? 'bg-orange-100 text-orange-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="h-5 w-5 text-orange-600" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => {
              router.push('/dashboard');
              onFolderSelect(null);
              setActiveMenu('all-folders');
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              activeMenu === 'all-folders'
                ? 'bg-orange-100 text-orange-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Folder className="h-5 w-5 text-orange-600" />
            <span>All Folders</span>
          </button>
          <button
            onClick={() => {
              router.push('/dashboard');
              onFolderSelect(null);
              setActiveMenu('recent-files');
              // Could add recent files filter here
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              activeMenu === 'recent-files'
                ? 'bg-orange-100 text-orange-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock className="h-5 w-5 text-orange-600" />
            <span>Recent Files</span>
          </button>
          {isAdmin && (
            <>
              <div className="my-2 border-t border-gray-200"></div>
              <div className="px-2 py-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Admin</p>
              </div>
              <button
                onClick={() => router.push('/users')}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  pathname === '/users'
                    ? 'bg-orange-100 text-orange-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="h-5 w-5 text-orange-600" />
                <span>Users</span>
              </button>
              <button
                onClick={() => router.push('/permissions')}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  pathname === '/permissions'
                    ? 'bg-orange-100 text-orange-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Lock className="h-5 w-5 text-orange-600" />
                <span>Permissions</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Folder Management Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 space-y-2">
        {isAdmin && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="admin-mode"
              checked={adminMode}
              onChange={(e) => {
                setAdminMode(e.target.checked);
                // Refresh folders when toggling admin mode
                setTimeout(() => refresh(), 100);
              }}
              className="rounded"
            />
            <label htmlFor="admin-mode" className="text-xs text-gray-600 cursor-pointer">
              Admin View (All Folders)
            </label>
          </div>
        )}
        <button
          onClick={() => setShowCreateDialog(true)}
          className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-700 hover:to-orange-800 hover:shadow-lg transition-all"
        >
          + New Folder
        </button>
        {adminMode && isAdmin && (
          <p className="text-xs text-gray-500">
            Showing all folders including those without permissions
          </p>
        )}
        </div>
        
        <div className="p-2">
        {folders.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {adminMode && isAdmin 
              ? 'No folders found. Create a folder to get started.'
              : 'No accessible folders. Contact admin for access.'}
          </div>
        ) : (
          folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              selectedId={selectedFolderId}
              onSelect={(id) => {
                onFolderSelect(id);
                setActiveMenu(null);
              }}
              onCreateSubfolder={handleCreateSubfolder}
              onDelete={handleDeleteFolder}
            />
          ))
        )}
        </div>
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-md">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">
              {parentId ? 'Create Subfolder' : 'Create Folder'}
            </h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowCreateDialog(false);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateFolder}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewFolderName('');
                  setParentId(null);
                }}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

