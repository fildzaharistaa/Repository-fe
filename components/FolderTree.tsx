'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Folder, 
  Clock, 
  Users, 
  Lock, 
  Shield,
  ChevronDown, 
  ChevronRight,
  Plus,
  X,
  FolderOpen,
  Share2,
  FileText
} from 'lucide-react';
import Image from 'next/image';
import { useFolders } from '@/hooks/useFolders';
import { useAuthContext } from '@/context/AuthContext';
import { useFolderContext } from '@/context/FolderContext';
import type { FolderTreeNode } from '@/types';
import { ConfirmModal } from './ConfirmModal';

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
            <FolderOpen className="h-4 w-4 text-orange-600" />
          ) : (
            <Folder className="h-4 w-4 text-gray-600" />
          )}
          <span className="text-black text-sm font-medium">{folder.name}</span>
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
              onDelete(folder.id);
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

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

  const handleDeleteFolder = (id: string) => {
    setPermissionToDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteFolder = async () => {
    if (!permissionToDelete) return;

    try {
      setLoadingDelete(true);

      await deleteFolder(permissionToDelete);
      refresh();

      setShowConfirm(false);
      setPermissionToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete folder');
    } finally {
      setLoadingDelete(false);
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
            <h2 className="text-sm font-bold text-orange-600 leading-tight">
              <span className="block">Sistem Repository Kampus</span>
              <span className="block">FIK UPNVJ</span>
            </h2>
            <p className="text-xs text-orange-500">File Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="border-b border-gray-200 bg-linear-to-br from-gray-50 to-white p-4">
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
          {!isAdmin && (
            <>
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
              
              <div className="my-2 border-t border-gray-200"></div>
              <div className="px-2 py-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Shared With Me</p>
              </div>
              <button
                onClick={() => {
                  router.push('/dashboard');
                  onFolderSelect(null);
                  setActiveMenu('shared-folders');
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  activeMenu === 'shared-folders'
                    ? 'bg-orange-100 text-orange-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Share2 className="h-5 w-5 text-orange-600" />
                <span>Shared Folders</span>
              </button>
              <button
                onClick={() => {
                  router.push('/dashboard');
                  onFolderSelect(null);
                  setActiveMenu('shared-files');
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  activeMenu === 'shared-files'
                    ? 'bg-orange-100 text-orange-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileText className="h-5 w-5 text-orange-600" />
                <span>Shared Files</span>
              </button>
            </>
          )}
          {isAdmin && (
            <>
              <div className="my-2 border-t border-gray-200"></div>
              <div className="px-2 py-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Admin</p>
              </div>
              <button
                onClick={() => {
                  router.push('/users');
                  onFolderSelect(null);
                  setActiveMenu(null);
                }}
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
                onClick={() => {
                  router.push('/super-admin');
                  onFolderSelect(null);
                  setActiveMenu(null);
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  pathname === '/super-admin'
                    ? 'bg-orange-100 text-orange-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Shield className="h-5 w-5 text-orange-600" />
                <span>Role Management</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Folder Management Section - only for non-admin users */}
      {!isAdmin && (
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 bg-linear-to-r from-gray-50 to-white p-4 space-y-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="w-full rounded-lg bg-linear-to-r from-orange-600 to-orange-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-700 hover:to-orange-800 hover:shadow-lg transition-all"
          >
            + New Folder
          </button>
        </div>
        
        <div className="p-2">
        {folders.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
            <span className="block">No folders yet.</span>
            <span className="block text-xs">Create one to get started, or request access to existing folders.</span>
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
      )}

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-md">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-black">
            <h3 className="mb-4 text-lg font-semibold">
              {parentId ? 'Create Subfolder' : 'Create Folder'}
            </h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-black"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowCreateDialog(false);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateFolder}
                className="flex-1 rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
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
      <ConfirmModal
        open={showConfirm}
        title="Delete Folder"
        description="Are you sure you want to delete this folder?"
        loading={loadingDelete}
        onCancel={() => {
          setShowConfirm(false);
          setPermissionToDelete(null);
        }}
        onConfirm={confirmDeleteFolder}
      />
    </div>
  );
}

