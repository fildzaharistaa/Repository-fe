'use client';

import { useState, useEffect } from 'react';
import { X, Search, ChevronDown, Check, FolderPlus, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthContext } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import type { Role } from '@/types';

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
  refreshFolders
}: FolderModalProps) {
  const { user, activeRole, isPrivateRole } = useAuthContext();

  const [folderName, setFolderName] = useState(initialFolderName);

  // Dynamic role sharing
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());

  // Specific user permissions
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, { read: boolean, download: boolean }>>({});
  const [loading, setLoading] = useState(false);
  const [defaultSubfolders, setDefaultSubfolders] = useState<string[]>([]);

  // Privat/Bagikan toggle — only relevant for private-role users creating a subfolder.
  // Default: private (isShared=false) for private-role users, shared for others.
  const [isShared, setIsShared] = useState(false);
  const showPrivacyToggle = !!parentId && isPrivateRole && !editFolderId;

  // Load roles once
  useEffect(() => {
    apiClient.getRoles()
      .then((roles) => {
        // Filter out system admin roles from sharing (they already have full access)
        const filtered = roles.filter((r) => !r.is_admin);
        setAllRoles(filtered);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFolderName(initialFolderName);
      setIsShared(false); // always reset to private default on open
      fetchUsers();
      if (editFolderId) {
        // Reset before async fetch to avoid stale state from previous modal session
        setSelectedRoleIds(new Set());
        setUserPermissions({});
        fetchFolderDetails(editFolderId);
      } else {
        setSelectedRoleIds(new Set());
        setUserPermissions({});
        setDefaultSubfolders([]);
      }
    }
  }, [isOpen, editFolderId, initialFolderName]);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.getUsers();
      const fetchedUsers = (res as any).data || res;
      if (Array.isArray(fetchedUsers)) {
        setUsers(fetchedUsers);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchFolderDetails = async (id: string) => {
    try {
      const folder = await apiClient.getFolder(id);
      setFolderName(folder.name);

      const newPerms: Record<string, { read: boolean, download: boolean }> = {};
      const newSelectedIds = new Set<string>();

      // folder.role_id is the workspace role auto-granted to the owner — never treat it as a user-selected share
      const ownerWorkspaceRoleId = folder.role_id ?? null;

      if (folder.permissions) {
        folder.permissions.forEach((perm: any) => {
          if (perm.role && perm.role_id) {
            // Skip the owner's workspace role: it is auto-granted on creation, not a sharing choice
            if (perm.role_id !== ownerWorkspaceRoleId) {
              newSelectedIds.add(perm.role_id);
            }
          }
          if (perm.user && perm.user_id && perm.user_id !== folder.owner_id) {
            newPerms[perm.user_id] = {
              read: perm.can_read,
              download: perm.can_download || false
            };
          }
        });
      }
      setSelectedRoleIds(newSelectedIds);
      setUserPermissions(newPerms);
    } catch (err) {
      console.error('Failed to fetch folder permissions', err);
    }
  };

  const toggleRoleId = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const addSubfolder = () => setDefaultSubfolders(prev => [...prev, '']);
  const removeSubfolder = (i: number) => setDefaultSubfolders(prev => prev.filter((_, idx) => idx !== i));
  const updateSubfolder = (i: number, val: string) =>
    setDefaultSubfolders(prev => prev.map((s, idx) => (idx === i ? val : s)));

  const handleSave = async () => {
    if (!folderName.trim()) return;

    try {
      setLoading(true);

      // Map selected role IDs → names (BE expects names)
      const shareRoles = allRoles
        .filter((r) => selectedRoleIds.has(r.id))
        .map((r) => r.name);

      // Build user-specific permission entries.
      // Include role_id of the recipient user so the permission is scoped to the
      // correct role context — the subfolder will then appear in the right
      // "Shared with me" view when the recipient acts as that role.
      const uPerms = Object.entries(userPermissions)
        .map(([userId, perms]) => {
          const userObj = users.find((u) => u.id === userId);
          const roleId: string | null =
            (typeof userObj?.role === 'object' && userObj?.role !== null
              ? (userObj.role as any).id ?? null
              : null) ??
            (userObj as any)?.role_id ??
            null;
          return {
            user_id: userId,
            role_id: roleId,
            can_read: perms.download,
            can_create: false,
            can_update: false,
            can_delete: false,
            can_download: perms.download,
          };
        })
        .filter(p => p.can_download);

      if (editFolderId) {
        await apiClient.updateFolder(editFolderId, {
          name: folderName,
          share_with_roles: shareRoles,
          user_permissions: uPerms
        });
        onSuccess(`Eksekusi pengaturan Folder "${folderName}" sukses diperbarui.`);
      } else {
        const validSubfolders = defaultSubfolders.map(s => s.trim()).filter(Boolean);
        // For private-role users creating a subfolder: only share if user explicitly chose "Bagikan"
        const applySharing = !showPrivacyToggle || isShared;
        await apiClient.createFolder({
          name: folderName,
          parent_id: parentId || undefined,
          share_with_roles: applySharing && shareRoles.length > 0 ? shareRoles : undefined,
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
      const newVal = !current[perm];
      if (perm === 'download') {
        return { ...prev, [userId]: { read: newVal, download: newVal } };
      }
      return { ...prev, [userId]: { ...current, [perm]: newVal } };
    });
  };

  // ID of the current user's active role — auto-selected but not forced
  const myActiveRoleId = activeRole?.id ?? user?.role_id;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            {editFolderId ? 'Edit Folder & Permission' : (parentId ? 'Create Subfolder' : 'Create Folder')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[500px]">
          {/* Left panel: folder name + role sharing */}
          <div className={`border-r border-gray-100 bg-white p-6 overflow-y-auto ${showPrivacyToggle && !isShared ? 'w-full' : 'w-full md:w-1/3'}`}>
            <div className="mb-6">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Nama Folder</label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Masukkan nama folder"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black focus:border-orange-500 focus:ring-orange-500 focus:outline-hidden"
                autoFocus
              />
            </div>

            {/* Privat/Bagikan toggle — only for private-role users creating a subfolder */}
            {showPrivacyToggle && (
              <div className="mb-6">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Visibilitas Subfolder</label>
                <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setIsShared(false)}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors ${!isShared ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    🔒 Privat
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShared(true)}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors ${isShared ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
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

            {/* Role-sharing section: always visible for root folders & edits; only when Bagikan for private-role subfolder */}
            {(!showPrivacyToggle || isShared) && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Grup Role Sharing</label>
              <p className="text-xs text-gray-500 mb-3">Pilih role yang bisa mengakses folder ini.</p>
              {allRoles.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Memuat role...</p>
              ) : (
                <div className="space-y-1.5">
                  {allRoles.map((role) => {
                    const isChecked = selectedRoleIds.has(role.id);
                    const isMyRole = role.id === myActiveRoleId;
                    return (
                      <div key={role.id} className="relative group">
                        <label
                          className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                            isMyRole
                              ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                              : isChecked
                                ? 'border-orange-200 bg-orange-50 cursor-pointer'
                                : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => !isMyRole && toggleRoleId(role.id)}
                            disabled={isMyRole}
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <span className={`flex-1 font-medium ${isMyRole ? 'text-gray-400' : 'text-gray-700'}`}>
                            {role.name}
                          </span>
                          {isMyRole && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-200">
                              Role Aktif
                            </span>
                          )}
                        </label>
                        {isMyRole && (
                          <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 shadow-md group-hover:block">
                            Ini adalah role Anda saat ini. Folder ini sudah dapat diakses oleh role ini secara otomatis.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {/* Default Subfolder Template — create mode only */}
            {!editFolderId && (
              <div className="mt-6">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Default Subfolder Template
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Subfolder berikut akan otomatis dibuat di dalam folder ini dan mewarisi semua permission sharing di atas.
                </p>
                <div className="space-y-2">
                  {defaultSubfolders.map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={name}
                          onChange={e => updateSubfolder(i, e.target.value)}
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

          {/* Right panel: specific user permissions — hidden when private subfolder */}
          <div className={`w-full md:w-2/3 flex flex-col bg-gray-50 ${showPrivacyToggle && !isShared ? 'hidden md:hidden' : ''}`}>
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
                    <span className="truncate font-medium text-gray-700">{selectedRoleFilter || 'Semua Role'}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>
                  {showRoleDropdown && (
                    <div className="absolute z-10 mt-1.5 w-full bg-white shadow-xl max-h-60 rounded-lg py-1 border border-gray-100 overflow-auto focus:outline-none">
                      <button
                        onClick={() => { setSelectedRoleFilter(null); setShowRoleDropdown(false); }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${!selectedRoleFilter ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span className="text-sm font-semibold">Semua Role</span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{users.length}</span>
                      </button>
                      {Object.keys(roleStats).map(role => (
                        <button
                          key={role}
                          onClick={() => { setSelectedRoleFilter(role); setShowRoleDropdown(false); }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${role === selectedRoleFilter ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          <span className="text-sm font-semibold truncate pr-2">{role}</span>
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
                      <th className="px-2 py-3 font-semibold text-center w-24">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-gray-500 italic">Tidak ada user yang ditemukan</td>
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

          </div>
        </div>

        {/* Footer — always visible regardless of privacy toggle state */}
        <div className="border-t border-gray-200 bg-white px-6 py-4 flex gap-3 justify-end items-center rounded-b-xl">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
          <button
            onClick={handleSave}
            disabled={loading || !folderName.trim()}
            className="flex items-center gap-2 rounded-md bg-orange-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
