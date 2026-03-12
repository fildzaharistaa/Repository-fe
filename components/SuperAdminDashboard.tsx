'use client';

import { useState, useEffect } from 'react';
import { Shield, Folder, FileText, Clock, Users } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthContext } from '@/context/AuthContext';

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
      <div className="rounded-2xl border border-gray-200 bg-linear-to-r from-orange-50 via-white to-orange-50 p-6 shadow-sm">
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Storage</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatSize(stats.totalSize)}</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <div className="h-6 w-6 flex items-center justify-center">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
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
