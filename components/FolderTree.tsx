'use client';

import { useState, useEffect } from 'react';
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
  FileText,
  Trash2,
  Edit2,
  Search,
  Check
} from 'lucide-react';
import Image from 'next/image';
import { useFolders } from '@/hooks/useFolders';
import { useAuthContext } from '@/context/AuthContext';
import { useFolderContext } from '@/context/FolderContext';
import type { FolderTreeNode } from '@/types';
import { ConfirmModal } from './ConfirmModal';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface FolderItemProps {
  folder: FolderTreeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  depth: number;
  maxDepth: number;
}

function FolderItem({
  folder,
  selectedId,
  onSelect,
  onCreateSubfolder,
  onEdit,
  onDelete,
  depth,
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
          <span className="text-black text-sm font-medium">{folder.name}</span>
        </button>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubfolder(folder.id);
            }}
            disabled={depth >= maxDepth}
            className={`rounded px-2 py-1 text-xs ${depth >= maxDepth
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-blue-600 hover:bg-blue-50'
              }`}
            title={depth >= maxDepth ? `Max ${maxDepth} levels reached` : "Create subfolder"}
          >
            <Plus className="h-3 w-3" />
          </button>
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
  const { user, isAdmin, canCreateFolder } = useAuthContext();
  const roleName = (typeof user?.role === 'object' ? user?.role?.name : user?.role)?.toLowerCase() || '';
  const isWD1 = roleName === 'wd1';
  const isWD2 = roleName === 'wd2';
  const isWD3 = roleName === 'wd3';
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
        const fetchedUsers = res.data || res;
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const shareRoles: string[] = [];
      if (shareWithWD1) shareRoles.push('Wakil Dekan 1');
      if (shareWithWD2) shareRoles.push('Wakil Dekan 2');
      if (shareWithWD3) shareRoles.push('Wakil Dekan 3');
      if (shareWithDosen) shareRoles.push('Dosen');
      if (shareWithTendik) shareRoles.push('Tendik');

      const uPerms = Object.entries(userPermissions)
        .map(([userId, perms]) => ({
          user_id: userId,
          can_read: perms.read,
          can_create: false,
          can_update: false,
          can_delete: false,
          can_download: perms.download
        }))
        .filter(p => p.can_read || p.can_download);

      if (editFolderId) {
        await apiClient.updateFolder(editFolderId, {
          name: newFolderName,
          share_with_roles: shareRoles.length > 0 ? shareRoles : undefined,
          user_permissions: uPerms.length > 0 ? uPerms : undefined
        });
        setSuccessMessage(`Eksekusi pengaturan Folder "${newFolderName}" sukses diperbarui.`);
      } else {
        await createFolder(newFolderName, parentId || undefined, shareRoles.length > 0 ? shareRoles : undefined, uPerms.length > 0 ? uPerms : undefined);
        setSuccessMessage(`Folder "${newFolderName}" telah berhasil diciptakan.`);
      }

      refresh();
      resetModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan folder');
    }
  };

  const resetModal = () => {
    setNewFolderName('');
    setParentId(null);
    setEditFolderId(null);
    setShareWithWD1(isWD1);
    setShareWithWD2(isWD2);
    setShareWithWD3(isWD3);
    setShareWithDosen(false);
    setShareWithTendik(false);
    setUserPermissions({});
    setShowCreateDialog(false);
    setUserSearchTerm('');
    setSelectedRoleFilter(null);
  };

  const handleDeleteFolder = (id: string) => {
    setPermissionToDelete(id);
    setShowConfirm(true);
  };

  const handleEditFolder = (id: string, name: string) => {
    setEditFolderId(id);
    setNewFolderName(name);
    // You could fetch current folder permissions here to pre-check the boxes
    setShowCreateDialog(true);
  };

  const confirmDeleteFolder = async () => {
    if (!permissionToDelete) return;

    try {
      setLoadingDelete(true);

      await deleteFolder(permissionToDelete);
      refresh();
      setSuccessMessage('Folder telah berhasil dipindahkan ke Recycle Bin.');
      setShowConfirm(false);
      setPermissionToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete folder');
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleCreateSubfolder = (parentId: string) => {
    setParentId(parentId);
    setEditFolderId(null);
    setNewFolderName('');
    setShowCreateDialog(true);
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
    // Capitalize first letter for fallback
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  // Stats for the roles sidebar
  const roleStats = users.reduce((acc, user) => {
    const rName = formatRoleName(typeof user.role === 'object' ? user.role?.name : user.role);
    if (!acc[rName]) acc[rName] = 0;
    acc[rName]++;
    return acc;
  }, {} as Record<string, number>);

  const filteredUsers = users.filter(u => {
    const rName = formatRoleName(typeof u.role === 'object' ? u.role?.name : u.role);
    const matchesRole = selectedRoleFilter ? rName === selectedRoleFilter : true;
    const matchesSearch = u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const toggleUserPermission = (userId: string, perm: keyof { read: boolean, download: boolean }) => {
    setUserPermissions(prev => {
      const current = prev[userId] || { read: false, download: false };
      return {
        ...prev,
        [userId]: { ...current, [perm]: !current[perm] }
      };
    });
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
                  setActiveMenu('recent-files');
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${activeMenu === 'recent-files'
                  ? 'bg-orange-100 text-orange-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Clock className="h-5 w-5 text-orange-600" />
                <span>Recent Files</span>
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
              <div className="px-2 py-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Shared With Me</p>
              </div>
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
              <button
                onClick={() => {
                  router.push('/dashboard');
                  onFolderSelect(null);
                  setActiveMenu('shared-files');
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${activeMenu === 'shared-files'
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

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Header Modal */}
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editFolderId ? 'Edit Folder & Permission' : (parentId ? 'Create Subfolder' : 'Create Folder')}
              </h3>
              <button
                onClick={resetModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row h-[500px]">
              {/* Left Sidebar - Configurations */}
              <div className="w-full md:w-1/3 border-r border-gray-100 bg-white p-6 overflow-y-auto">
                <div className="mb-6">
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Nama Folder</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Masukkan nama folder"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black focus:border-orange-500 focus:ring-orange-500 focus:outline-hidden"
                    autoFocus
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Grup Role Sharing</label>
                  <p className="text-xs text-gray-500 mb-3">Pilih role untuk membagikan akses keseluruhan ke folder ini.</p>

                  <div className="space-y-2">
                    {[
                      { id: 'wd1', label: 'Wakil Dekan 1', checked: shareWithWD1, set: setShareWithWD1, disabled: isWD1 },
                      { id: 'wd2', label: 'Wakil Dekan 2', checked: shareWithWD2, set: setShareWithWD2, disabled: isWD2 },
                      { id: 'wd3', label: 'Wakil Dekan 3', checked: shareWithWD3, set: setShareWithWD3, disabled: isWD3 },
                      { id: 'dosen', label: 'Dosen FIK', checked: shareWithDosen, set: setShareWithDosen, disabled: false },
                      { id: 'tendik', label: 'Tenaga Kependidikan', checked: shareWithTendik, set: setShareWithTendik, disabled: false },
                    ].map(role => (
                      <label key={role.id} className={`flex items-center gap-3 p-2 rounded-md border text-sm ${role.checked ? 'border-orange-200 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'} ${role.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={role.checked}
                          onChange={(e) => role.set(e.target.checked)}
                          disabled={role.disabled}
                          className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="font-medium text-gray-700">{role.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Content - User Permission Table */}
              <div className="w-full md:w-2/3 flex flex-col bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Spesifik User Permission (Optional)</h4>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari nama atau email..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 shadow-sm"
                      />
                    </div>
                    <div className="relative w-full sm:w-1/3">
                      <button
                        type="button"
                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        className="flex items-center justify-between w-full py-2 px-3 text-sm border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <span className="truncate font-medium text-gray-700">
                          {selectedRoleFilter || 'Semua Role'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>

                      {showRoleDropdown && (
                        <div className="absolute z-10 mt-1.5 w-full bg-white shadow-xl max-h-60 rounded-lg py-1 border border-gray-100 overflow-auto focus:outline-none">
                          <button
                            onClick={() => { setSelectedRoleFilter(null); setShowRoleDropdown(false); }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${!selectedRoleFilter ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className="text-sm font-semibold selection:bg-transparent">Semua Role</span>
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{users.length}</span>
                          </button>
                          {Object.keys(roleStats).map(role => (
                            <button
                              key={role}
                              onClick={() => { setSelectedRoleFilter(role); setShowRoleDropdown(false); }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${role === selectedRoleFilter ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                              <span className="text-sm font-semibold truncate pr-2 selection:bg-transparent">{role}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${role === selectedRoleFilter ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                {roleStats[role]}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                        <tr>
                          <th className="px-4 py-3 font-semibold">User Details (Optional)</th>
                          <th className="px-2 py-3 font-semibold text-center w-24">View</th>
                          <th className="px-2 py-3 font-semibold text-center w-24">Download</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">
                              Tidak ada user yang ditemukan
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => {
                            const rName = formatRoleName(typeof u.role === 'object' ? u.role?.name : u.role);
                            const perms = userPermissions[u.id] || { read: false, download: false };
                            return (
                              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{u.name}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">{rName}</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[150px]">{u.email}</span>
                                  </div>
                                </td>
                                <td className="px-2 py-3 text-center">
                                  <input type="checkbox" checked={perms.read} onChange={() => toggleUserPermission(u.id, 'read')} className="h-4 w-4 rounded border-gray-300 text-orange-600 cursor-pointer" />
                                </td>
                                <td className="px-2 py-3 text-center">
                                  <input type="checkbox" checked={perms.download} onChange={() => toggleUserPermission(u.id, 'download')} className="h-4 w-4 rounded border-gray-300 text-orange-600 cursor-pointer" />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-gray-200 bg-white p-4 flex gap-3 justify-end items-center">
                  <button
                    onClick={resetModal}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="flex items-center gap-2 rounded-md bg-orange-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="h-4 w-4" />
                    {editFolderId ? 'Simpan Perubahan' : 'Buat Folder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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

      {/* Success Modal */}
      {successMessage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm shadow-2xl">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center transform shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4 shadow-sm">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Sukses!</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
              {successMessage}
            </p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-orange-700 hover:shadow-lg transition-all"
            >
              Tutup Jendela
            </button>
          </div>
        </div>
      )}

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
                    setSuccessMessage(`Request tambah kedalaman folder ke ${requestedDepth} level telah dikirim ke Super Admin.`);
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

