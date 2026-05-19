'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Edit2,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { useUsers } from '@/hooks/useUsers';
import type { Role, User, UserRole, UserRoleStatus } from '@/types';

const STATUS_BADGE: Record<UserRoleStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  PENDING_REACTIVATION: 'bg-amber-100 text-amber-700',
};

const STATUS_LABEL: Record<UserRoleStatus, string> = {
  ACTIVE: 'Aktif',
  SUSPENDED: 'Suspended',
  PENDING_REACTIVATION: 'Menunggu',
};

const AVATAR_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f59e0b', '#6366f1',
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

// ─── Main component ────────────────────────────────────────────────────────

export function UserRoleAssignment() {
  const { users, fetchUsers } = useUsers();
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // All active user_roles (for table Role Default + Role Tambahan columns)
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Pending reactivation queue
  const [pendingList, setPendingList] = useState<UserRole[]>([]);
  const [pendingExpanded, setPendingExpanded] = useState(true);

  // Slide panel (Multi-Role management)
  const [panelUser, setPanelUser] = useState<User | null>(null);
  const [panelAssignments, setPanelAssignments] = useState<UserRole[]>([]);
  const [loadingPanel, setLoadingPanel] = useState(false);

  // Panel: add role inline form
  const [addRoleId, setAddRoleId] = useState('');
  const [addPrimary, setAddPrimary] = useState(false);
  const [addExpires, setAddExpires] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const addRoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addRoleRef.current && !addRoleRef.current.contains(e.target as Node))
        setAddRoleOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Inline edit description per assignment
  const [editingAssignId, setEditingAssignId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');

  // Suspend prompt
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Bulk modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [bulkUserIds, setBulkUserIds] = useState<Set<string>>(new Set());
  const [bulkPrimary, setBulkPrimary] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const [, rolesData, urData, pendingData] = await Promise.allSettled([
        fetchUsers(1, 100),
        apiClient.saListRoles({ includeInactive: false }),
        apiClient.saGetAllActiveUserRoles(),
        apiClient.saGetPendingReactivations(),
      ]);
      if (rolesData.status === 'fulfilled') setRoles(rolesData.value);
      if (urData.status === 'fulfilled') setUserRoles(urData.value);
      if (pendingData.status === 'fulfilled') setPendingList(pendingData.value);
    } finally {
      setLoadingRoles(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshActiveRoles = async () => {
    try {
      const data = await apiClient.saGetAllActiveUserRoles();
      setUserRoles(data);
    } catch { /* skip */ }
  };

  const loadPending = async () => {
    try {
      const data = await apiClient.saGetPendingReactivations();
      setPendingList(data);
    } catch { /* skip */ }
  };

  const openPanel = async (user: User) => {
    setPanelUser(user);
    setLoadingPanel(true);
    setAddFormOpen(false);
    setAddRoleId('');
    setAddPrimary(false);
    setAddExpires('');
    try {
      const data = await apiClient.saListUserRoles(user.id);
      setPanelAssignments(data);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal load');
    } finally {
      setLoadingPanel(false);
    }
  };

  const reloadPanel = async () => {
    if (!panelUser) return;
    try {
      const data = await apiClient.saListUserRoles(panelUser.id);
      setPanelAssignments(data);
      await refreshActiveRoles();
    } catch { /* skip */ }
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const userRoleMap = useMemo(() => {
    const map: Record<string, UserRole[]> = {};
    for (const ur of userRoles) {
      if (!map[ur.user_id]) map[ur.user_id] = [];
      map[ur.user_id].push(ur);
    }
    return map;
  }, [userRoles]);

  const filteredUsers = useMemo(() => {
    const list = (users?.data ?? []).slice().sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((u) => {
      if (u.name?.toLowerCase().includes(q)) return true;
      if (u.email?.toLowerCase().includes(q)) return true;
      const urs = userRoleMap[u.id] ?? [];
      if (urs.some((ur) => ur.role?.name?.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [users, search, sortDir, userRoleMap]);

  // ── Panel actions ─────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!panelUser || !addRoleId) return;
    try {
      await apiClient.saAssignRole(panelUser.id, {
        roleId: addRoleId,
        isPrimary: addPrimary,
        expiresAt: addExpires || undefined,
        description: addDescription || undefined,
      });
      toast.success('Role di-assign');
      setAddFormOpen(false);
      setAddRoleId('');
      setAddPrimary(false);
      setAddExpires('');
      setAddDescription('');
      await reloadPanel();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal assign');
    }
  };

  const handleSetPrimary = async (a: UserRole) => {
    if (!panelUser) return;
    try {
      await apiClient.saSetPrimaryRole(panelUser.id, a.role_id);
      toast.success('Primary role diset');
      await reloadPanel();
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
  };

  const handleSuspendConfirm = async () => {
    if (!suspendId) return;
    try {
      await apiClient.saSuspendAssignment(suspendId, suspendReason || undefined);
      toast.success('Assignment di-suspend');
      setSuspendId(null);
      setSuspendReason('');
      await reloadPanel();
      await loadPending();
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
  };

  const handleReactivate = async (a: UserRole) => {
    try {
      await apiClient.saReactivateAssignment(a.id);
      toast.success('Assignment diaktifkan');
      await reloadPanel();
      await loadPending();
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
  };

  const handleRemove = async (a: UserRole) => {
    if (!panelUser || !confirm(`Hapus assignment "${a.role?.name}"?`)) return;
    try {
      await apiClient.saRemoveRoleAssignment(panelUser.id, a.role_id);
      toast.success('Assignment dihapus');
      await reloadPanel();
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
  };

  const handleSaveDescription = async (a: UserRole) => {
    if (!panelUser) return;
    try {
      await apiClient.saAssignRole(panelUser.id, {
        roleId: a.role_id,
        description: editDescription || undefined,
      });
      toast.success('Keterangan disimpan');
      setEditingAssignId(null);
      await reloadPanel();
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
  };

  const handleApprovePending = async (a: UserRole) => {
    try {
      await apiClient.saReactivateAssignment(a.id);
      toast.success(`Reaktivasi "${a.role?.name}" untuk ${a.user?.name} disetujui`);
      await loadPending();
      await refreshActiveRoles();
      if (panelUser?.id === a.user_id) await reloadPanel();
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
  };

  const handleRejectPending = async (a: UserRole) => {
    const reason = prompt(`Alasan penolakan (opsional):`) ?? null;
    if (reason === null) return;
    try {
      await apiClient.saSuspendAssignment(a.id, reason || a.suspended_reason || undefined);
      toast.success('Permintaan ditolak');
      await loadPending();
      if (panelUser?.id === a.user_id) await reloadPanel();
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
  };

  // ── Bulk assign ───────────────────────────────────────────────────────────

  const handleBulk = async () => {
    if (!bulkRoleId || bulkUserIds.size === 0) return;
    try {
      const res = await apiClient.saBulkAssignRole({
        userIds: Array.from(bulkUserIds),
        roleId: bulkRoleId,
        isPrimary: bulkPrimary,
      });
      const ok = res.results.filter((r) => r.ok).length;
      const fail = res.results.length - ok;
      toast.success(`Bulk assign: ${ok} sukses${fail ? `, ${fail} gagal` : ''}`);
      setBulkOpen(false);
      setBulkUserIds(new Set());
      setBulkRoleId('');
      setBulkPrimary(false);
      await refreshActiveRoles();
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Pending Reactivation Queue */}
      {pendingList.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50">
          <button
            type="button"
            onClick={() => setPendingExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Permintaan Reaktivasi</span>
              <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                {pendingList.length}
              </span>
            </div>
            {pendingExpanded
              ? <ChevronDown className="h-4 w-4 text-amber-600" />
              : <ChevronRight className="h-4 w-4 text-amber-600" />}
          </button>
          {pendingExpanded && (
            <div className="border-t border-amber-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Alasan Suspend</th>
                    <th className="px-4 py-2">Sejak</th>
                    <th className="px-4 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingList.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{a.user?.name}</div>
                        <div className="text-xs text-gray-500">{a.user?.email}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.role?.color || '#94a3b8' }} />
                          {a.role?.name}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">{a.suspended_reason || '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {a.updated_at ? new Date(a.updated_at).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleApprovePending(a)}
                            className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700">
                            <Play className="h-3 w-3" /> Setujui
                          </button>
                          <button onClick={() => handleRejectPending(a)}
                            className="flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                            <X className="h-3 w-3" /> Tolak
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Table header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama, email, atau role..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Users className="h-4 w-4" /> Bulk Assign
          </button>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">
                <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
                  Nama {sortDir === 'asc' ? '↑' : '↓'}
                </button>
              </th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role Default</th>
              <th className="px-4 py-3">Role Tambahan</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loadingRoles ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada user.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const urs = userRoleMap[user.id] ?? [];
                const primary = urs.find((ur) => ur.is_primary)?.role ?? user.role ?? null;
                const additionals = urs.filter((ur) => !ur.is_primary);
                return (
                  <tr key={user.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                          style={{ backgroundColor: avatarColor(user.name) }}
                        >
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      {primary ? (
                        <RoleBadge role={primary} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {additionals.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {additionals.map((ur) => ur.role && (
                            <RoleBadge key={ur.id} role={ur.role} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openPanel(user)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <Plus className="h-3.5 w-3.5" /> Multi-Role
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Slide Panel: Multi-Role Management */}
      {panelUser && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setPanelUser(null)} />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-40 flex w-[440px] flex-col bg-white shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: avatarColor(panelUser.name) }}
              >
                {panelUser.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900">{panelUser.name}</h2>
                <p className="truncate text-xs text-gray-500">{panelUser.email}</p>
              </div>
              <button onClick={() => setPanelUser(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingPanel ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : panelAssignments.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Belum ada role assignment.</p>
              ) : (
                <ul className="space-y-2">
                  {panelAssignments.map((a) => (
                    <li key={a.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: a.role?.color || '#94a3b8' }}
                        />
                        <span className="font-medium text-gray-900">{a.role?.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[a.status]}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                        {a.is_primary && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                            <Star className="h-3 w-3" /> Primary
                          </span>
                        )}
                        {a.expires_at && (
                          <span className="text-xs text-gray-500">
                            exp {new Date(a.expires_at).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </div>
                      {a.description && editingAssignId !== a.id && (
                        <p className="mt-1 pl-5 text-xs text-blue-500 italic">↪ {a.description}</p>
                      )}
                      {a.suspended_reason && (
                        <p className="mt-1 pl-5 text-xs italic text-red-500">↪ {a.suspended_reason}</p>
                      )}
                      {/* Inline edit description form */}
                      {editingAssignId === a.id && (
                        <div className="mt-2 flex items-center gap-2 pl-5">
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            maxLength={200}
                            autoFocus
                            className="flex-1 rounded-md border border-blue-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Keterangan (misal: S1 Sistem Informasi)"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDescription(a); if (e.key === 'Escape') setEditingAssignId(null); }}
                          />
                          <button onClick={() => handleSaveDescription(a)}
                            className="rounded px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700">
                            Simpan
                          </button>
                          <button onClick={() => setEditingAssignId(null)}
                            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
                            Batal
                          </button>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-1.5 pl-5">
                        {a.status === 'ACTIVE' && !a.is_primary && (
                          <button onClick={() => handleSetPrimary(a)}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-amber-600 hover:bg-amber-50">
                            <Star className="h-3.5 w-3.5" /> Set Primary
                          </button>
                        )}
                        {a.status === 'ACTIVE' && (
                          <button onClick={() => { setSuspendId(a.id); setSuspendReason(''); }}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">
                            <Pause className="h-3.5 w-3.5" /> Suspend
                          </button>
                        )}
                        {(a.status === 'SUSPENDED' || a.status === 'PENDING_REACTIVATION') && (
                          <button onClick={() => handleReactivate(a)}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-green-600 hover:bg-green-50">
                            <Play className="h-3.5 w-3.5" /> Aktifkan
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingAssignId(a.id); setEditDescription(a.description || ''); }}
                          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button onClick={() => handleRemove(a)}
                          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100">
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add role inline */}
              <div className="mt-4">
                {!addFormOpen ? (
                  <button
                    onClick={() => setAddFormOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
                  >
                    <Plus className="h-4 w-4" /> Tambah Role
                  </button>
                ) : (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-700">Tambah Role Baru</p>
                    <div className="relative" ref={addRoleRef}>
                      <button
                        type="button"
                        onClick={() => setAddRoleOpen((o) => !o)}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:border-blue-400 focus:outline-none"
                      >
                        {addRoleId ? (() => {
                          const r = roles.find(r => r.id === addRoleId);
                          return (
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: r?.color || '#94a3b8' }} />
                              <span className="font-medium text-gray-800">{r?.name}</span>
                              {r?.is_admin && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">Admin</span>}
                              {r?.is_private && <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">Private</span>}
                            </div>
                          );
                        })() : <span className="text-gray-400 text-sm">— pilih role —</span>}
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${addRoleOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {addRoleOpen && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl">
                          <div className="p-1.5 space-y-0.5">
                            {roles.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => { setAddRoleId(r.id); setAddRoleOpen(false); }}
                                className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                                  addRoleId === r.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: r.color || '#94a3b8' }} />
                                  <span className="text-sm font-medium text-gray-800">{r.name}</span>
                                  {r.is_admin && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">Admin</span>}
                                  {(r as any).is_private && <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">Private</span>}
                                  {r.is_system && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Sistem</span>}
                                </div>
                                {r.description && (
                                  <p className="mt-0.5 pl-5 text-[10px] text-gray-400 truncate">{r.description}</p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-gray-700">
                        <input type="checkbox" checked={addPrimary} onChange={(e) => setAddPrimary(e.target.checked)} />
                        Primary
                      </label>
                      <div className="flex-1">
                        <input
                          type="datetime-local"
                          value={addExpires}
                          onChange={(e) => setAddExpires(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                          placeholder="Expires (opsional)"
                        />
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={addDescription}
                        onChange={(e) => setAddDescription(e.target.value)}
                        maxLength={200}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                        placeholder="Keterangan (misal: S1 Sistem Informasi, Periode 2024)"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleAdd} disabled={!addRoleId}
                        className="flex-1 rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                        Assign
                      </button>
                      <button onClick={() => setAddFormOpen(false)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Suspend reason modal */}
      {suspendId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Suspend Assignment</h3>
            </div>
            <div className="px-5 py-4 space-y-2">
              <label className="text-xs font-medium text-gray-700">Alasan (opsional)</label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Masa jabatan sudah habis..."
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button onClick={() => setSuspendId(null)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Batal</button>
              <button onClick={handleSuspendConfirm}
                className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-5 py-3">
              <h3 className="text-base font-semibold text-gray-900">Bulk Assign Role</h3>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Role</label>
                <select value={bulkRoleId} onChange={(e) => setBulkRoleId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm">
                  <option value="">— pilih —</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={bulkPrimary} onChange={(e) => setBulkPrimary(e.target.checked)} />
                Set sebagai primary
              </label>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Pilih User ({bulkUserIds.size} dipilih)
                </label>
                <div className="mt-1 max-h-64 overflow-y-auto rounded-md border border-gray-200">
                  {(users?.data ?? []).map((u) => (
                    <label key={u.id} className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-sm last:border-b-0 hover:bg-gray-50">
                      <input type="checkbox" checked={bulkUserIds.has(u.id)}
                        onChange={() => {
                          const next = new Set(bulkUserIds);
                          if (next.has(u.id)) next.delete(u.id); else next.add(u.id);
                          setBulkUserIds(next);
                        }} />
                      <span className="flex-1">{u.name}</span>
                      <span className="text-xs text-gray-500">{u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button onClick={() => setBulkOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Batal</button>
              <button onClick={handleBulk} disabled={!bulkRoleId || bulkUserIds.size === 0}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                <CheckCircle2 className="h-4 w-4" />
                Assign ke {bulkUserIds.size} user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Role Badge helper ───────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={
        role.color
          ? { backgroundColor: `${role.color}15`, borderColor: `${role.color}40`, color: role.color }
          : { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb', color: '#374151' }
      }
    >
      {role.name}
    </span>
  );
}
