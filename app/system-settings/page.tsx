'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiClient } from '@/lib/api/client';
import { Upload, Settings, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function SystemSettingsContent() {
  const [maxUploadSizeMB, setMaxUploadSizeMB] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .getSettings()
      .then((settings) => {
        if (settings.max_upload_size) {
          setMaxUploadSizeMB(Math.round(parseInt(settings.max_upload_size, 10) / (1024 * 1024)));
        }
      })
      .catch(() => toast.error('Gagal memuat pengaturan sistem'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!Number.isInteger(maxUploadSizeMB) || maxUploadSizeMB < 1 || maxUploadSizeMB > 500) {
      toast.error('Ukuran harus berupa angka bulat antara 1 MB dan 500 MB');
      return;
    }
    try {
      setSaving(true);
      const bytes = String(maxUploadSizeMB * 1024 * 1024);
      await apiClient.updateSetting('max_upload_size', bytes);
      toast.success('Pengaturan berhasil disimpan');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500">Kelola konfigurasi sistem repository</p>
      </div>

      <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-full bg-orange-50 p-2.5">
            <Upload className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Upload Settings</h2>
            <p className="text-xs text-gray-400">Atur batas ukuran file yang dapat diunggah pengguna</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Maximum Upload Size (MB)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={maxUploadSizeMB}
              onChange={(e) => setMaxUploadSizeMB(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <p className="mt-1 text-xs text-gray-400">Minimum 1 MB, Maksimum 500 MB</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
            {saving ? 'Menyimpan...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SystemSettingsPage() {
  return (
    <ProtectedRoute requireSuperAdmin>
      <SystemSettingsContent />
    </ProtectedRoute>
  );
}
