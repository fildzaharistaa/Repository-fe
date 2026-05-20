'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Folder,
  Check,
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
  FileText,
  Trash2,
  Edit2,
  Search,
} from 'lucide-react';
import Image from 'next/image';
import logoImage from '@/app/icon.png';
import { useFolders } from '@/hooks/useFolders';
import { useSharedFolders } from '@/hooks/useSharedFolders';
import { useAuthContext } from '@/context/AuthContext';
import { useFolderContext } from '@/context/FolderContext';
import type { FolderTreeNode } from '@/types';
import { ConfirmModal } from './ConfirmModal';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { FolderModal } from '@/components/FolderModal';

// ── Folder management item (with create/edit/delete actions) ──
interface FolderItemProps {
  folder: FolderTreeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  depth: number;
  maxDepth: number;
  canCreateSubfolder: boolean;
}

function FolderItem({
  folder,
  selectedId,
  onSelect,
  onCreateSubfolder,
  onEdit,
  onDelete,
  depth,
  canCreateSubfolder,
  maxDepth
}: FolderItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 ${selectedId === folder.id ? 'bg-blue-100' : ''
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
          <div className="flex flex-col min-w-0">
            {(folder as any).shared_parent_name && (
              <span className="text-[10px] font-semibold text-orange-600 truncate uppercase tracking-wide">
                📂 {(folder as any).shared_parent_name}
              </span>
            )}
            <span className="text-black text-sm font-medium truncate">{folder.name}</span>
          </div>
        </button>
        <div className="flex gap-1">
          {canCreateSubfolder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubfolder(folder.id);
            }}
            disabled={depth >= maxDepth || (folder.children?.length ?? 0) >= maxDepth}
            className={`rounded px-2 py-1 text-xs ${
              depth >= maxDepth || (folder.children?.length ?? 0) >= maxDepth
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
            title={
              (folder.children?.length ?? 0) >= maxDepth
                ? `Batas subfolder sudah tercapai (maks ${maxDepth})`
                : depth >= maxDepth
                ? `Max ${maxDepth} levels reached`
                : 'Buat subfolder'
            }
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(folder.id, folder.name);
            }}
            className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50"
            title="Edit folder"
          >
            <Edit2 className="h-3 w-3" />
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
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
              maxDepth={maxDepth}
              canCreateSubfolder={canCreateSubfolder}
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
  const { user, isAdmin, isSuperAdmin, canCreateFolder, canCreateSubfolder, roleVersion } = useAuthContext();
  const roleName = (typeof user?.role === 'object' ? user?.role?.name : user?.role)?.toLowerCase() || '';
  const isWD1 = roleName === 'wd1' || roleName.includes('wakil dekan 1');
  const isWD2 = roleName === 'wd2' || roleName.includes('wakil dekan 2');
  const isWD3 = roleName === 'wd3' || roleName.includes('wakil dekan 3');
  const router = useRouter();
  const pathname = usePathname();
  const { activeMenu, setActiveMenu } = useFolderContext();
  const [adminMode, setAdminMode] = useState(false);
  const { folders, loading, error, createFolder, deleteFolder, refresh } = useFolders(adminMode && isAdmin, roleVersion);
  const { folders: sharedFolders } = useSharedFolders(roleVersion);

  // Reset workspace state whenever the active role changes
  useEffect(() => {
    if (roleVersion > 0) {
      onFolderSelect(null);
      setActiveMenu(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleVersion]);

  // Computed: user has shared access if any folders are shared with them
  const hasSharedAccess = sharedFolders.length > 0;
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [shareWithWD1, setShareWithWD1] = useState(isWD1);
  const [shareWithWD2, setShareWithWD2] = useState(isWD2);
  const [shareWithWD3, setShareWithWD3] = useState(isWD3);
  const [shareWithDosen, setShareWithDosen] = useState(false);
  const [shareWithTendik, setShareWithTendik] = useState(false);

  // New states for enhanced modal
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Default permissions for simplicity in demo
  const [userPermissions, setUserPermissions] = useState<Record<string, { read: boolean, download: boolean }>>({});

  // Dynamic max folder depth from settings
  const [maxFolderDepth, setMaxFolderDepth] = useState(5);

  // Hierarchy request states
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const [requestedDepth, setRequestedDepth] = useState(6);
  const [hierarchyMessage, setHierarchyMessage] = useState('');

  // Fetch user stats on mount to get correct maxFolderDepth
  useEffect(() => {
    apiClient.getUserStats()
      .then(stats => {
        if (stats && stats.maxFolderDepth) {
          setMaxFolderDepth(stats.maxFolderDepth);
        }
      })
      .catch(err => console.error('Failed to fetch user stats:', err));
  }, []);

  // Fetch users when component mounts (or when modal opens)
  useState(() => {
      apiClient.getUsers()
        .then(res => {
          const fetchedUsers = (res as any).data || res;
          if (Array.isArray(fetchedUsers)) {
            setUsers(fetchedUsers);
          } else {
            setUsers([]);
          }
        })
      .catch(err => {
        console.error('Failed to fetch users:', err);
        setUsers([]);
      });
  });

  const resetModal = () => {
    setNewFolderName('');
    setParentId(null);
    setEditFolderId(null);
    setShowCreateDialog(false);
  };

  const handleDeleteFolder = (id: string) => {
    setPermissionToDelete(id);
    setShowConfirm(true);
  };

  const handleEditFolder = (id: string, name: string) => {
    setEditFolderId(id);
    setNewFolderName(name);
    setShowCreateDialog(true);
  };

  const confirmDeleteFolder = async () => {
    if (!permissionToDelete) return;

    try {
      setLoadingDelete(true);

      await deleteFolder(permissionToDelete);
      refresh();
      toast.success('Folder telah berhasil dipindahkan ke Recycle Bin.');
      setShowConfirm(false);
      setPermissionToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete folder');
    } finally {
      setLoadingDelete(false);
    }
  };

  const formatRoleName = (raw: string) => {
    if (!raw) return 'User';
    const norm = raw.toLowerCase().trim();
    if (norm === 'wd1' || norm === 'wd 1') return 'Wakil Dekan 1';
    if (norm === 'wd2' || norm === 'wd 2') return 'Wakil Dekan 2';
    if (norm === 'wd3' || norm === 'wd 3') return 'Wakil Dekan 3';
    if (norm === 'dosen') return 'Dosen';
    if (norm === 'tendik') return 'Tendik';
    if (norm.includes('super')) return 'Super Admin';
    if (norm === 'admin') return 'Admin';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const handleCreateSubfolder = (parentId: string) => {
    setParentId(parentId);
    setEditFolderId(null);
    setNewFolderName('');
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
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/20 backdrop-blur-sm">
            <Image src={logoImage} alt="Logo Sistem Repository" width={40} height={40} className="h-10 w-10 object-contain" priority />
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
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${activeMenu === 'dashboard' || (pathname === '/dashboard' && selectedFolderId === null && activeMenu === null)
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
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${activeMenu === 'all-folders'
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
                  setActiveMenu('all-files');
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${activeMenu === 'all-files'
                  ? 'bg-orange-100 text-orange-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <FileText className="h-5 w-5 text-orange-600" />
                <span>All Files</span>
              </button>

              <button
                onClick={() => {
                  router.push('/dashboard');
                  onFolderSelect(null);
                  setActiveMenu('recycle-bin');
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${activeMenu === 'recycle-bin'
                  ? 'bg-orange-100 text-orange-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Trash2 className="h-5 w-5 text-orange-600" />
                <span>Recycle Bin</span>
              </button>

              <div className="my-2 border-t border-gray-200"></div>

              {/* ── Shared Folders ── */}
              <button
                onClick={() => {
                  router.push('/dashboard');
                  onFolderSelect(null);
                  setActiveMenu('shared-folders');
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${activeMenu === 'shared-folders'
                  ? 'bg-orange-100 text-orange-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Share2 className="h-5 w-5 text-orange-600" />
                <span>Shared Folders</span>
              </button>

              {/* ── Shared Files (auto-disabled if no shared access) ── */}
              <button
                onClick={() => {
                  if (!hasSharedAccess) return;
                  router.push('/dashboard');
                  onFolderSelect(null);
                  setActiveMenu('shared-files');
                }}
                disabled={!hasSharedAccess}
                title={!hasSharedAccess ? 'Tidak ada file yang dibagikan kepada Anda' : 'File yang dibagikan kepada Anda'}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${!hasSharedAccess
                  ? 'text-gray-300 cursor-not-allowed'
                  : activeMenu === 'shared-files'
                    ? 'bg-orange-100 text-orange-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <FileText className={`h-5 w-5 ${!hasSharedAccess ? 'text-gray-300' : 'text-orange-600'}`} />
                <span>Shared Files</span>
                {!hasSharedAccess && (
                  <Lock className="h-3.5 w-3.5 text-gray-300 ml-auto" />
                )}
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
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${pathname === '/users'
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
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${pathname === '/super-admin'
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
          {canCreateFolder && (
            <div className="border-b border-gray-200 bg-linear-to-r from-gray-50 to-white p-4 space-y-2">
              <button
                onClick={() => setShowCreateDialog(true)}
                className="w-full rounded-lg bg-linear-to-r from-orange-600 to-orange-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-700 hover:to-orange-800 hover:shadow-lg transition-all"
              >
                <Plus className="mr-2 inline-block h-4 w-4" />
                Create Folder
              </button>
            </div>
          )}

          <div className="p-4">
            {folders.length === 0 ? (
              <div className="py-8 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-500">No folders found</p>
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
                  onEdit={handleEditFolder}
                  onDelete={handleDeleteFolder}
                  depth={1}
                  maxDepth={maxFolderDepth}
                  canCreateSubfolder={canCreateSubfolder}
                />
              ))
            )}
          </div>

          {/* Request Hierarchy Increase Button */}
          {canCreateFolder && (
            <div className="px-4 pb-3">
              <button
                onClick={() => {
                  setRequestedDepth(maxFolderDepth + 1);
                  setShowHierarchyModal(true);
                }}
                className="w-full rounded-lg border border-dashed border-orange-300 px-3 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-all"
              >
                📂 Request Tambah Kedalaman Folder (Saat ini: {maxFolderDepth} level)
              </button>
            </div>
          )}
        </div>
      )}

      <FolderModal
        isOpen={showCreateDialog}
        onClose={resetModal}
        editFolderId={editFolderId}
        parentId={parentId}
        initialFolderName={newFolderName}
        onSuccess={(msg) => toast.success(msg)}
        refreshFolders={refresh}
      />
      <ConfirmModal
        open={showConfirm}
        title="Hapus Folder"
        description="Apakah Anda yakin ingin menghapus folder ini? Folder beserta subfolder dan file di dalamnya akan dipindahkan ke Recycle Bin."
        loading={loadingDelete}
        onCancel={() => {
          setShowConfirm(false);
          setPermissionToDelete(null);
        }}
        onConfirm={confirmDeleteFolder}
      />

      {/* Hierarchy Request Modal */}
      {showHierarchyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Request Tambah Kedalaman Folder</h3>
              <button
                onClick={() => setShowHierarchyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kedalaman saat ini</label>
                <div className="text-2xl font-bold text-orange-600">{maxFolderDepth} level</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kedalaman yang diminta</label>
                <input
                  type="number"
                  min={maxFolderDepth + 1}
                  value={requestedDepth}
                  onChange={(e) => setRequestedDepth(parseInt(e.target.value, 10))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black focus:border-orange-500 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pesan (opsional)</label>
                <textarea
                  value={hierarchyMessage}
                  onChange={(e) => setHierarchyMessage(e.target.value)}
                  placeholder="Alasan request tambah kedalaman folder..."
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black focus:border-orange-500 focus:ring-orange-500 focus:outline-hidden resize-none"
                />
                <div className="text-right text-xs text-gray-400 mt-1">{hierarchyMessage.length}/500</div>
              </div>
            </div>
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowHierarchyModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    await apiClient.requestHierarchyIncrease({
                      requested_depth: requestedDepth,
                      message: hierarchyMessage || undefined,
                    });
                    setShowHierarchyModal(false);
                    setHierarchyMessage('');
                    toast.success(`Request tambah kedalaman folder ke ${requestedDepth} level telah dikirim ke Super Admin.`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Gagal mengirim request');
                  }
                }}
                disabled={requestedDepth <= maxFolderDepth}
                className="flex items-center gap-2 rounded-md bg-orange-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4" />
                Kirim Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

