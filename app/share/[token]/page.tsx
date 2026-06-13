'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText, Folder, Eye, Download, AlertTriangle, Clock, User, Loader2, X, Lock,
  Image as ImageIcon, File as FileIcon,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { ShareLinkPublicInfo, ShareFolderContents, ShareFolderFile } from '@/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function detectMime(mimeFromServer?: string, fileName?: string): string | undefined {
  if (mimeFromServer) return mimeFromServer;
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return ext ? map[ext] : undefined;
}

function isImage(mime?: string) { return mime?.startsWith('image/') ?? false; }
function isPdf(mime?: string) { return mime === 'application/pdf'; }
function isOfficeDoc(mime?: string) {
  return !!(mime && [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ].includes(mime));
}

function canPreview(mime?: string) {
  return isImage(mime) || isPdf(mime) || isOfficeDoc(mime);
}

function FileTypeIcon({ mime, className }: { mime?: string; className?: string }) {
  if (isImage(mime)) return <ImageIcon className={className} />;
  if (isPdf(mime)) return <FileText className={className} />;
  if (isOfficeDoc(mime)) return <FileText className={className} />;
  return <FileIcon className={className} />;
}

// ── Shared error/loading screens ─────────────────────────────────────────────

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
      </div>
      <a href="/" className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors">
        Kembali ke Beranda
      </a>
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

interface PreviewModalProps {
  fileName: string;
  viewUrl: string;
  mime?: string;
  onClose: () => void;
}

