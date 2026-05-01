'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, Folder, FileText, Clock, Users, Upload, Loader2, Settings, Layers, Check, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthContext } from '@/context/AuthContext';
import { Role } from '@/types';
import toast from 'react-hot-toast';

const UNIT_LABELS: Record<string, string> = {
  wd1: 'WD 1',
  wd2: 'WD 2',
  wd3: 'WD 3',
  dosen: 'Dosen',
  tendik: 'Tendik',
  general: 'General',
};

const UNIT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  wd1: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
  wd2: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
  wd3: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
  dosen: { bg: 'bg-sky-50', text: 'text-sky-700', icon: 'text-sky-500' },
  tendik: { bg: 'bg-slate-50', text: 'text-slate-700', icon: 'text-slate-500' },
  general: { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-500' },
};

interface Stats {
  totalRoles: number;
  totalFolders: number;
  totalFiles: number;
  totalSize: number;
  maxFolderDepth: number;
  maxStoragePerUser: number;
  foldersPerUnit: Array<{ unit: string; count: string }>;
  usersPerRole: Array<{ roleName: string; count: string }>;
  recentActivity: Array<{ timestamp: string; user: string; action: string; type: 'superadmin' | 'user' }>;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function SuperAdminDashboard() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Filter dropdown: semua aktivitas, super admin saja, atau user saja
  const [activityFilter, setActivityFilter] = useState<'all' | 'superadmin' | 'user'>('all');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings states
  const [maxDepthInput, setMaxDepthInput] = useState(5);
  const [savingDepth, setSavingDepth] = useState(false);
  const [hierarchyRequests, setHierarchyRequests] = useState<any[]>([]);
  
