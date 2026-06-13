'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText, Folder, Eye, Download, AlertTriangle, Clock, User, Loader2, X, Lock,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { ShareLinkPublicInfo } from '@/types';

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

function isImage(mime?: string) {
  return mime?.startsWith('image/') ?? false;
}

function isPdf(mime?: string) {
  return mime === 'application/pdf';
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ShareLinkPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiClient.getShareLinkByToken(token)
      .then((data) => {
        setInfo(data);
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setIsExpired(true);
        }
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

  const viewUrl = apiClient.getShareViewUrl(token);
  const downloadUrl = apiClient.getShareDownloadUrl(token);

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
        <a
          href="/login"
          className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
        >
          Login Sekarang
        </a>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Link Tidak Valid</h2>
          <p className="mt-1 text-sm text-gray-500">{error ?? 'Link ini tidak ditemukan atau sudah tidak aktif.'}</p>
        </div>
        <a
          href="/"
          className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
        >
          Kembali ke Beranda
        </a>
      </div>
    );
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
        <a
          href="/"
          className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
        >
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  const isFile = info.item_type === 'file';
  const canPreviewInline = isImage(info.mime_type) || isPdf(info.mime_type);

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-400 to-amber-400" />

            <div className="p-8">
              {/* Icon + name */}
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
                  {isFile
                    ? <FileText className="h-8 w-8 text-orange-600" />
                    : <Folder className="h-8 w-8 text-orange-600" />}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 break-all">{info.item_name}</h1>
                  {info.item_size !== undefined && (
                    <p className="mt-1 text-sm text-gray-400">{formatBytes(info.item_size)}</p>
                  )}
                </div>
              </div>

              {/* Shared by */}
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

              {/* Meta */}
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {info.view_count} dilihat
                </span>
                {info.expires_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Berlaku hingga {formatDate(info.expires_at)}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex flex-col gap-3">
                {isFile && canPreviewInline && (
                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" /> Lihat File
                  </button>
                )}

                {isFile && !canPreviewInline && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
                    Preview tidak tersedia untuk tipe file ini
                    {info.mime_type && (
                      <span className="block text-xs text-gray-400 mt-0.5">{info.mime_type}</span>
                    )}
                  </div>
                )}

                {info.permission === 'download' && isFile && (
                  <a
                    href={downloadUrl}
                    download
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    <Download className="h-4 w-4" /> Unduh File
                  </a>
                )}

                {!isFile && (
                  <p className="rounded-xl bg-blue-50 px-4 py-3 text-center text-sm text-blue-700">
                    Folder ini dibagikan. Masuk ke aplikasi untuk mengaksesnya.
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            Sistem Repository Kampus FIK UPNVJ
          </p>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[80%]">{info.item_name}</p>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {isPdf(info.mime_type) && (
                <embed
                  src={viewUrl}
                  type="application/pdf"
                  className="h-full w-full"
                />
              )}
              {isImage(info.mime_type) && (
                <div className="flex h-full items-center justify-center bg-gray-50 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewUrl}
                    alt={info.item_name}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
