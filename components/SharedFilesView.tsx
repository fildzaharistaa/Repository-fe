'use client';

import { useState, useEffect } from 'react';
import { useSharedFiles } from '@/hooks/useSharedFiles';
import { useAuthContext } from '@/context/AuthContext';
import { FileIcon } from './FileIcon';
import { FilePreview } from './FilePreview';
import { ShareLinkModal } from './ShareLinkModal';
import { apiClient } from '@/lib/api/client';
import { Eye, Download, FileText, Loader2, X, Link2, Clock } from 'lucide-react';
import { formatFileSize, formatDate, getFileTypeInfo } from '@/lib/utils/formatters';
import { getDownloadErrorMessage } from '@/lib/utils/errorHandler';
import toast from 'react-hot-toast';
import type { File as FileEntity, ShareLink } from '@/types';

type TabType = 'shared-with-me' | 'shared-by-me';

function formatExpiry(iso: string | null): string {
  if (!iso) return 'Tidak kedaluwarsa';
  const d = new Date(iso);
  if (d < new Date()) return 'Kedaluarsa';
  return `Hingga ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function SharedFilesView() {
  const { roleVersion, hasPermission } = useAuthContext();
  const { files, loading, error, downloadFile } = useSharedFiles(roleVersion);
  const [selectedFile, setSelectedFile] = useState<FileEntity | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('shared-with-me');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Share Link modal
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [shareLinkTarget, setShareLinkTarget] = useState<{ id: string; name: string } | null>(null);

  // My shared links
  const [myLinks, setMyLinks] = useState<ShareLink[]>([]);
  const [myLinksLoading, setMyLinksLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'shared-by-me') {
      setMyLinksLoading(true);
      apiClient.getMySharedLinks()
        .then((links) => setMyLinks(links.filter((l) => l.item_type === 'file')))
        .catch(() => setMyLinks([]))
        .finally(() => setMyLinksLoading(false));
    }
  }, [activeTab, showShareLinkModal]);

  const getUploaderRole = (f: any): string => f.uploaded_by_role || f.owner_role || '';
  const uniqueRoles = Array.from(new Set(files.map((f: any) => getUploaderRole(f)).filter(Boolean)));
  const filteredFiles = files.filter((f: any) => roleFilter === 'all' || getUploaderRole(f) === roleFilter);

  const handleQuickView = (file: FileEntity) => {
    setSelectedFile(file);
    setShowQuickView(true);
  };

  const handleDownload = async (file: FileEntity) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (err) {
      toast.error(getDownloadErrorMessage(err), { duration: 5000 });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        Error loading shared files: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared Files</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola file yang dibagikan</p>
        </div>

        {activeTab === 'shared-with-me' && (
          <div className="flex items-center gap-2">
            <label htmlFor="role-filter-files" className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by Role:</label>
            <select
              id="role-filter-files"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map((role: any) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab('shared-with-me')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'shared-with-me' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          Dibagikan ke Saya
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === 'shared-with-me' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-500'}`}>
            {files.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('shared-by-me')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'shared-by-me' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Link2 className="h-4 w-4" />
          Dibagikan Oleh Saya
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === 'shared-by-me' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-500'}`}>
            {myLinks.length}
          </span>
        </button>
      </div>

      {/* Tab: Shared With Me */}
      {activeTab === 'shared-with-me' && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Owner</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Size</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Shared On</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">
                      {roleFilter === 'all' ? 'No shared files' : `No shared files from ${roleFilter}`}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {roleFilter === 'all'
                        ? 'Files shared directly with you will appear here'
                        : `No one with the role "${roleFilter}" has shared any files with you.`}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const fileInfo = getFileTypeInfo(file.mime_type);
                  return (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
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
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 font-medium">
                        {file.uploaded_by || file.owner_name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {file.owner_email || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {getUploaderRole(file)}
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
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          {(file.can_download && hasPermission('file.download')) && (
                            <button
                              onClick={() => handleDownload(file)}
                              className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-all hover:shadow-sm"
                            >
                              <Download className="h-3.5 w-3.5" /> Download
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Shared By Me */}
      {activeTab === 'shared-by-me' && (
        myLinksLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : myLinks.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Link2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Belum ada share link file</h3>
            <p className="mt-2 text-sm text-gray-500">File yang Anda bagikan via share link akan muncul di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">File ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Berlaku</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Stats</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myLinks.map((link) => {
                  const isExpired = link.expires_at ? new Date(link.expires_at) < new Date() : false;
                  const isActive = link.is_active && !isExpired;
                  return (
                    <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-orange-500 shrink-0" />
                          <span className="text-sm font-medium text-gray-900 font-mono">{link.item_id.slice(0, 16)}…</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Aktif</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            {!link.is_active ? 'Dinonaktifkan' : 'Kedaluarsa'}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`flex items-center gap-1 text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                          <Clock className="h-3 w-3" />
                          {formatExpiry(link.expires_at)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{link.view_count}</span>
                          <span className="flex items-center gap-1"><Download className="h-3 w-3" />{link.download_count}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => { setShareLinkTarget({ id: link.item_id, name: `File (${link.item_id.slice(0, 8)}...)` }); setShowShareLinkModal(true); }}
                          className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-all"
                        >
                          <Link2 className="h-3.5 w-3.5" /> Kelola Link
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
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
                    {formatFileSize(selectedFile.size)} • Uploaded by {(selectedFile as any).uploaded_by || selectedFile.owner_name}
                    {getUploaderRole(selectedFile) && <span className="ml-1">— {getUploaderRole(selectedFile)}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(selectedFile?.can_download && hasPermission('file.download')) && (
                  <button
                    onClick={() => handleDownload(selectedFile)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
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
              <FilePreview file={selectedFile} canDownload={selectedFile.can_download ?? false} />
            </div>
          </div>
        </div>
      )}

      {shareLinkTarget && (
        <ShareLinkModal
          open={showShareLinkModal}
          onClose={() => { setShowShareLinkModal(false); setShareLinkTarget(null); }}
          itemType="file"
          itemId={shareLinkTarget.id}
          itemName={shareLinkTarget.name}
        />
      )}
    </div>
  );
}
