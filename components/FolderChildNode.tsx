'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Folder, FolderOpen, Files, FolderTree, ExternalLink, Edit2, Trash2, Loader2, X } from 'lucide-react';
import { useFolderChildren, invalidateFolderChildrenCache } from '@/hooks/useFolderChildren';
import { useFolderContext } from '@/context/FolderContext';
import { useAuthContext } from '@/context/AuthContext';
import { apiClient } from '@/lib/api/client';
import type { FolderOverviewItem } from '@/types';
import toast from 'react-hot-toast';

const MAX_DEPTH = 8;

interface FolderChildNodeProps {
  item: FolderOverviewItem;
  depth?: number;
  parentId?: string | null;
  onMutated?: () => void;
}

export function FolderChildNode({ item, depth = 0, parentId, onMutated }: FolderChildNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { setSelectedFolderId, setVirtualRootFolderId } = useFolderContext();
  const { user, isAdmin } = useAuthContext();

  // Rename state
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [childrenRefreshKey, setChildrenRefreshKey] = useState(0);
  const refreshChildren = useCallback(() => setChildrenRefreshKey((k) => k + 1), []);

  const canExpand = item.subfolder_count > 0 && depth < MAX_DEPTH;
  const { children, loading } = useFolderChildren(isExpanded ? item.id : null, childrenRefreshKey);

  const canModify = isAdmin || item.owner_id === user?.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canExpand) setIsExpanded((v) => !v);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVirtualRootFolderId(null);
    setSelectedFolderId(item.id);
  };

  const openRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(item.name);
    setShowRename(true);
  };

  const confirmRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === item.name) { setShowRename(false); return; }
    setRenameLoading(true);
    try {
      await apiClient.updateFolder(item.id, { name: trimmed });
      toast.success(`Folder berhasil diganti nama menjadi "${trimmed}"`);
      setShowRename(false);
      if (parentId) invalidateFolderChildrenCache(parentId);
      onMutated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengganti nama folder');
    } finally {
      setRenameLoading(false);
    }
  };

  const openDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.deleteFolder(item.id);
      toast.success('Folder dipindahkan ke Recycle Bin');
      setShowDeleteConfirm(false);
      if (parentId) invalidateFolderChildrenCache(parentId);
      onMutated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus folder');
    } finally {
      setDeleteLoading(false);
    }
  };

  const indentPx = Math.min(depth * 20, 120);

  return (
    <div>
      {/* Row */}
      <div
        className={`group flex items-center gap-2 rounded-lg py-2 pr-2 transition-colors cursor-pointer
          ${canExpand ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}
        style={{ paddingLeft: `${12 + indentPx}px` }}
        onClick={handleToggle}
      >
        {/* Expand chevron / spacer */}
        <span className="w-4 shrink-0 flex items-center justify-center">
          {canExpand ? (
            <ChevronRight
              className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-150
                ${isExpanded ? 'rotate-90 text-orange-500' : ''}`}
            />
          ) : null}
        </span>

        {/* Folder icon */}
        {isExpanded && item.subfolder_count > 0 ? (
          <FolderOpen className="h-4 w-4 text-orange-500 shrink-0" />
        ) : (
          <Folder className={`h-4 w-4 shrink-0 ${item.subfolder_count > 0 ? 'text-orange-400' : 'text-gray-400'}`} />
        )}

        {/* Folder name */}
        <span className="flex-1 truncate text-sm text-gray-800 font-medium" title={item.name}>
          {item.name}
        </span>

        {/* Stat badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {item.subfolder_count > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              <FolderTree className="h-2.5 w-2.5" />
              {item.subfolder_count}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
            <Files className="h-2.5 w-2.5" />
            {item.file_count}
          </span>
        </div>

        {/* Action buttons — appear on hover */}
        <div className="ml-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {canModify && (
            <>
              <button
                onClick={openRename}
                title="Rename folder"
                className="rounded p-0.5 text-amber-500 hover:bg-amber-100 transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={openDelete}
                title="Hapus folder"
                className="rounded p-0.5 text-red-500 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={handleOpen}
            title="Buka folder"
            className="rounded p-0.5 text-gray-400 hover:text-orange-600 hover:bg-orange-100 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && (
        <div>
          {loading && <ChildrenSkeleton depth={depth + 1} />}
          {!loading && children.length === 0 && (
            <div
              className="py-2 text-xs text-gray-400 italic"
              style={{ paddingLeft: `${12 + (depth + 1) * 20 + 4}px` }}
            >
              Tidak ada subfolder
            </div>
          )}
          {!loading && children.map((child) => (
            <FolderChildNode
              key={child.id}
              item={child}
              depth={depth + 1}
              parentId={item.id}
              onMutated={refreshChildren}
            />
          ))}
        </div>
      )}

      {/* Rename modal (portal) */}
      {showRename && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={() => !renameLoading && setShowRename(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Ganti Nama Folder</h3>
              <button onClick={() => setShowRename(false)} disabled={renameLoading} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') setShowRename(false);
              }}
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRename(false)}
                disabled={renameLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmRename}
                disabled={renameLoading || !renameValue.trim()}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {renameLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Delete confirm modal (portal) */}
      {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Hapus Folder</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Apakah Anda yakin ingin menghapus <span className="font-semibold">"{item.name}"</span>? Folder beserta isinya akan dipindahkan ke Recycle Bin.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function ChildrenSkeleton({ depth }: { depth: number }) {
  const indentPx = Math.min(depth * 20, 120);
  return (
    <div className="space-y-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-2 animate-pulse"
          style={{ paddingLeft: `${12 + indentPx}px`, paddingRight: '8px' }}
        >
          <div className="w-4 h-3 rounded bg-gray-100 shrink-0" />
          <div className="h-4 w-4 rounded bg-gray-100 shrink-0" />
          <div className="h-3.5 rounded bg-gray-100" style={{ width: `${55 + (i % 3) * 15}%` }} />
          <div className="ml-auto flex gap-1">
            <div className="h-4 w-8 rounded-full bg-blue-50" />
            <div className="h-4 w-6 rounded-full bg-green-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
