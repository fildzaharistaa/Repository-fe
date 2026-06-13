'use client';

import { useState, useRef, useEffect } from 'react';
import { FileText, Download, Eye, Trash2, X, Folder, Share2, Mail, User, Clock, Loader2, ChevronDown, Link2 } from 'lucide-react';
import { useFolders } from '@/hooks/useFolders';
import { useAllFiles } from '@/hooks/useAllFiles';
import { useSharedFiles } from '@/hooks/useSharedFiles';
import { useFiles } from '@/hooks/useFiles';
import { useAuthContext } from '@/context/AuthContext';
import { formatFileSize, formatDate, getFileTypeInfo } from '@/lib/utils/formatters';
import { FileIcon } from './FileIcon';
import { FilePreview } from './FilePreview';
import { handleApiError } from '@/lib/utils/errorHandler';
import type { File as FileEntity } from '@/types';
import { ConfirmModal } from './ConfirmModal';
import { ShareLinkModal } from './ShareLinkModal';
import type { ShareItemType } from '@/types';
import toast from 'react-hot-toast';

type FilterTab = 'my-files' | 'shared-files';

export function AllFilesView() {
  const { user, roleVersion, hasPermission } = useAuthContext();
  const { folders } = useFolders(false);
  const { allFiles, fileFolderMap, loading: myLoading, error: myError } = useAllFiles(folders);

  const myOwnFiles = allFiles.filter(f => !f.owner_id || f.owner_id === user?.id);
  const { files: sharedFiles, loading: sharedLoading, error: sharedError, downloadFile: downloadShared } = useSharedFiles(roleVersion);
  
  const [activeTab, setActiveTab] = useState<FilterTab>('my-files');
  const [selectedFile, setSelectedFile] = useState<FileEntity | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  
  // For deletion
  const [fileToDelete, setFileToDelete] = useState<FileEntity | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Share Link modal
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [shareLinkTarget, setShareLinkTarget] = useState<{ id: string; name: string; type: ShareItemType } | null>(null);
  const { deleteFile: deleteMyFile } = useFiles(selectedFolderId);

  // Filter state for shared files
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node))
        setRoleDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const uniqueRoles = Array.from(new Set(sharedFiles.map((f: any) => f.owner_role).filter(Boolean)));
  const filteredSharedFiles = sharedFiles.filter((f: any) => 
    roleFilter === 'all' || f.owner_role === roleFilter
  );

  const isLoading = activeTab === 'my-files' ? myLoading : sharedLoading;
  const currentError = activeTab === 'my-files' ? myError : sharedError;

  const handleDownload = async (file: FileEntity, isShared: boolean) => {
    try {
      if (isShared) {
        await downloadShared(file.id, file.name);
      } else {
        const folderId = fileFolderMap.get(file.id);
        if (folderId) {
          const { apiClient } = await import('@/lib/api/client');
          const blob = await apiClient.downloadFile(file.id);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleDelete = (file: FileEntity) => {
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      setDeleteLoading(true);
      const folderId = fileFolderMap.get(fileToDelete.id);
      if (folderId) {
        setSelectedFolderId(folderId);
        await deleteMyFile(fileToDelete.id);
        toast.success(`File "${fileToDelete.name}" berhasil dihapus.`);
      }
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus file');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleQuickView = (file: FileEntity) => {
    setSelectedFile(file);
    setShowQuickView(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-orange-600" />
          <p className="text-gray-600">Loading files...</p>
        </div>
      </div>
    );
  }

  if (currentError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">Error loading files</p>
          <p className="mt-1 text-sm text-red-600">{currentError}</p>
        </div>
      </div>
    );
  }

  const displayFiles = activeTab === 'my-files' ? myOwnFiles : filteredSharedFiles;
  const isEmpty = displayFiles.length === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Files</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola dan akses file Anda</p>
        </div>

        {activeTab === 'shared-files' && uniqueRoles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">Filter Role</span>
            <div className="relative" ref={roleDropdownRef}>
              <button
                onClick={() => setRoleDropdownOpen((o) => !o)}
                className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm transition-all ${
                  roleFilter === 'all'
                    ? 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                    : 'border-orange-400 bg-orange-500 text-white'
                }`}
              >
                <span>{roleFilter === 'all' ? 'Semua Role' : roleFilter}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                  <div className="p-1.5 space-y-0.5">
                    {[{ value: 'all', label: 'Semua Role' }, ...uniqueRoles.map((r: any) => ({ value: r, label: r }))].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => { setRoleFilter(value); setRoleDropdownOpen(false); }}
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                          roleFilter === value
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab('my-files')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'my-files'
              ? 'bg-white text-orange-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Folder className="h-4 w-4" />
          My Files
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            activeTab === 'my-files'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-gray-200 text-gray-500'
          }`}>
            {myOwnFiles.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('shared-files')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'shared-files'
              ? 'bg-white text-orange-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Share2 className="h-4 w-4" />
          Shared Files
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            activeTab === 'shared-files'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-gray-200 text-gray-500'
          }`}>
            {sharedFiles.length}
          </span>
        </button>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            {activeTab === 'my-files' ? (
              <>
                <FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-xl font-semibold text-gray-700">Belum ada file</p>
                <p className="mt-2 text-sm text-gray-500">File yang Anda upload akan muncul di sini</p>
              </>
            ) : (
              <>
                <Share2 className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-xl font-semibold text-gray-700">Belum ada shared file</p>
                <p className="mt-2 text-sm text-gray-500">
                  {roleFilter === 'all' 
                    ? 'File yang dibagikan oleh user lain akan muncul di sini'
                    : `Tidak ada file yang dibagikan dari role "${roleFilter}"`}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* File List */}
      {!isEmpty && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                {activeTab === 'shared-files' && (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Owner</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                  </>
                )}
                {activeTab === 'my-files' && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Size</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {activeTab === 'shared-files' ? 'Shared On' : 'Date'}
                </th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayFiles.map((file) => {
                const fileInfo = getFileTypeInfo(file.mime_type);
                const isShared = activeTab === 'shared-files';
                return (
                  <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <span className="mr-3"><FileIcon mimeType={file.mime_type} /></span>
                        <div>
                          <button
                            onClick={() => handleQuickView(file)}
                            className="text-sm font-medium text-gray-900 hover:text-orange-600 transition-colors text-left"
                            title={file.name}
                          >
                            <span className="block truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px] lg:max-w-sm">{file.name}</span>
                          </button>
                          <p className="text-xs text-gray-500">{fileInfo.label}</p>
                        </div>
                      </div>
                    </td>

                    {isShared && (
                      <>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 font-medium">
                          {file.owner_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {file.owner_email || '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {file.owner_role && (
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              {file.owner_role}
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {!isShared && (
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${fileInfo.badgeClass}`}>
                          {fileInfo.label}
                        </span>
                      </td>
                    )}

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleQuickView(file)}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-all hover:shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        {hasPermission('file.download') && (
                          <button
                            onClick={() => handleDownload(file, isShared)}
                            className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-all hover:shadow-sm"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                        )}
                        {!isShared && (
                          <button
                            onClick={() => { setShareLinkTarget({ id: file.id, name: file.name, type: 'file' }); setShowShareLinkModal(true); }}
                            className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-all hover:shadow-sm"
                          >
                            <Link2 className="h-3.5 w-3.5" /> Link
                          </button>
                        )}
                        {!isShared && (
                          <button
                            onClick={() => handleDelete(file)}
                            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-all hover:shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick View Modal */}
      {showQuickView && selectedFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
          onClick={() => setShowQuickView(false)}
        >
          <div 
            className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 rounded-t-xl">
              <div className="flex items-center gap-3">
                <FileIcon mimeType={selectedFile.mime_type} className="h-8 w-8" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">{selectedFile.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} 
                    {activeTab === 'shared-files' ? ` • Shared by ${selectedFile.owner_name}` : ` • ${formatDate(selectedFile.created_at)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasPermission('file.download') && (
                  <button
                    onClick={() => handleDownload(selectedFile, activeTab === 'shared-files')}
                    className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-all"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                )}
                <button
                  onClick={() => setShowQuickView(false)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" /> Close
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] min-h-[50vh] overflow-y-auto bg-gray-50 p-6 rounded-b-xl flex justify-center">
              <FilePreview file={selectedFile} />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Hapus File"
        description={`Apakah Anda yakin ingin menghapus "${fileToDelete?.name}"?`}
        loading={deleteLoading}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setFileToDelete(null);
        }}
        onConfirm={confirmDelete}
      />

      {shareLinkTarget && (
        <ShareLinkModal
          open={showShareLinkModal}
          onClose={() => { setShowShareLinkModal(false); setShareLinkTarget(null); }}
          itemType={shareLinkTarget.type}
          itemId={shareLinkTarget.id}
          itemName={shareLinkTarget.name}
        />
      )}
    </div>
  );
}
