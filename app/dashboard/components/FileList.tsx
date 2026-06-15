'use client';

import { useState, useEffect, useRef, DragEvent, useMemo, Fragment } from 'react';
import { useFolderContext } from '@/context/FolderContext';
import { Eye, Download, Trash2, Folder, AlertCircle, FileText, X, Upload, Loader2, Edit2, Share2, Users, Search, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { useFiles } from '@/hooks/useFiles';
import { useAuth } from '@/hooks/useAuth';
import { useAuthContext } from '@/context/AuthContext';
import { formatFileSize, formatDate, getFileTypeInfo } from '@/lib/utils/formatters';
import { handleApiError } from '@/lib/utils/errorHandler';
import { FilePreview } from '../../../components/FilePreview';
import { FileIcon } from '../../../components/FileIcon';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { apiClient } from '@/lib/api/client';
import type { File as FileEntity } from '@/types';
import toast from 'react-hot-toast';

interface FileListProps {
  folderId: string | null;
}

export function FileList({ folderId }: FileListProps) {
  const { files, loading, error, deleteFile, downloadFile, uploadFile, renameFile } = useFiles(folderId);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntity | null>(null);

  const { setSelectedFolderId, virtualRootFolderId, setVirtualRootFolderId, setActiveMenu } = useFolderContext();

  const handleBack = () => {
    if (folderId === virtualRootFolderId) {
      setVirtualRootFolderId(null);
      setSelectedFolderId(null);
      setActiveMenu('shared-folders');
    } else {
      setSelectedFolderId(parentFolderId);
    }
  };
  const [subfolders, setSubfolders] = useState<any[]>([]);
  const [uploaderSearch, setUploaderSearch] = useState('');
  const { user } = useAuth();
  const { isAdmin, hasPermission } = useAuthContext();
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(true);
  const [folderPermissions, setFolderPermissions] = useState<any[]>([]);

  const canUpload = hasPermission('file.upload');
  const canDelete = hasPermission('file.delete');
  const canDownload = hasPermission('file.download');
  const legacyDosenTendik = user?.role?.name?.toLowerCase().includes('dosen') || user?.role?.name?.toLowerCase().includes('tendik');

  const fetchFolderInfo = () => {
    if (folderId) {
      apiClient.getFolder(folderId)
        .then(folder => {
          setFolderName(folder.name);
          setParentFolderId(folder.parent_id);
          const ownerId = folder.owner?.id || (folder as any).owner_id;
          const ownerOrAdmin = user?.id === ownerId || isAdmin;
          setIsOwnerOrAdmin(ownerOrAdmin);

          // Sort subfolders by name
          const sortedSubfolders = (folder.children || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
          setSubfolders(sortedSubfolders);

          // Store folder permissions for syncing with file share modal
          setFolderPermissions(folder.permissions || []);
        })
        .catch(err => {
          console.error('Failed to fetch folder info', err);
          setSubfolders([]);
          setIsOwnerOrAdmin(false);
          setFolderPermissions([]);
        });
    } else {
      setFolderName(null);
      setSubfolders([]);
      setIsOwnerOrAdmin(true);
    }
  };

  useEffect(() => {
    fetchFolderInfo();
    setUploaderSearch(''); // reset search when folder changes
  }, [folderId, user]);

  const [maxUploadSize, setMaxUploadSize] = useState(5 * 1024 * 1024);

  useEffect(() => {
    apiClient.getSettings()
      .then((s) => { if (s.max_upload_size) setMaxUploadSize(parseInt(s.max_upload_size, 10)); })
      .catch(() => {});
  }, []);

  const [showQuickView, setShowQuickView] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileEntity | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileEntity | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [fileToShare, setFileToShare] = useState<FileEntity | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // States for Request Access Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  // States for Share Modal
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, { read: boolean, download: boolean }>>({});

  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    if (showShareModal && fileToShare) {
      // Fetch users
      apiClient.getUsers()
        .then(res => {
          const fetchedUsers = (res as any).data || res;
          if (Array.isArray(fetchedUsers)) {
            setUsers(fetchedUsers);
          } else if (fetchedUsers && (fetchedUsers as any).data && Array.isArray((fetchedUsers as any).data)) {
            setUsers((fetchedUsers as any).data);
          }
        })
        .catch(err => console.error('Failed to fetch users', err));

      // Fetch existing shares for this file
      apiClient.getFileShares(fileToShare.id)
        .then(shares => {
          const perms: Record<string, { read: boolean, download: boolean }> = {};

          // First, pre-fill from folder-level user permissions (can_download)
          folderPermissions.forEach((fp: any) => {
            if (fp.user_id && fp.can_download) {
              perms[fp.user_id] = {
                read: true,
                download: true
              };
            }
          });

          // Then, overlay with file-level shares (AccessRequest)
          if (Array.isArray(shares)) {
            let msg = '';

            shares.forEach(s => {
              if (s.requester && s.requester.id) {
                // File-level share overrides folder-level if present
                const existing = perms[s.requester.id];
                perms[s.requester.id] = {
                  read: !!s.can_read || (existing?.read ?? false),
                  download: !!s.can_download || (existing?.download ?? false)
                };
                if (s.response_message && !msg) {
                  msg = s.response_message;
                }
              }
            });

            if (msg) setShareMessage(msg);
          }

          setUserPermissions(perms);
        })
        .catch(err => console.error('Failed to fetch file shares', err));
    }
  }, [showShareModal, fileToShare]);

  const filteredFiles = useMemo(() => {
    if (!uploaderSearch.trim()) return files;
    const q = uploaderSearch.toLowerCase();
    return files.filter((f: any) =>
      (f.uploaded_by || f.owner_name || '').toLowerCase().includes(q) ||
      (f.uploaded_by_role || f.owner_role || '').toLowerCase().includes(q)
    );
  }, [files, uploaderSearch]);

  const groupedFiles = useMemo(() => {
    if (!isOwnerOrAdmin || legacyDosenTendik) return null;

    const groups: Record<string, { user: any, items: FileEntity[] }> = {};
    files.forEach(file => {
      const ownerData = (file as any).owner;
      const ownerName = ownerData?.name || '';
      const ownerEmail = ownerData?.email || '';

      let displayUser = "User Tidak Diketahui";
      if (ownerName && ownerEmail) {
        displayUser = `${ownerName} (${ownerEmail})`;
      } else if (ownerName) {
        displayUser = ownerName;
      } else if (ownerEmail) {
        displayUser = ownerEmail;
      }

      const keyStr = displayUser;

      if (!groups[keyStr]) groups[keyStr] = { user: ownerData, items: [] };
      groups[keyStr].items.push(file);
    });
    return groups;
  }, [files, isOwnerOrAdmin, legacyDosenTendik]);

  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const formatRoleName = (raw: string) => {
    if (!raw) return 'User';
    const norm = raw.toLowerCase().trim();
    if (norm === 'wd1' || norm === 'wd 1') return 'Wakil Dekan 1';
    if (norm === 'wd2' || norm === 'wd 2') return 'Wakil Dekan 2';
    if (norm === 'wd3' || norm === 'wd 3') return 'Wakil Dekan 3';
    if (norm === 'dosen') return 'Dosen';
    if (norm === 'tendik') return 'Tendik';
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
      const newValue = !current[perm];

      if (perm === 'read' && !newValue) {
        // Uncheck View → otomatis uncheck Download
        return { ...prev, [userId]: { read: false, download: false } };
      }
      if (perm === 'download' && newValue) {
        // Check Download → otomatis check View
        return { ...prev, [userId]: { read: true, download: true } };
      }

      return { ...prev, [userId]: { ...current, [perm]: newValue } };
    });
  };

  const resetShareModal = () => {
    setShowShareModal(false);
    setFileToShare(null);
    setUserSearchTerm('');
    setSelectedRoleFilter(null);
    setUserPermissions({});
    setShareMessage('');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async (file: FileEntity) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleDelete = (file: FileEntity) => {
    setFileToRename(null);
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  };

  const handleRenameClick = (file: FileEntity) => {
    setFileToRename(file);
    // Extract base name without extension
    const lastDotIndex = file.name.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
    setNewFileName(baseName);
    setShowRenameModal(true);
  };

  const confirmRename = async () => {
    if (!fileToRename || !newFileName.trim()) return;

    // Add extension back
    const lastDotIndex = fileToRename.name.lastIndexOf('.');
    const ext = lastDotIndex !== -1 ? fileToRename.name.substring(lastDotIndex) : '';
    const finalName = `${newFileName}${ext}`;

    try {
      setRenameLoading(true);
      await renameFile(fileToRename.id, finalName);
      toast.success(`File berhasil diganti nama menjadi "${finalName}"`);
      setShowRenameModal(false);
      setFileToRename(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah nama file');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleShareClick = (file: FileEntity) => {
    setFileToShare(file);
    setShowShareModal(true);
  };

  const handleShareSubmit = async () => {
    if (!fileToShare) return;
    try {
      setShareLoading(true);

      const uPerms = Object.entries(userPermissions)
        .map(([userId, perms]) => ({
          user_id: userId,
          can_read: perms.read,
          can_create: false,
          can_update: false,
          can_delete: false,
          can_download: perms.download
        }))
        .filter(p => p.can_read || p.can_download);

      if (uPerms.length === 0) {
        toast.error('Pilih minimal satu user untuk dibagikan file ini.');
        setShareLoading(false);
        return;
      }

      await apiClient.shareFile(fileToShare.id, {
        user_permissions: uPerms,
        message: shareMessage.trim() || undefined
      });

      toast.success(`File "${fileToShare.name}" berhasil dibagikan ke pengguna dan grup yang Anda pilih.`);
      setShowShareModal(false);
      setFileToShare(null);
    } catch (err) {
      toast.error('Gagal membagikan file');
    } finally {
      setShareLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteFile(fileToDelete.id);
      toast.success(`File "${fileToDelete.name}" telah dipindahkan ke Recycle Bin.`);
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleQuickView = (file: FileEntity) => {
    setSelectedFile(file);
    setShowQuickView(true);
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !folderId) return;

    try {
      let errorFiles: string[] = [];
      let successCount = 0;

      const maxMB = Math.round(maxUploadSize / (1024 * 1024));
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxUploadSize) {
          errorFiles.push(files[i].name);
          continue;
        }
        await uploadFile(files[i]);
        successCount++;
      }

      if (errorFiles.length > 0) {
        const errorMsg = errorFiles.length === 1
          ? `File "${errorFiles[0]}" gagal diunggah karena melebihi batas maksimum ${maxMB}MB.`
          : `${errorFiles.length} file gagal diunggah karena melebihi batas maksimum ${maxMB}MB.`;

        toast.error(errorMsg);

        if (successCount > 0) {
          toast.success(`${successCount} file lainnya berhasil diunggah.`);
        }
      } else {
        toast.success('Semua file telah berhasil diunggah.');
      }

      setShowUploadModal(false);

    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRequestAccess = async () => {
    if (!folderId) return;
    try {
      setRequestLoading(true);
      await apiClient.requestAccess({ folderId, message: requestMessage });
      toast.success('Permintaan akses telah dikirim ke pemilik folder.');
      setShowRequestModal(false);
      setRequestMessage('');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setRequestLoading(false);
    }
  };


  const renderStateContent = () => {
    if (!folderId) {
      return (
        <div className="flex h-full items-center justify-center bg-white">
          <div className="text-center">
            <Folder className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="text-xl font-semibold text-gray-700">Select a folder to view files</p>
            <p className="mt-2 text-sm text-gray-500">Choose a folder from the sidebar to get started</p>
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex h-full items-center justify-center bg-white">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-600">Loading files...</p>
          </div>
        </div>
      );
    }

    if (error) {
      const isPermissionError = error.toLowerCase().includes('permission') || error.toLowerCase().includes('izin');

      return (
        <div className="flex h-full items-center justify-center bg-white p-6">
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-red-50 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-red-800">Akses Ditolak</h3>
            <p className="mt-2 text-sm text-red-600 mb-6 leading-relaxed">{error}</p>

            {isPermissionError && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="w-full rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-red-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Minta Akses ke Folder Ini
                </button>
                <button
                  onClick={handleBack}
                  className="w-full rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
                >
                  Kembali
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderFileRow = (file: FileEntity, isGrouped: boolean = false) => {
    const fileInfo = getFileTypeInfo(file.mime_type);
    return (
      <tr key={file.id} className="hover:bg-gray-50 transition-colors">
        <td className="whitespace-nowrap px-6 py-4">
          <div className={`flex items-center ${isGrouped ? 'ml-4 border-l-2 border-orange-200 pl-4' : ''}`}>
            <span className="mr-3"><FileIcon mimeType={file.mime_type} /></span>
            <div>
              <button
                onClick={() => handleQuickView(file)}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                title={file.name}
              >
                <span className="block truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px] lg:max-w-sm">{file.name}</span>
              </button>
              <p className="text-xs text-gray-500">{fileInfo.label}</p>
              {(!isOwnerOrAdmin || legacyDosenTendik) && (file.uploaded_by || file.owner_name) && (
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[9px] font-bold text-orange-600">
                    {(file.uploaded_by || file.owner_name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {file.uploaded_by || file.owner_name}
                  </span>
                  {(file.uploaded_by_role || file.owner_role) && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                      {formatRoleName(file.uploaded_by_role || file.owner_role || '')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${fileInfo.badgeClass}`}>
            {fileInfo.label}
          </span>
        </td>
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
              title="Quick View"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </button>
            {isOwnerOrAdmin && (
              <button
                onClick={() => handleShareClick(file)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-all hover:shadow-sm"
                title="Share File"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            )}
            {isOwnerOrAdmin && (
              <button
                onClick={() => handleRenameClick(file)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-all hover:shadow-sm"
                title="Rename File"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Rename
              </button>
            )}
            {canDownload && (
              <button
                onClick={() => handleDownload(file)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-all hover:shadow-sm"
                title="Download File"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(file)}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-all hover:shadow-sm"
                title="Delete File"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="h-full overflow-y-auto bg-white">
        {renderStateContent() || (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {folderId && (
                  <button
                    onClick={handleBack}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    title="Kembali ke folder sebelumnya"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{folderName ? `${folderName}` : 'Files'}</h2>
                  <p className="text-sm text-gray-500">{files.length} file{files.length !== 1 ? 's' : ''} in this folder</p>
                </div>
              </div>
              {folderId && canUpload && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
                >
                  <Upload className="h-4 w-4" />
                  Upload Files
                </button>
              )}
            </div>

            {/* Uploader search — only shown when there are files with uploader info */}
            {files.some((f: any) => f.uploaded_by || f.owner_name) && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama pengupload..."
                  value={uploaderSearch}
                  onChange={(e) => setUploaderSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                />
                {uploaderSearch && (
                  <button onClick={() => setUploaderSearch('')} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Size
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Uploaded
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredFiles.length === 0 && subfolders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                        {uploaderSearch ? (
                          <>
                            <p className="text-sm font-medium text-gray-900">Tidak ada hasil untuk "{uploaderSearch}"</p>
                            <p className="mt-1 text-sm text-gray-500">Coba nama pengupload yang berbeda</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-900">Folder is empty</p>
                            <p className="mt-1 text-sm text-gray-500">Upload files to get started</p>
                          </>
                        )}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {subfolders.map((subfolder) => (
                        <tr
                          key={`folder-${subfolder.id}`}
                          className="hover:bg-orange-50 transition-colors cursor-pointer group"
                          onClick={() => setSelectedFolderId(subfolder.id)}
                        >
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center">
                              <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition-colors">
                                <Folder className="h-4 w-4" fill="currentColor" fillOpacity={0.2} />
                              </span>
                              <div>
                                <span className="text-sm font-semibold text-gray-900 block truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px] lg:max-w-sm">
                                  {subfolder.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800">
                              Folder
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            -
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {formatDate(subfolder.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <div className="flex items-center justify-end">
                              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {groupedFiles ? (
                        !activeGroup ? (
                          Object.entries(groupedFiles).map(([groupName, groupData]) => {
                            const owner = groupData.user;
                            const name = owner?.name || "User Tidak Diketahui";
                            const email = owner?.email || "";
                            const firstFile = groupData.items[0] as any;
                            const roleRaw = firstFile?.uploaded_by_role
                              || (typeof owner?.role === 'object' ? owner?.role?.name : owner?.role);
                            const roleLabel = formatRoleName(roleRaw);

                            // Generate initials for avatar
                            const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                            return (
                              <tr
                                key={`group-${groupName}`}
                                className="bg-white border-b hover:bg-orange-50/50 cursor-pointer transition-all duration-200 group"
                                onClick={() => setActiveGroup(groupName)}
                              >
                                <td colSpan={5} className="px-6 py-5">
                                  <div className="flex items-center gap-5">
                                    {/* User Avatar */}
                                    <div className="relative">
                                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-orange-400 to-orange-600 text-white font-bold text-lg shadow-sm group-hover:shadow-md transition-all">
                                        {initials || <Users size={20} />}
                                      </div>
                                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500"></div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900 text-lg truncate leading-tight">
                                          {name}
                                        </h4>
                                        {roleLabel && (
                                          <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                            {roleLabel}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <p className="text-sm text-gray-500 font-medium truncate flex items-center gap-1.5">
                                          <span className="text-gray-400">@</span> {email || "No email"}
                                        </p>
                                        <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                                        <p className="text-sm text-orange-600 font-semibold flex items-center gap-1.5">
                                          <FileText size={14} className="opacity-70" />
                                          {groupData.items.length} file(s)
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-center h-10 w-10 rounded-full group-hover:bg-orange-100 transition-colors">
                                      <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-orange-600 transition-transform group-hover:translate-x-1 duration-200" />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <>
                            <tr className="bg-gray-50 border-b">
                              <td colSpan={5} className="px-6 py-3">
                                <button onClick={() => setActiveGroup(null)} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                  <ArrowLeft className="w-4 h-4" />
                                  Back to list
                                </button>
                              </td>
                            </tr>
                            <tr className="bg-orange-50/50 border-b">
                              <td colSpan={5} className="px-6 py-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <Users className="w-4 h-4 text-orange-600" />
                                  Files by: <span className="text-gray-900">{activeGroup}</span>
                                </div>
                              </td>
                            </tr>
                            {groupedFiles[activeGroup]?.items.map((file) => renderFileRow(file, false))}
                          </>
                        )
                      ) : (
                        filteredFiles.map((file) => renderFileRow(file, false))
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {showQuickView && selectedFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 p-4 backdrop-blur-md"
          onClick={() => setShowQuickView(false)}
        >
          <div
            className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-gray-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <FileIcon mimeType={selectedFile.mime_type} className="h-8 w-8" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">{selectedFile.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} • {formatDate(selectedFile.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canDownload && (
                  <button
                    onClick={() => handleDownload(selectedFile)}
                    className="flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                )}
                <button
                  onClick={() => setShowQuickView(false)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-y-auto bg-gray-50 p-6">
              <FilePreview file={selectedFile} />
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && folderId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 p-4 backdrop-blur-md"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-gray-50 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Files</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${isDragging
                  ? 'border-blue-500 bg-blue-100 shadow-lg scale-105'
                  : 'border-blue-300 bg-linear-to-br from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-md'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <Upload className="mx-auto mb-4 h-12 w-12 text-blue-600" />
                <p className="mb-2 text-base font-medium text-gray-700">
                  {isDragging ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="mb-4 text-sm text-gray-500">
                  or click the button below to browse
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Folder className="h-4 w-4" />
                      Choose Files
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && fileToRename && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 p-4 backdrop-blur-md"
          onClick={() => !renameLoading && setShowRenameModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Rename File</h3>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Nama File Baru</label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="block w-full flex-1 rounded-l-md border-gray-300 border px-3 py-2 text-black focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename();
                    if (e.key === 'Escape') setShowRenameModal(false);
                  }}
                />
                <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                  {fileToRename.name.substring(fileToRename.name.lastIndexOf('.'))}
                </span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRenameModal(false)}
                disabled={renameLoading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmRename}
                disabled={renameLoading || !newFileName.trim()}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                {renameLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Tersimpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && fileToShare && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-sm"
          onClick={() => !shareLoading && resetShareModal()}
        >
          <div
            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-indigo-50 px-6 py-4">
              <div className="flex items-center gap-3 text-indigo-700">
                <Share2 className="h-5 w-5" />
                <h3 className="text-lg font-bold text-gray-900">Bagikan File</h3>
              </div>
              <button
                onClick={resetShareModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row h-[500px]">
              {/* Left Sidebar - File Info & Message */}
              <div className="w-full md:w-1/3 border-r border-gray-100 bg-white p-6 overflow-y-auto">
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Informasi File</label>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-start gap-3">
                    <FileText className="h-6 w-6 text-gray-500 shrink-0 mt-0.5" />
                    <div className="overflow-hidden">
                      <p className="truncate font-medium text-gray-900 text-sm" title={fileToShare.name}>{fileToShare.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatFileSize(fileToShare.size)}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Cara Berbagi</label>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      Centang user di tabel sebelah kanan untuk memberi akses <strong>View</strong> dan/atau <strong>Download</strong> pada file ini.
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Pesan (Opsional)</label>
                  <p className="text-xs text-gray-500 mb-2">Tulis pesan untuk penerima file ini.</p>
                  <textarea
                    value={shareMessage}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) setShareMessage(e.target.value);
                    }}
                    placeholder="Contoh: Silakan review dokumen ini sebelum rapat besok..."
                    rows={4}
                    className={`w-full rounded-md border px-3 py-2 text-sm text-black focus:outline-hidden resize-none ${shareMessage.length >= 500
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {shareMessage.length >= 500 && (
                      <p className="text-xs text-red-500 font-medium">Pesan sudah mencapai batas maksimal!</p>
                    )}
                    <p className={`text-xs ml-auto font-medium ${shareMessage.length >= 500 ? 'text-red-500' : shareMessage.length >= 450 ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                      {shareMessage.length}/500
                    </p>
                  </div>
                </div>

                {/* Selected users count */}
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">User yang dipilih:</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {Object.values(userPermissions).filter(p => p.read).length} user
                  </p>
                </div>
              </div>

              {/* Right Content - User Permission Table */}
              <div className="w-full md:w-2/3 flex flex-col bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Pilih User untuk Dibagikan</h4>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari nama atau email..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      />
                    </div>
                    <div className="relative w-full sm:w-1/3">
                      <button
                        type="button"
                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        className="flex items-center justify-between w-full py-2 px-3 text-sm border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <span className="truncate font-medium text-gray-700">
                          {selectedRoleFilter || 'Semua Role'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>

                      {showRoleDropdown && (
                        <div className="absolute z-10 mt-1.5 w-full bg-white shadow-xl max-h-60 rounded-lg py-1 border border-gray-100 overflow-auto focus:outline-none">
                          <button
                            onClick={() => { setSelectedRoleFilter(null); setShowRoleDropdown(false); }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${!selectedRoleFilter ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className="text-sm font-semibold selection:bg-transparent">Semua Role</span>
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{users.length}</span>
                          </button>
                          {Object.keys(roleStats).map(role => (
                            <button
                              key={role}
                              onClick={() => { setSelectedRoleFilter(role); setShowRoleDropdown(false); }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${role === selectedRoleFilter ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                              <span className="text-sm font-semibold truncate pr-2 selection:bg-transparent">{role}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${role === selectedRoleFilter ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
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
                          <th className="px-4 py-3 font-semibold">User Details</th>
                          <th className="px-2 py-3 font-semibold text-center w-20">VIEW</th>
                          <th className="px-2 py-3 font-semibold text-center w-24">DOWNLOAD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500 italic">
                              Tidak ada user yang ditemukan
                            </td>
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
                                  <input type="checkbox" checked={perms.read} onChange={() => toggleUserPermission(u.id, 'read')} className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
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

                <div className="border-t border-gray-200 bg-white p-4 flex gap-3 justify-end items-center">
                  <button
                    onClick={resetShareModal}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleShareSubmit}
                    disabled={shareLoading || Object.values(userPermissions).filter(p => p.read).length === 0}
                    className="flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                    Bagikan File
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Hapus File"
        description={`Apakah Anda yakin ingin menghapus "${fileToDelete?.name}"? File akan dipindahkan ke Recycle Bin dan bisa di-restore nanti.`}
        confirmText="Hapus"
        loading={deleteLoading}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setFileToDelete(null);
        }}
        onConfirm={confirmDelete}
      />

      {/* Request Access Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Minta Akses Folder</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pesan (Opsional)</label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Jelaskan mengapa Anda membutuhkan akses ke folder ini..."
                className="w-full rounded-xl border border-gray-300 p-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[120px] transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleRequestAccess}
                disabled={requestLoading}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {requestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kirim Permintaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
