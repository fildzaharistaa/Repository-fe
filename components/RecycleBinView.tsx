'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, AlertCircle, Folder, FileText, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { ConfirmModal } from './ConfirmModal';
import { FileIcon } from './FileIcon';
import { formatDate, formatFileSize } from '@/lib/utils/formatters';
import { useAuthContext } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface TrashedFolder {
  id: string;
  name: string;
  type: 'folder';
  deleted_at: string;
  parent_id: string | null;
}

interface TrashedFile {
  id: string;
  name: string;
  type: 'file';
  mime_type: string;
  size: number;
  deleted_at: string;
  folder_id: string;
}

type TrashedItem = (TrashedFolder | TrashedFile) & { itemType: 'folder' | 'file' };

export function RecycleBinView() {
  const { isAdmin } = useAuthContext();
  const [folders, setFolders] = useState<TrashedFolder[]>([]);
  const [files, setFiles] = useState<TrashedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; type: 'file' | 'folder'; name: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchTrashed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getRecycleBin();
      setFolders(data.folders);
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrashed();
  }, [fetchTrashed]);

  const handleRestore = async (id: string, type: 'file' | 'folder', name: string) => {
    try {
      setActionLoading(id);
      if (type === 'file') {
        await apiClient.restoreFile(id);
      } else {
        await apiClient.restoreFolder(id);
      }
      toast.success(`"${name}" berhasil dikembalikan dari recycle bin.`);
      await fetchTrashed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal me-restore item');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDeleteClick = (id: string, type: 'file' | 'folder', name: string) => {
    setConfirmTarget({ id, type, name });
    setShowConfirm(true);
  };

  const confirmPermanentDelete = async () => {
    if (!confirmTarget) return;

    try {
      setConfirmLoading(true);
      if (confirmTarget.type === 'file') {
        await apiClient.permanentDeleteFile(confirmTarget.id);
      } else {
        await apiClient.permanentDeleteFolder(confirmTarget.id);
      }
      toast.success(`"${confirmTarget.name}" berhasil dihapus secara permanen.`);
      setShowConfirm(false);
      setConfirmTarget(null);
      await fetchTrashed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus permanen');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading recycle bin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-600" />
          <p className="font-semibold text-red-800">Error loading recycle bin</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const allItems: TrashedItem[] = [
    ...folders.map(f => ({ ...f, itemType: 'folder' as const })),
    ...files.map(f => ({ ...f, itemType: 'file' as const })),
  ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

  const isEmpty = allItems.length === 0;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-red-100 p-2">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recycle Bin</h2>
            <p className="text-sm text-gray-500">
              {isEmpty
                ? 'Recycle bin kosong'
                : `${allItems.length} item di recycle bin`}
            </p>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Trash2 className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="text-xl font-semibold text-gray-500">Recycle Bin Kosong</p>
            <p className="mt-2 text-sm text-gray-400">
              Item yang dihapus akan muncul di sini
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nama
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tipe
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ukuran
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tanggal Dihapus
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {allItems.map((item) => (
                <tr key={`${item.itemType}-${item.id}`} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.itemType === 'folder' ? (
                        <Folder className="h-5 w-5 text-orange-500" />
                      ) : (
                        <FileIcon mimeType={(item as TrashedFile).mime_type} />
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      item.itemType === 'folder'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.itemType === 'folder' ? 'Folder' : 'File'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {item.itemType === 'file' ? formatFileSize((item as TrashedFile).size) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(item.deleted_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRestore(item.id, item.itemType, item.name)}
                        disabled={actionLoading === item.id}
                        className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-all hover:shadow-sm disabled:opacity-50"
                        title="Restore"
                      >
                        {actionLoading === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Restore
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handlePermanentDeleteClick(item.id, item.itemType, item.name)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-all hover:shadow-sm disabled:opacity-50"
                          title="Hapus Permanen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus Permanen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={showConfirm}
        title="Hapus Permanen"
        description={`Apakah Anda yakin ingin menghapus "${confirmTarget?.name}" secara permanen? ${confirmTarget?.type === 'folder' ? 'Semua subfolder dan file di dalamnya juga akan dihapus permanen. ' : ''}Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Permanen"
        loading={confirmLoading}
        onCancel={() => {
          setShowConfirm(false);
          setConfirmTarget(null);
        }}
        onConfirm={confirmPermanentDelete}
      />

    </div>
  );
}
