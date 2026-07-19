'use client';

import { useState, useEffect, Fragment } from 'react';
import { X, Search, ChevronDown, Check, FolderPlus, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthContext } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import type { Role } from '@/types';

// Permission entry keyed by "userId::roleId" (null roleId → "userId::null").
// Storing roleId here ensures each (user, role) combination gets its own
// permission record in the database, so the folder only surfaces in
// Shared Folders when the recipient logs in under that specific role.
type UserRolePerm = {
  userId: string;
  roleId: string | null;
  roleName: string;
  read: boolean;
  download: boolean;
};

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editFolderId: string | null;
  parentId?: string | null;
  initialFolderName?: string;
  onSuccess: (message: string) => void;
  refreshFolders: () => void;
}

export function FolderModal({
  isOpen,
  onClose,
  editFolderId,
  parentId,
  initialFolderName = '',
  onSuccess,
  refreshFolders,
}: FolderModalProps) {
  const { user, activeRole, isPrivateRole } = useAuthContext();

  const [folderName, setFolderName] = useState(initialFolderName);

  // Dynamic role sharing (group-level)
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  // Tracks which of the selected roles also have download permission enabled
  const [roleDownloadIds, setRoleDownloadIds] = useState<Set<string>>(new Set());

  // Specific user permissions — keyed by "userId::roleId"
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, UserRolePerm>>({});
  // Which user rows currently show the inline role-chip picker
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [defaultSubfolders, setDefaultSubfolders] = useState<string[]>([]);

  // Privat/Bagikan toggle — only for private-role users creating a subfolder
  const [isShared, setIsShared] = useState(false);
  const showPrivacyToggle = false;

  // Load roles once on mount
  useEffect(() => {
    apiClient
      .getRoles()
      .then((roles) => setAllRoles(roles.filter((r) => !r.is_admin)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFolderName(initialFolderName);
      setIsShared(false);
      fetchUsers();
      if (editFolderId) {
        setSelectedRoleIds(new Set());
        setRoleDownloadIds(new Set());
        setUserPermissions({});
        setExpandedUsers(new Set());
        fetchFolderDetails(editFolderId);
      } else {
        setSelectedRoleIds(new Set());
        setRoleDownloadIds(new Set());
        setUserPermissions({});
        setExpandedUsers(new Set());
        setDefaultSubfolders([]);
      }
    }
  }, [isOpen, editFolderId, initialFolderName]);

  const fetchUsers = async () => {
    try {
      // Fetch up to 100 users so the list isn't silently truncated
      const res = await apiClient.getUsers(1, 100);
      const fetched = (res as any).data || res;
      if (Array.isArray(fetched)) setUsers(fetched);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchFolderDetails = async (id: string) => {
    try {
      const folder = await apiClient.getFolder(id);
      setFolderName(folder.name);

      const newPerms: Record<string, UserRolePerm> = {};
      const newExpanded = new Set<string>();
      const newSelectedIds = new Set<string>();
      const newRoleDownloadIds = new Set<string>();
      const ownerWorkspaceRoleId = folder.role_id ?? null;

      if (folder.permissions) {
        // Count role-specific entries per user to auto-expand multi-role users
        const userEntryCount: Record<string, number> = {};

        folder.permissions.forEach((perm: any) => {
          // Group-level role share
          if (perm.role && perm.role_id && perm.role_id !== ownerWorkspaceRoleId) {
            newSelectedIds.add(perm.role_id);
            // Restore per-role download state from the existing permission record
            if (perm.can_download) {
              newRoleDownloadIds.add(perm.role_id);
            }
          }
          // User-specific grant — key by (user_id, role_id) so multiple role
          // entries for the same user don't overwrite each other
          if (perm.user && perm.user_id && perm.user_id !== folder.owner_id) {
            const key = `${perm.user_id}::${perm.role_id ?? 'null'}`;
            newPerms[key] = {
              userId: perm.user_id,
              roleId: perm.role_id ?? null,
              roleName: perm.role?.name ?? '',
              read: perm.can_read,
              download: perm.can_download || false,
            };
            userEntryCount[perm.user_id] = (userEntryCount[perm.user_id] ?? 0) + 1;
          }
        });

        // Auto-expand users who already have multiple role-specific entries
        Object.entries(userEntryCount).forEach(([uid, count]) => {
          if (count > 1) newExpanded.add(uid);
        });
      }

      setSelectedRoleIds(newSelectedIds);
      setRoleDownloadIds(newRoleDownloadIds);
      setUserPermissions(newPerms);
      setExpandedUsers(newExpanded);
    } catch (err) {
      console.error('Failed to fetch folder permissions', err);
    }
  };

  const toggleRoleId = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
        // Also clear download when role is deselected
        setRoleDownloadIds((d) => { const dn = new Set(d); dn.delete(roleId); return dn; });
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const toggleRoleDownload = (roleId: string) => {
    setRoleDownloadIds((prev) => {
      const next = new Set(prev);
      next.has(roleId) ? next.delete(roleId) : next.add(roleId);
      return next;
    });
  };

  const addSubfolder = () => setDefaultSubfolders((p) => [...p, '']);
  const removeSubfolder = (i: number) =>
    setDefaultSubfolders((p) => p.filter((_, idx) => idx !== i));
  const updateSubfolder = (i: number, val: string) =>
    setDefaultSubfolders((p) => p.map((s, idx) => (idx === i ? val : s)));

  const handleSave = async () => {
    if (!folderName.trim()) return;
    try {
      setLoading(true);

      const selectedRolesData = allRoles.filter((r) => selectedRoleIds.has(r.id));
      const shareRoles = selectedRolesData.map((r) => r.name);

      // Build role_download_map: roleId → can_download boolean
      const roleDownloadMap: Record<string, boolean> = {};
      selectedRolesData.forEach((r) => {
        roleDownloadMap[r.id] = roleDownloadIds.has(r.id);
      });

      // Build one permission record per (user, role) pair
      const uPerms = Object.values(userPermissions).map((entry) => ({
        user_id: entry.userId,
        role_id: entry.roleId,
        can_read: entry.read,
        can_create: false,
        can_update: false,
        can_delete: false,
        can_download: entry.download,
      }));

      if (editFolderId) {
        await apiClient.updateFolder(editFolderId, {
          name: folderName,
          share_with_roles: shareRoles,
          role_download_map: roleDownloadMap,
          user_permissions: uPerms,
        });
        onSuccess(`Eksekusi pengaturan Folder "${folderName}" sukses diperbarui.`);
      } else {
        const validSubfolders = defaultSubfolders.map((s) => s.trim()).filter(Boolean);
        const applySharing = !showPrivacyToggle || isShared;
        await apiClient.createFolder({
          name: folderName,
          parent_id: parentId || undefined,
          share_with_roles: applySharing && shareRoles.length > 0 ? shareRoles : undefined,
          role_download_map: applySharing && shareRoles.length > 0 ? roleDownloadMap : undefined,
          user_permissions: applySharing && uPerms.length > 0 ? uPerms : undefined,
          initial_subfolders: validSubfolders.length > 0 ? validSubfolders : undefined,
          ...(showPrivacyToggle && isShared && { is_shared_subfolder: true }),
        });
        onSuccess(`Folder "${folderName}" telah berhasil diciptakan.`);
      }

      refreshFolders();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan folder');
    } finally {
      setLoading(false);
    }
  };

  const formatRoleName = (raw: string) => {
    if (!raw) return 'User';
    const norm = raw.toLowerCase().trim();
    if (norm.includes('super')) return 'Super Admin';
    if (norm === 'admin') return 'Admin';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  // Return the active role assignments for a user.
  // Prefers the userRoles array (populated by GET /users with relations),
  // falls back to the primary role when the array is absent or empty.
  const getUserActiveRoles = (u: any): Array<{ roleId: string | null; roleName: string }> => {
    const fromAssignments = (u.userRoles ?? [])
      .filter((ur: any) => ur.status === 'ACTIVE' && ur.role)
      .map((ur: any) => ({
        roleId: (ur.role_id as string) ?? null,
        roleName: formatRoleName(ur.role.name as string),
      }));
    if (fromAssignments.length > 0) return fromAssignments;
    const primaryId = (u.role as any)?.id ?? u.role_id ?? null;
    const primaryName = formatRoleName(typeof u.role === 'object' ? u.role?.name : u.role);
    return [{ roleId: primaryId, roleName: primaryName }];
  };

  // Toggle expand/collapse the inline role-chip picker for a user
  const toggleExpandUser = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  // Toggle the main user "Akses" checkbox — selects or deselects all roles at once
  const handleToggleUser = (
    u: any,
    roleList: Array<{ roleId: string | null; roleName: string }>,
  ) => {
    // Also check the null-role-id key ("userId::null") — permissions saved with role_id=null
    // from DB are keyed this way and must count as "selected" to show the correct checked state.
    const anySelected = roleList.some(
      (r) => !!userPermissions[`${u.id}::${r.roleId ?? 'null'}`],
    ) || !!userPermissions[`${u.id}::null`];
    if (anySelected) {
      // Deselect all roles and collapse
      setUserPermissions((prev) => {
        const next = { ...prev };
        Object.keys(next)
          .filter((k) => k.startsWith(`${u.id}::`))
          .forEach((k) => delete next[k]);
        return next;
      });
      setExpandedUsers((prev) => {
        const next = new Set(prev);
        next.delete(u.id);
        return next;
      });
    } else {
      // Select all roles (pre-select with read+download); expand picker for multi-role users
      setUserPermissions((prev) => {
        const next = { ...prev };
        roleList.forEach((r) => {
          next[`${u.id}::${r.roleId ?? 'null'}`] = {
            userId: u.id,
            roleId: r.roleId,
            roleName: r.roleName,
            read: true,
            download: true,
          };
        });
        return next;
      });
      if (roleList.length > 1) {
        setExpandedUsers((prev) => new Set([...prev, u.id]));
      }
    }
  };

  // Toggle a specific (userId, roleId) permission chip on/off
  const toggleRolePermission = (
    userId: string,
    roleId: string | null,
    roleName: string,
  ) => {
    const key = `${userId}::${roleId ?? 'null'}`;
    setUserPermissions((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: { userId, roleId, roleName, read: true, download: true },
      };
    });
  };

  // Toggle download for ALL currently-selected role entries of a user
  const toggleDownloadForUser = (userId: string) => {
    setUserPermissions((prev) => {
      const userKeys = Object.keys(prev).filter((k) => k.startsWith(`${userId}::`));
      if (!userKeys.length) return prev;
      const allDownload = userKeys.every((k) => prev[k].download);
      const next = { ...prev };
      userKeys.forEach((k) => {
        next[k] = { ...next[k], download: !allDownload };
      });
      return next;
    });
  };

  const getUserRoleNames = (u: any): string[] =>
    getUserActiveRoles(u).map((r) => r.roleName);

  const roleStats = users.reduce(
    (acc, u) => {
      getUserRoleNames(u).forEach((rName) => {
        if (!acc[rName]) acc[rName] = 0;
        acc[rName]++;
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRoleFilter
      ? getUserRoleNames(u).includes(selectedRoleFilter)
      : true;
    const matchesSearch =
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const myActiveRoleId = activeRole?.id ?? user?.role_id;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            {editFolderId
              ? 'Edit Folder & Permission'
              : parentId
              ? 'Create Subfolder'
              : 'Create Folder'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[500px]">
          {/* ── Left panel: folder name + group role sharing ── */}
          <div
            className={`border-r border-gray-100 bg-white p-6 overflow-y-auto ${
              showPrivacyToggle && !isShared ? 'w-full' : 'w-full md:w-1/3'
            }`}
          >
            <div className="mb-6">
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Nama Folder
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Masukkan nama folder"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black focus:border-orange-500 focus:ring-orange-500 focus:outline-hidden"
                autoFocus
              />
            </div>

            {/* Privat/Bagikan toggle */}
            {showPrivacyToggle && (
              <div className="mb-6">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Visibilitas Subfolder
                </label>
                <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setIsShared(false)}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors ${
                      !isShared
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    🔒 Privat
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShared(true)}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors ${
                      isShared
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    🌐 Bagikan
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {isShared
                    ? 'Subfolder ini akan terlihat oleh semua yang punya akses ke folder ini.'
                    : 'Subfolder ini hanya terlihat oleh Anda.'}
                </p>
              </div>
            )}

            {/* Group role sharing */}
            {(!showPrivacyToggle || isShared) && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Grup Role Sharing
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Pilih role yang bisa mengakses folder ini.
                </p>
                {allRoles.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Memuat role...</p>
                ) : (
                  <>
                    {/* Column headers for Akses + Download */}
                    <div className="mb-1 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      <span className="flex-1" />
                      <span className="w-12 text-center">Akses</span>
                      <span className="w-16 text-center">Download</span>
                    </div>
                    <div className="space-y-1.5">
                      {allRoles.map((role) => {
                        const isChecked = selectedRoleIds.has(role.id);
                        const isDownloadChecked = roleDownloadIds.has(role.id);
                        const isMyRole = role.id === myActiveRoleId;
                        return (
                          <div key={role.id} className="relative group">
                            <div
                              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                                isMyRole
                                  ? 'border-gray-200 bg-gray-50 opacity-60'
                                  : isChecked
                                  ? 'border-orange-200 bg-orange-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <span
                                className={`flex-1 font-medium ${
                                  isMyRole ? 'text-gray-400' : 'text-gray-700'
                                }`}
                              >
                                {role.name}
                              </span>
                              {isMyRole ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-200 w-12 justify-center">
                                  Aktif
                                </span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleRoleId(role.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                  title={isChecked ? 'Cabut akses' : 'Beri akses'}
                                />
                              )}
                              {/* Download checkbox — only enabled when role is selected */}
                              <input
                                type="checkbox"
                                checked={isDownloadChecked}
                                disabled={isMyRole || !isChecked}
                                onChange={() => !isMyRole && isChecked && toggleRoleDownload(role.id)}
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title={
                                  !isChecked
                                    ? 'Aktifkan akses terlebih dahulu'
                                    : isDownloadChecked
                                    ? 'Nonaktifkan izin download'
                                    : 'Izinkan download'
                                }
                              />
                            </div>
                            {isMyRole && (
                              <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 shadow-md group-hover:block">
                                Ini adalah role Anda saat ini. Folder ini sudah dapat diakses
                                oleh role ini secara otomatis.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Default subfolder template (create mode only) */}
            {!editFolderId && (
              <div className="mt-6">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Default Subfolder Template
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Subfolder berikut akan otomatis dibuat di dalam folder ini dan mewarisi
                  semua permission sharing di atas.
                </p>
                <div className="space-y-2">
                  {defaultSubfolders.map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => updateSubfolder(i, e.target.value)}
                          placeholder={`Subfolder ${i + 1}`}
                          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm text-black focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSubfolder(i)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-400 hover:bg-red-50 transition-colors"
                        title="Hapus subfolder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addSubfolder}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-orange-300 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Subfolder Default
                </button>
              </div>
            )}
          </div>

          {/* ── Right panel: specific user permissions ── */}
          <div
            className={`w-full md:w-2/3 flex flex-col bg-gray-50 ${
              showPrivacyToggle && !isShared ? 'hidden md:hidden' : ''
            }`}
          >
            <div className="p-4 border-b border-gray-200 bg-white">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">
                Spesifik User Permission{' '}
                <span className="font-normal text-gray-400">(Optional)</span>
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Berikan akses ke user tertentu. Untuk user dengan beberapa role, pilih role
                yang akan menerima akses.
              </p>
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
                    <div className="absolute z-10 mt-1.5 w-full bg-white shadow-xl max-h-60 rounded-lg py-1 border border-gray-100 overflow-auto">
                      <button
                        onClick={() => {
                          setSelectedRoleFilter(null);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                          !selectedRoleFilter
                            ? 'bg-orange-50 text-orange-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-sm font-semibold">Semua Role</span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {users.length}
                        </span>
                      </button>
                      {Object.keys(roleStats).map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            setSelectedRoleFilter(role);
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                            role === selectedRoleFilter
                              ? 'bg-orange-50 text-orange-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-sm font-semibold truncate pr-2">{role}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              role === selectedRoleFilter
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
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
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-2 py-3 font-semibold text-center w-16">Akses</th>
                      <th className="px-2 py-3 font-semibold text-center w-24">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-gray-500 italic"
                        >
                          Tidak ada user yang ditemukan
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const roleList = getUserActiveRoles(u);
                        const isMultiRole = roleList.length > 1;
                        const isExpanded = expandedUsers.has(u.id);

                        // Which role keys for this user are currently selected.
                        // Also include the null-role-id key ("userId::null") which is how
                        // user permissions saved with role_id=null appear after a DB reload.
                        const selectedKeys = [
                          ...roleList.map((r) => `${u.id}::${r.roleId ?? 'null'}`),
                          `${u.id}::null`,
                        ].filter((k, i, arr) => arr.indexOf(k) === i && !!userPermissions[k]);
                        const anySelected = selectedKeys.length > 0;
                        const downloadChecked =
                          anySelected && selectedKeys.every((k) => userPermissions[k]?.download);

                        return (
                          <Fragment key={u.id}>
                            {/* ── Main user row ── */}
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {/* Avatar */}
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                                    {u.name?.[0]?.toUpperCase() ?? '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-medium text-gray-900">
                                        {u.name}
                                      </span>
                                      {/* Multi-role expand toggle */}
                                      {isMultiRole && (
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandUser(u.id)}
                                          title={
                                            isExpanded
                                              ? 'Sembunyikan pilihan role'
                                              : 'Pilih role yang mendapat akses'
                                          }
                                          className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                                        >
                                          {roleList.length} roles {isExpanded ? '▲' : '▼'}
                                        </button>
                                      )}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                      {roleList.map((r) => (
                                        <span
                                          key={r.roleId ?? 'null'}
                                          className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600"
                                        >
                                          {r.roleName}
                                        </span>
                                      ))}
                                      <span className="text-[10px] text-gray-400 truncate max-w-[130px]">
                                        {u.email}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Akses checkbox */}
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={anySelected}
                                  onChange={() => handleToggleUser(u, roleList)}
                                  className="h-4 w-4 rounded border-gray-300 text-orange-600 cursor-pointer"
                                  title={
                                    anySelected
                                      ? 'Cabut akses'
                                      : isMultiRole
                                      ? 'Beri akses (pilih role di bawah)'
                                      : 'Beri akses'
                                  }
                                />
                              </td>

                              {/* Download checkbox */}
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={downloadChecked}
                                  disabled={!anySelected}
                                  onChange={() => toggleDownloadForUser(u.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-orange-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={
                                    !anySelected
                                      ? 'Aktifkan akses terlebih dahulu'
                                      : 'Izinkan download'
                                  }
                                />
                              </td>
                            </tr>

                            {/* ── Inline role-chip picker ── */}
                            {/* Shown for multi-role users when the row is expanded */}
                            {isMultiRole && isExpanded && (
                              <tr className="bg-blue-50/40 border-t border-blue-100">
                                <td colSpan={3} className="px-6 pb-3 pt-2">
                                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                                    Pilih role yang mendapat akses:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {roleList.map((r) => {
                                      const key = `${u.id}::${r.roleId ?? 'null'}`;
                                      const isRoleSelected = !!userPermissions[key];
                                      return (
                                        <button
                                          key={r.roleId ?? 'null'}
                                          type="button"
                                          onClick={() =>
                                            toggleRolePermission(u.id, r.roleId, r.roleName)
                                          }
                                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                                            isRoleSelected
                                              ? 'border-orange-400 bg-orange-100 text-orange-700 shadow-sm'
                                              : 'border-gray-300 bg-white text-gray-600 hover:border-orange-300 hover:bg-orange-50'
                                          }`}
                                        >
                                          {isRoleSelected && (
                                            <Check className="h-3 w-3 shrink-0" />
                                          )}
                                          {r.roleName}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {anySelected && (
                                    <p className="mt-2 text-[10px] text-gray-400">
                                      Folder hanya muncul di "Shared Folders" ketika user
                                      login menggunakan role yang dipilih.
                                    </p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-white px-6 py-4 flex gap-3 justify-end items-center rounded-b-xl">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !folderName.trim()}
            className="flex items-center gap-2 rounded-md bg-orange-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {editFolderId ? 'Simpan Perubahan' : 'Buat Folder'}
          </button>
        </div>
      </div>
    </div>
  );
}