function PreviewModal({ fileName, viewUrl, mime, onClose }: PreviewModalProps) {
  const effectiveMime = detectMime(mime, fileName);
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="text-sm font-semibold text-gray-800 truncate max-w-[80%]">{fileName}</p>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {isPdf(effectiveMime) && (
            <iframe src={`${viewUrl}#toolbar=0&navpanes=0`} className="h-full w-full border-0" title={fileName} />
          )}
          {isImage(effectiveMime) && (
            <div className="flex h-full items-center justify-center bg-gray-50 p-4 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={viewUrl} alt={fileName} className="max-h-full max-w-full object-contain rounded-lg" />
            </div>
          )}
          {isOfficeDoc(effectiveMime) && (
            <div className="relative h-full w-full">
              <iframe src={officeViewerUrl} className="h-full w-full border-0" title={fileName} />
              <div className="absolute inset-x-0 top-0 h-12 z-10" />
              <div className="absolute inset-x-0 bottom-0 h-10 z-10" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared header card ────────────────────────────────────────────────────────

interface SharedByCardProps {
  info: ShareLinkPublicInfo;
  isExpired: boolean;
}

function SharedByCard({ info, isExpired }: SharedByCardProps) {
  return (
    <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-orange-400 to-amber-400" />
      <div className="p-5">
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
            <User className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Dibagikan oleh</p>
            <p className="text-sm font-semibold text-gray-800">{info.shared_by}</p>
            <p className="text-xs text-gray-400">{info.shared_by_email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {info.view_count} dilihat
          </span>
          {info.expires_at && !isExpired && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Berlaku hingga {formatDate(info.expires_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Folder view ───────────────────────────────────────────────────────────────

interface FolderShareViewProps {
  token: string;
  info: ShareLinkPublicInfo;
  isExpired: boolean;
}

function FolderShareView({ token, info, isExpired }: FolderShareViewProps) {
  const [contents, setContents] = useState<ShareFolderContents | null>(null);
  const [loadingContents, setLoadingContents] = useState(true);
  const [contentsError, setContentsError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ShareFolderFile | null>(null);

  useEffect(() => {
    apiClient.getShareFolderContents(token)
      .then(setContents)
      .catch((err: unknown) => setContentsError(err instanceof Error ? err.message : 'Gagal memuat isi folder'))
      .finally(() => setLoadingContents(false));
  }, [token]);

  return (
    <>
      <div className="flex min-h-screen flex-col items-start justify-start bg-gradient-to-br from-orange-50 to-amber-50 p-4 pt-10">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          {/* Folder title */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100">
              <Folder className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{info.item_name}</h1>
              <p className="text-xs text-gray-400">
                {info.permission === 'download' ? 'View & Download' : 'View only'}
              </p>
            </div>
          </div>

          {/* Shared by */}
          <SharedByCard info={info} isExpired={isExpired} />

          {/* File list */}
          <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-400" />
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Isi Folder</p>
            </div>

            {loadingContents && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            )}

            {contentsError && (
              <div className="px-5 py-8 text-center text-sm text-red-500">{contentsError}</div>
            )}

            {contents && contents.files.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-gray-400">Folder ini kosong</div>
            )}

            {contents && contents.files.length > 0 && (
              <ul className="divide-y divide-gray-50">
                {contents.files.map((file) => {
                  const mime = detectMime(file.mime_type, file.name);
                  const downloadUrl = apiClient.getShareFolderFileDownloadUrl(token, file.id);
                  const previewable = canPreview(mime);

                  return (
                    <li key={file.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                        <FileTypeIcon mime={mime} className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
                        <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {previewable && (
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> Lihat
                          </button>
                        )}
                        {info.permission === 'download' && (
                          <a
                            href={downloadUrl}
                            download
                            className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" /> Unduh
                          </a>
                        )}
                        {!previewable && info.permission !== 'download' && (
                          <span className="text-xs text-gray-400 italic">Tidak dapat dipratinjau</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-center text-xs text-gray-400">Sistem Repository Kampus FIK UPNVJ</p>
        </div>
      </div>

      {previewFile && (
        <PreviewModal
          fileName={previewFile.name}
          viewUrl={apiClient.getShareFolderFileViewUrl(token, previewFile.id)}
          mime={previewFile.mime_type}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}

// ── File view ─────────────────────────────────────────────────────────────────

interface FileShareViewProps {
  token: string;
  info: ShareLinkPublicInfo;
  isExpired: boolean;
}

function FileShareView({ token, info, isExpired }: FileShareViewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const viewUrl = apiClient.getShareViewUrl(token);
  const downloadUrl = apiClient.getShareDownloadUrl(token);
  const effectiveMime = detectMime(info.mime_type, info.item_name);

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-400 to-amber-400" />
            <div className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
                  <FileText className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 break-all">{info.item_name}</h1>
                  {info.item_size !== undefined && (
                    <p className="mt-1 text-sm text-gray-400">{formatBytes(info.item_size)}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                  <User className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Dibagikan oleh</p>
                  <p className="text-sm font-semibold text-gray-800">{info.shared_by}</p>
                  <p className="text-xs text-gray-400">{info.shared_by_email}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {info.view_count} dilihat
                </span>
                {info.expires_at && !isExpired && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Berlaku hingga {formatDate(info.expires_at)}
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {canPreview(effectiveMime) && (
                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" /> Lihat File
                  </button>
                )}
                {!canPreview(effectiveMime) && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
                    Preview tidak tersedia untuk tipe file ini
                  </div>
                )}
                {info.permission === 'download' && (
                  <a
                    href={downloadUrl}
                    download
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    <Download className="h-4 w-4" /> Unduh File
                  </a>
                )}
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400">Sistem Repository Kampus FIK UPNVJ</p>
        </div>
      </div>

      {showPreview && (
        <PreviewModal
          fileName={info.item_name}
          viewUrl={viewUrl}
          mime={info.mime_type}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ShareLinkPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiClient.getShareLinkByToken(token)
      .then((data) => {
        setInfo(data);
        if (data.expires_at && new Date(data.expires_at) < new Date()) setIsExpired(true);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Link tidak ditemukan atau sudah tidak aktif';
        if (msg.toLowerCase().includes('login') || msg.includes('401') || msg.includes('Unauthorized')) {
          setNeedsLogin(true);
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <Lock className="h-8 w-8 text-orange-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Login Diperlukan</h2>
          <p className="mt-1 text-sm text-gray-500">Konten ini hanya bisa diakses oleh anggota organisasi yang sudah login.</p>
        </div>
        <a href="/login" className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors">
          Login Sekarang
        </a>
      </div>
    );
  }

  if (error || !info) {
    return <ErrorScreen title="Link Tidak Valid" message={error ?? 'Link ini tidak ditemukan atau sudah tidak aktif.'} />;
  }

  if (!info.is_active || isExpired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">
            {!info.is_active ? 'Link Dinonaktifkan' : 'Link Kadaluarsa'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {!info.is_active
              ? 'Link ini telah dinonaktifkan oleh pemiliknya.'
              : `Link ini sudah tidak berlaku sejak ${formatDate(info.expires_at!)}.`}
          </p>
        </div>
        <a href="/" className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors">
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  if (info.item_type === 'folder') {
    return <FolderShareView token={token} info={info} isExpired={isExpired} />;
  }

  return <FileShareView token={token} info={info} isExpired={isExpired} />;
}
