'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Folder, FileText, Users, Upload,
  Check, X, HardDrive, ChevronRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthContext } from '@/context/AuthContext';
import { useFolderContext } from '@/context/FolderContext';
import { useRouter } from 'next/navigation';
import { Role } from '@/types';
import toast from 'react-hot-toast';

// ── Helpers ────────────────────────────────────────────────────────────────


const ROLE_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B', '#06B6D4', '#84CC16', '#EC4899', '#14B8A6'];

// Assign a consistent color per role name
const getRoleColor = (name: string, index: number): string => {
  const n = name.toLowerCase();
  if (n.includes('dosen')) return '#F97316';
  if (n.includes('tendik')) return '#3B82F6';
  if (n.includes('wakil dekan 1') || n === 'wd1') return '#8B5CF6';
  if (n.includes('wakil dekan 2')) return '#10B981';
  if (n.includes('wakil dekan 3') || n === 'wd3') return '#06B6D4';
  if (n.includes('kepala')) return '#F59E0B';
  if (n.includes('ketua')) return '#EC4899';
  if (n.includes('koordinator')) return '#84CC16';
  if (n.includes('super') || n.includes('admin')) return '#6B7280';
  return ROLE_COLORS[index % ROLE_COLORS.length];
};

const formatSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getInitials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

const formatDateOnly = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Types ──────────────────────────────────────────────────────────────────

interface Stats {
  totalRoles: number;
  totalFolders: number;
  totalFiles: number;
  totalSize: number;
  maxFolderDepth: number;
  maxStoragePerUser: number;
  maxUploadSize: number;
  foldersPerUnit: Array<{ unit: string; count: string }>;
  storagePerUnit: Array<{ unit: string; totalSize: string }>;
  usersPerRole: Array<{ roleName: string; count: string }>;
  recentActivity: Array<{ timestamp: string; user: string; action: string; type: 'superadmin' | 'user' }>;
}

// ── Component ─────────────────────────────────────────────────────────────

