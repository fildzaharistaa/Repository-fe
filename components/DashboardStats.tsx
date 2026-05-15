'use client';

import { useState, useEffect } from 'react';
import { Folder, FileText, HardDrive, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatFileSize } from '@/lib/utils/formatters';
import { useAuthContext } from '@/context/AuthContext';

interface UserStats {
  totalFolders: number;
  totalFiles: number;
  totalSize: number;
  maxStoragePerUser: number;
  maxFolderDepth: number;
  recentFiles: Array<{
    id: string;
    name: string;
    size: number;
    created_at: string;
    folder_name: string;
  }>;
}

export function DashboardStats() {
  const { roleVersion } = useAuthContext();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getUserStats();
        setStats(data);
      } catch {
        // Fallback: biarkan null
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [roleVersion]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Storage calculations
  const maxStorage = stats.maxStoragePerUser || 104857600; // 100 MB
  const storagePercentage = Math.min((stats.totalSize / maxStorage) * 100, 100);
  const storageColor = storagePercentage > 85 ? 'from-red-500 to-red-600' 
    : storagePercentage > 60 ? 'from-amber-400 to-amber-500' 
    : 'from-emerald-400 to-emerald-500';
  const storageBgColor = storagePercentage > 85 ? 'bg-red-100' 
    : storagePercentage > 60 ? 'bg-amber-100' 
    : 'bg-emerald-100';
  const storageTextColor = storagePercentage > 85 ? 'text-red-700' 
    : storagePercentage > 60 ? 'text-amber-700' 
    : 'text-emerald-700';

  // Group Recent Files ke Hari Ini dan Sebelumnya
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayFiles = stats.recentFiles.filter(
    (f) => new Date(f.created_at) >= today
  );
  const previousFiles = stats.recentFiles.filter(
    (f) => new Date(f.created_at) < today
  );

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-blue-50 to-blue-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Folders</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">{stats.totalFolders}</p>
            </div>
            <div className="rounded-full bg-blue-200 p-3">
              <Folder className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-green-50 to-green-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Files</p>
              <p className="mt-2 text-3xl font-bold text-green-900">{stats.totalFiles}</p>
            </div>
            <div className="rounded-full bg-green-200 p-3">
              <FileText className="h-6 w-6 text-green-700" />
            </div>
          </div>
        </div>

        {/* Storage Card with Progress Bar */}
        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-purple-50 to-purple-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-purple-600">Storage</p>
              <p className="mt-1 text-xl font-bold text-purple-900">
                {formatFileSize(stats.totalSize)} <span className="text-sm font-normal text-purple-500">/ {formatFileSize(maxStorage)}</span>
              </p>
            </div>
            <div className="rounded-full bg-purple-200 p-3">
              <HardDrive className="h-6 w-6 text-purple-700" />
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full rounded-full bg-linear-to-r ${storageColor} transition-all duration-500`}
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${storageBgColor} ${storageTextColor}`}>
              {storagePercentage.toFixed(1)}% terpakai
            </span>
            <span className="text-xs text-purple-500">
              Sisa: {formatFileSize(Math.max(0, maxStorage - stats.totalSize))}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Files</h3>
        </div>

        {stats.recentFiles.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No recent files</p>
        ) : (
          <div className="space-y-8">
            {todayFiles.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Hari Ini
                </h4>
                <div className="space-y-3">
                  {todayFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • {file.folder_name} • {new Date(file.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previousFiles.length > 0 && (
              <div>
                <div className="space-y-3">
                  {previousFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • {file.folder_name} • {new Date(file.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