  // Roles Depth Settings states
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleDepthInput, setRoleDepthInput] = useState(5);
  const [savingRoleDepth, setSavingRoleDepth] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const toastId = toast.loading('Membaca file Excel...');
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error('Gagal membaca file');
          
          // Dynamically import xlsx for client side
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          const rawData = XLSX.utils.sheet_to_json(sheet) as any[];
          
          if (rawData.length === 0) {
             toast.error('File Excel kosong', { id: toastId });
             return;
          }

          // Map the imported JSON to the expected standard keys: email, name, role
          toast.loading(`Memproses ${rawData.length} baris data...`, { id: toastId });
          const formattedData = rawData.map(row => ({
            name: row.Nama || row.name || row.Name || 'Unknown',
            email: row.Email || row.email || `${Math.random().toString(36).substring(7)}@upnvj.ac.id`,
            role: row.Jabatan || row.Role || row.role || 'Tendik'
          }));

          const response = await apiClient.importUsers(formattedData);
          toast.success(`Berhasil import ${response.success} user. Gagal: ${response.failed}`, { id: toastId });
          
          // If there were fails, maybe show a quick alert
          if (response.failed > 0) {
             console.log('Import errors:', response.errors);
          }
        } catch (err: any) {
          toast.error(err.message || 'Error saat parse Excel', { id: toastId });
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      
      reader.readAsBinaryString(file);
    } catch (err) {
      toast.error('Terjadi kesalahan sistem');
      setIsImporting(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getSuperAdminStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await apiClient.getRoles();
      // Filter out Dosen and Tendik since they shouldn't have custom depths
      const filteredRoles = data.filter(r => 
        !r.name.toLowerCase().includes('dosen') && 
        !r.name.toLowerCase().includes('tendik') &&
        !r.name.toLowerCase().includes('admin') &&
        !r.name.toLowerCase().includes('superadmin')
      );
      setRoles(filteredRoles);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  // Fetch hierarchy requests and roles
  useEffect(() => {
    const fetchHierarchyRequests = async () => {
      try {
        const data = await apiClient.getPendingHierarchyRequests();
        setHierarchyRequests(data);
      } catch (err) {
        console.error('Failed to fetch hierarchy requests:', err);
      }
    };
    fetchHierarchyRequests();
    fetchRoles();
  }, []);

  // Set maxDepthInput when stats load
  useEffect(() => {
    if (stats?.maxFolderDepth) {
      setMaxDepthInput(stats.maxFolderDepth);
    }
  }, [stats]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
          <p className="text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter aktivitas berdasarkan dropdown
  const filteredActivities = activityFilter === 'all'
    ? stats.recentActivity
    : stats.recentActivity.filter(a => a.type === activityFilter);

  // Kelompokkan berdasarkan tanggal (Hari Ini vs Sebelumnya)
  const activitiesToday = filteredActivities.filter(a => new Date(a.timestamp) >= today);
  const activitiesPrevious = filteredActivities.filter(a => new Date(a.timestamp) < today);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl border border-gray-200 bg-linear-to-r from-orange-50 via-white to-orange-50 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-orange-700 shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome! <span className="text-orange-600">{user?.name || 'Super Admin'}</span>
            </h1>
            <p className="text-sm text-gray-500">Sistem Repository Fakultas Ilmu Komputer</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            Import Data User (Excel)
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Role</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalRoles}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Folder</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalFolders}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Folder className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total File</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalFiles}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Storage (Global)</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatSize(stats.totalSize)}</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <div className="h-6 w-6 flex items-center justify-center">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-1">Limit per user: {formatSize(stats.maxStoragePerUser || 104857600)}</p>
        </div>
      </div>

      {/* Folders per Unit */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Folder className="h-5 w-5 text-orange-600" />
          Folder per Unit
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.foldersPerUnit.map((item) => {
            const colors = UNIT_COLORS[item.unit] || UNIT_COLORS.general;
            return (
              <div
                key={item.unit}
                className={`rounded-xl border border-gray-100 ${colors.bg} p-4 text-center transition-all hover:shadow-md`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wider ${colors.icon}`}>
                  {UNIT_LABELS[item.unit] || item.unit}
                </div>
                <div className={`mt-1 text-2xl font-bold ${colors.text}`}>
                  {parseInt(item.count)}
                </div>
                <div className="text-xs text-gray-400">folder</div>
              </div>
            );
          })}
          {stats.foldersPerUnit.length === 0 && (
            <div className="col-span-full py-4 text-center text-sm text-gray-500">
              Belum ada folder
            </div>
          )}
        </div>
      </div>

      {/* System Settings Panel */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Max Folder Depth Setting */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Layers className="h-5 w-5 text-orange-600" />
            Pengaturan Kedalaman Folder
          </h3>
          <div className="space-y-6">
            {/* Global Default Setting */}
            <div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Default Global (Semua User)</label>
                  <input
                    type="number"
                    min={5}
                    value={maxDepthInput}
                    onChange={(e) => setMaxDepthInput(Math.max(5, parseInt(e.target.value, 10) || 5))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-orange-500 focus:ring-orange-500 focus:outline-hidden"
                  />
                  <p className="text-xs text-gray-400 mt-1">Batas minimum 5 level. Berlaku jika user/role tidak punya limit custom.</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      setSavingDepth(true);
                      await apiClient.updateSetting('max_folder_depth', String(maxDepthInput));
                      toast.success(`Max kedalaman folder default diperbarui ke ${maxDepthInput} level`);
                      const data = await apiClient.getSuperAdminStats();
                      setStats(data);
                      await fetchRoles(); // Reset UI role list to show null values if reset in backend
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan');
                    } finally {
                      setSavingDepth(false);
                    }
                  }}
                  disabled={savingDepth}
                  className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50 transition-all"
                >
                  {savingDepth ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Per-Role Setting */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Limit Per Role (Kecuali Dosen & Tendik)</label>
              {roles.length === 0 ? (
                <p className="text-xs text-gray-500 italic">Memuat roles...</p>
              ) : (
                <div className="mb-3 space-y-2 max-h-32 overflow-y-auto pr-2 rounded-md border border-gray-100 p-2 bg-gray-50">
                  {roles.map(role => (
                    <label key={role.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors">
                      <input 
                        type="checkbox"
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                        checked={selectedRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRoles([...selectedRoles, role.id]);
                          else setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                        }}
                      />
                      <span className="font-medium capitalize">{role.name}</span>
                      {role.max_folder_depth != null && (
                        <span className="ml-auto text-xs font-semibold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          {role.max_folder_depth} level
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    min={5}
                    value={roleDepthInput}
                    onChange={(e) => setRoleDepthInput(Math.max(5, parseInt(e.target.value, 10) || 5))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-orange-500 focus:ring-orange-500 focus:outline-hidden"
                    placeholder="Limit Role..."
                  />
                </div>
                <button
                  onClick={async () => {
                    if (selectedRoles.length === 0) {
                      toast.error('Pilih setidaknya satu role');
                      return;
                    }
                    try {
                      setSavingRoleDepth(true);
                      await apiClient.updateRoleDepth(selectedRoles, roleDepthInput);
                      toast.success(`Berhasil update limit kedalaman untuk ${selectedRoles.length} role`);
                      // Refresh roles manually or recall fetchRoles logic if abstracted, here we just update state
                      setRoles(roles.map(r => selectedRoles.includes(r.id) ? { ...r, max_folder_depth: roleDepthInput } : r));
                      setSelectedRoles([]);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Gagal update role');
                    } finally {
                      setSavingRoleDepth(false);
                    }
                  }}
                  disabled={savingRoleDepth || selectedRoles.length === 0}
                  className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50 transition-all"
                >
                  {savingRoleDepth ? 'Memproses...' : 'Terapkan'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Hierarchy Requests */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Settings className="h-5 w-5 text-orange-600" />
            Request Tambah Kedalaman
            {hierarchyRequests.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {hierarchyRequests.length}
              </span>
            )}
          </h3>
          {hierarchyRequests.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Tidak ada request pending</p>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {hierarchyRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {req.requester?.name} - {req.requester?.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Request ke <span className="font-bold text-orange-600">{req.requested_depth} level</span>
                      {req.message && ` — "${req.message}"`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await apiClient.approveHierarchyRequest(req.id);
                          toast.success('Hierarchy request approved!');
                          setHierarchyRequests(prev => prev.filter(r => r.id !== req.id));
                          // Refresh stats
                          const data = await apiClient.getSuperAdminStats();
                          setStats(data);
                          setMaxDepthInput(data.maxFolderDepth);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Gagal approve');
                        }
                      }}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await apiClient.rejectAccessRequest(req.id);
                          toast.success('Hierarchy request ditolak');
                          setHierarchyRequests(prev => prev.filter(r => r.id !== req.id));
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Gagal reject');
                        }
                      }}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity — satu tabel dengan dropdown filter */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Clock className="h-5 w-5 text-orange-600" />
            Recent Activity
          </h3>
          {/* Dropdown filter */}
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value as 'all' | 'superadmin' | 'user')}
            className="rounded-lg border border-black-400 bg-orange-100 px-2 py-1 text-sm text-black shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Activity</option>
            <option value="superadmin">Super Admin</option>
            <option value="user">Users</option>
          </select>
        </div>

        {filteredActivities.length === 0 ? (
          <p className="py-8 text-center text-gray-500">Belum ada aktivitas</p>
        ) : (
          <div className="space-y-8">

            {/* Hari Ini */}
            {activitiesToday.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Hari Ini
                </h4>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Waktu</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tipe</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">User</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {activitiesToday.map((activity, index) => (
                        <tr key={index} className="transition-colors hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                            {new Date(activity.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {activity.type === 'superadmin' ? (
                              <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                                Super Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                User
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{activity.user}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{activity.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sebelumnya */}
            {activitiesPrevious.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Sebelumnya
                </h4>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tanggal & Waktu</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tipe</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">User</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {activitiesPrevious.map((activity, index) => (
                        <tr key={index} className="transition-colors hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                            {new Date(activity.timestamp).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {activity.type === 'superadmin' ? (
                              <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                                Super Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                User
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{activity.user}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{activity.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