export function SuperAdminDashboard() {
  const { user } = useAuthContext();
  const { setActiveMenu } = useFolderContext();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'superadmin' | 'user'>('all');

  // Settings
  const [maxDepthInput, setMaxDepthInput] = useState(5);
  const [savingDepth, setSavingDepth] = useState(false);
  const [hierarchyRequests, setHierarchyRequests] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleDepthInput, setRoleDepthInput] = useState(5);
  const [savingRoleDepth, setSavingRoleDepth] = useState(false);
  const [showDepthModal, setShowDepthModal] = useState(false);

  // ── Data fetch ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSuperAdminStats();
      setStats(data as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await apiClient.getRoles();
      setRoles(data.filter(r =>
        !r.name.toLowerCase().includes('dosen') &&
        !r.name.toLowerCase().includes('tendik') &&
        !r.name.toLowerCase().includes('admin') &&
        !r.name.toLowerCase().includes('superadmin')
      ));
    } catch { /* silent */ }
  };

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    window.addEventListener('folder-stats-changed', fetchStats);
    return () => window.removeEventListener('folder-stats-changed', fetchStats);
  }, [fetchStats]);

  useEffect(() => {
    const fetchHierarchy = async () => {
      try { setHierarchyRequests(await apiClient.getPendingHierarchyRequests()); } catch { /* silent */ }
    };
    fetchHierarchy();
    fetchRoles();
  }, []);

  useEffect(() => { if (stats?.maxFolderDepth) setMaxDepthInput(stats.maxFolderDepth); }, [stats]);

  // ── Derived data ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-gray-500 text-sm">Memuat dashboard...</p>
        </div>
      </div>
    );
  }
  if (error) return <div className="flex h-64 items-center justify-center text-red-600 text-sm">Error: {error}</div>;
  if (!stats) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const filteredActivities = activityFilter === 'all'
    ? stats.recentActivity
    : stats.recentActivity.filter(a => a.type === activityFilter);

  // Weekly activity stats
  const weekActivities = stats.recentActivity.filter(a => new Date(a.timestamp) >= weekAgo);
  const weekUploads = weekActivities.filter(a => a.action.toLowerCase().includes('upload')).length;
  const weekFolders = weekActivities.filter(a => a.action.toLowerCase().includes('folder')).length;

  // Top active users from activity
  const userActivityCount: Record<string, number> = {};
  stats.recentActivity.forEach(a => {
    userActivityCount[a.user] = (userActivityCount[a.user] || 0) + 1;
  });
  const topUsers = Object.entries(userActivityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Storage bar chart: max value for scaling
  const storagePerUnit = stats.storagePerUnit || [];

  // Folder per unit: max for scaling
  const maxFolderCount = Math.max(...stats.foldersPerUnit.map(u => parseInt(u.count || '0')), 1);

  // Date label
  const dateLabel = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const storagePercent = stats.maxStoragePerUser
    ? Math.min((stats.totalSize / stats.maxStoragePerUser) * 100, 100)
    : 0;

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Selamat datang, {user?.name || 'Super Admin'}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{dateLabel}</span>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: 'Total Role', value: stats.totalRoles, sub: 'Peran sistem aktif', icon: Users, color: 'orange', border: 'border-l-orange-500' },
          { label: 'Total Folder', value: stats.totalFolders, sub: '+2 bulan ini', icon: Folder, color: 'blue', border: 'border-l-blue-500' },
          { label: 'Total File', value: stats.totalFiles, sub: 'File diunggah', icon: FileText, color: 'green', border: 'border-l-green-500' },
          { label: 'Total Storage', value: formatSize(stats.totalSize), sub: `Dari ${formatSize(stats.maxStoragePerUser || 104857600)} limit`, icon: HardDrive, color: 'purple', border: 'border-l-purple-500' },
          { label: 'Upload Limit', value: `${Math.round((stats.maxUploadSize || 5242880) / (1024 * 1024))} MB`, sub: 'Batas upload saat ini', icon: Upload, color: 'orange', border: 'border-l-orange-400' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border border-gray-200 border-l-4 ${card.border} bg-white p-5 shadow-sm`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                <p className="mt-1.5 text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
              </div>
              <div className={`rounded-full p-2.5 bg-${card.color}-50`}>
                <card.icon className={`h-5 w-5 text-${card.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle Row: Chart + Folder per Unit + Request ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Storage bar chart */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-800">Penggunaan Storage per Unit</p>
          <p className="text-xs text-gray-400 mb-4">Real-time monitoring</p>
          {(() => {
            // Merge: start from ALL roles in usersPerRole, then join storage data
            const storageMap = new Map(storagePerUnit.map(u => [u.unit, parseInt(u.totalSize || '0')]));
            const maxStoragePerUser = stats.maxStoragePerUser || 104857600;
            // Build unified list of ALL roles with their storage and quota
            const allRoleUnits = stats.usersPerRole.map((r, idx) => ({
              name: r.roleName,
              storage: storageMap.get(r.roleName) || 0,
              quota: maxStoragePerUser * (parseInt(r.count || '0') || 1),
              color: getRoleColor(r.roleName, idx),
            }));
            // Add any storagePerUnit entries not in usersPerRole
            storagePerUnit.forEach((u, idx) => {
              if (!allRoleUnits.find(r => r.name === u.unit)) {
                allRoleUnits.push({ name: u.unit, storage: parseInt(u.totalSize || '0'), quota: maxStoragePerUser, color: getRoleColor(u.unit, idx + allRoleUnits.length) });
              }
            });
            const BAR_H = 120; // px

            return (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent pb-2">
                <div className="flex items-end gap-3" style={{ height: `${BAR_H + 48}px`, minWidth: `${allRoleUnits.length * 80}px` }}>
                  {allRoleUnits.map((r) => {
                    const pct = Math.min(Math.round((r.storage / r.quota) * 100), 100);
                    const barPx = Math.max(Math.round((pct / 100) * BAR_H), r.storage > 0 ? 4 : 0);
                    return (
                      <div key={r.name} className="flex flex-col items-center gap-1 w-20 shrink-0">
                        <span className="text-[11px] font-semibold" style={{ color: r.color }}>{pct}%</span>
                        {/* Gray background bar container */}
                        <div className="w-full rounded-t-lg bg-gray-100 overflow-hidden flex flex-col justify-end" style={{ height: `${BAR_H}px` }}>
                          <div className="w-full rounded-t-lg transition-all duration-700" style={{ height: `${barPx}px`, backgroundColor: r.color }} />
                        </div>
                        <span className="text-[10px] text-gray-500 text-center w-full leading-tight" title={r.name}>{r.name}</span>
                      </div>
                    );
                  })}
                  {allRoleUnits.length === 0 && (
                    <p className="text-xs text-gray-400 self-center">Belum ada data storage</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Folder per Unit + Request Kedalaman */}
        <div className="flex flex-col gap-4">
          {/* Folder per Unit */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-3">Folder per Unit</p>
            <div className="space-y-2">
              {stats.foldersPerUnit.slice(0, 5).map((u, idx) => {
                const count = parseInt(u.count);
                const pct = Math.round((count / maxFolderCount) * 100);
                const color = getRoleColor(u.unit, idx);
                return (
                  <div key={u.unit} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24 truncate capitalize">{u.unit}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span>
                  </div>
                );
              })}
              {stats.foldersPerUnit.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Belum ada folder</p>}
            </div>
          </div>

          {/* Request Kedalaman */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-3">Request Kedalaman</p>
            {hierarchyRequests.length === 0 ? (
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-center mb-3">
                <p className="text-xs text-orange-700 font-medium">Tidak ada request pending saat ini</p>
              </div>
            ) : (
              <div className="space-y-2 mb-3 max-h-20 overflow-y-auto">
                {hierarchyRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{req.requester?.name}</p>
                      <p className="text-[10px] text-gray-500">→ <span className="font-bold text-orange-600">{req.requested_depth} level</span></p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={async () => { try { await apiClient.approveHierarchyRequest(req.id); toast.success('Approved'); setHierarchyRequests(p => p.filter(r => r.id !== req.id)); const d = await apiClient.getSuperAdminStats(); setStats(d as any); } catch { toast.error('Gagal'); } }} className="rounded bg-green-500 px-1.5 py-1 text-white hover:bg-green-600"><Check className="h-3 w-3" /></button>
                      <button onClick={async () => { try { await apiClient.rejectAccessRequest(req.id); toast.success('Ditolak'); setHierarchyRequests(p => p.filter(r => r.id !== req.id)); } catch { toast.error('Gagal'); } }} className="rounded bg-red-500 px-1.5 py-1 text-white hover:bg-red-600"><X className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mb-2">Global Depth: <span className="font-semibold text-gray-700">{stats.maxFolderDepth} Level</span></p>
            <button onClick={() => setShowDepthModal(true)} className="w-full rounded-lg bg-orange-600 py-2 text-xs font-semibold text-white hover:bg-orange-700">
              Atur Kedalaman Global
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Row ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Ringkasan Pengguna */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">Ringkasan Pengguna</p>
            <span className="text-xs font-semibold text-gray-400">
              {stats.usersPerRole.reduce((s, r) => s + parseInt(r.count), 0)} total
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.usersPerRole.map((r, i) => (
              <div key={r.roleName} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }}>
                  {parseInt(r.count)}
                </span>
                <span className="text-xs text-gray-600 truncate">{r.roleName}</span>
              </div>
            ))}
            {stats.usersPerRole.length === 0 && (
              <p className="col-span-2 text-xs text-gray-400 text-center py-2">Belum ada data</p>
            )}
          </div>
        </div>

        {/* Aktivitas Minggu Ini */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-3">Aktivitas Minggu Ini</p>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-orange-600">{weekActivities.length}</p>
              <p className="text-[10px] text-gray-500">Aksi dilakukan</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{weekUploads}</p>
              <p className="text-[10px] text-gray-500">File diupload</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">{weekFolders}</p>
              <p className="text-[10px] text-gray-500">Folder dibuat</p>
            </div>
          </div>
        </div>

        {/* Storage Overview */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-3">Storage Overview</p>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${storagePercent}%` }} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{formatSize(stats.totalSize)} / {formatSize(stats.maxStoragePerUser || 104857600)} per user</span>
            <span className="text-xs font-semibold text-orange-600">{storagePercent < 1 ? '< 1%' : `${storagePercent.toFixed(1)}%`} terpakai</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Activity + Quick Actions + Top Users ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Recent Activity</p>
              <p className="text-xs text-gray-400">Aktivitas terbaru seluruh pengguna</p>
            </div>
          </div>

          {/* Tab filter */}
          <div className="flex gap-1 mb-4">
            {(['all', 'user', 'superadmin'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActivityFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${activityFilter === f ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f === 'all' ? 'Semua' : f === 'user' ? 'User' : 'Super Admin'}
              </button>
            ))}
          </div>

          {filteredActivities.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Belum ada aktivitas</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['TANGGAL & WAKTU', 'USER', 'TIPE', 'AKSI'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {filteredActivities.slice(0, 10).map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500">{formatDateOnly(a.timestamp)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-700">{a.user}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {a.type === 'superadmin' ? (
                          <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">Admin</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">User</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-800">{a.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredActivities.length > 10 && (
            <button className="mt-3 w-full text-center text-xs text-orange-600 hover:underline">
              Lihat semua aktivitas →
            </button>
          )}
        </div>

        {/* Right sidebar: Quick Actions + Top Active Users */}
        <div className="flex flex-col gap-4">
          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-3">Quick Actions</p>
            <div className="space-y-2">
              <button
                onClick={() => { router.push('/super-admin'); setActiveMenu(null); }}
                className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-colors"
              >
                <span>Kelola Role Management</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => { router.push('/super-admin'); setActiveMenu(null); }}
                className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-colors"
              >
                <span>Tambah User Baru</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Top Active Users */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-1">Top Active Users</p>
            <p className="text-[10px] text-gray-400 mb-3">Minggu ini</p>
            <div className="space-y-2.5">
              {topUsers.map(([email, count], i) => {
                const name = email.includes('@') ? email.split('@')[0] : email;
                const color = ROLE_COLORS[i] || '#6B7280';
                return (
                  <div key={email} className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
                      {getInitials(name.replace('.', ' '))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{email}</p>
                      <p className="text-[10px] text-gray-400">
                        {name.toLowerCase().includes('super') || name.toLowerCase().includes('admin') ? 'Administrator' : 'User'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">{count}</span>
                  </div>
                );
              })}
              {topUsers.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Belum ada aktivitas</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Depth Settings Modal ── */}
      {showDepthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Pengaturan Kedalaman Folder</h3>
                <p className="text-xs text-gray-500">Global dan per-role</p>
              </div>
              <button onClick={() => setShowDepthModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Global */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Default Global (Semua User)</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={5} value={maxDepthInput} onChange={(e) => setMaxDepthInput(Math.max(5, parseInt(e.target.value) || 5))}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" />
                  <button onClick={async () => { try { setSavingDepth(true); await apiClient.updateSetting('max_folder_depth', String(maxDepthInput)); toast.success(`Diperbarui ke ${maxDepthInput} level`); const d = await apiClient.getSuperAdminStats(); setStats(d as any); await fetchRoles(); } catch { toast.error('Gagal'); } finally { setSavingDepth(false); } }}
                    disabled={savingDepth} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                    {savingDepth ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum 5 level</p>
              </div>

              <hr />

              {/* Per-role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Limit Per Role</label>
                <div className="mb-3 space-y-1.5 max-h-32 overflow-y-auto rounded-lg border border-gray-100 p-2 bg-gray-50">
                  {roles.map(role => (
                    <label key={role.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-orange-600" checked={selectedRoles.includes(role.id)}
                        onChange={(e) => { if (e.target.checked) setSelectedRoles([...selectedRoles, role.id]); else setSelectedRoles(selectedRoles.filter(id => id !== role.id)); }} />
                      <span className="font-medium flex-1">{role.name}</span>
                      {role.max_folder_depth != null && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{role.max_folder_depth} level</span>}
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input type="number" min={5} value={roleDepthInput} onChange={(e) => setRoleDepthInput(Math.max(5, parseInt(e.target.value) || 5))}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" placeholder="Limit role..." />
                  <button onClick={async () => { if (!selectedRoles.length) { toast.error('Pilih role terlebih dahulu'); return; } try { setSavingRoleDepth(true); await apiClient.updateRoleDepth(selectedRoles, roleDepthInput); toast.success(`Diperbarui untuk ${selectedRoles.length} role`); setRoles(roles.map(r => selectedRoles.includes(r.id) ? { ...r, max_folder_depth: roleDepthInput } : r)); setSelectedRoles([]); } catch { toast.error('Gagal'); } finally { setSavingRoleDepth(false); } }}
                    disabled={savingRoleDepth || !selectedRoles.length} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                    {savingRoleDepth ? 'Menyimpan...' : 'Terapkan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
