'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, FolderIcon, FileIcon, X, MessageCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { useFolderContext } from '@/context/FolderContext';

type SearchItem = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent: string;
  owner: string;
  hasAccess: boolean;
  requestStatus: string | null;
};

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTarget, setRequestTarget] = useState<SearchItem | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setSelectedFolderId, setActiveMenu } = useFolderContext();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.globalSearch(keyword);

      const combined: SearchItem[] = [
        ...data.folders.map((f) => ({
          id: f.id,
          name: f.name,
          type: 'folder' as const,
          parent: f.parent ?? 'Repository',
          owner: f.owner ?? '-',
          hasAccess: f.hasAccess,
          requestStatus: f.requestStatus,
        })),
        ...data.files.map((f) => ({
          id: f.id,
          name: f.name,
          type: 'file' as const,
          parent: f.parent ?? '-',
          owner: f.owner ?? '-',
          hasAccess: f.hasAccess,
          requestStatus: f.requestStatus,
        })),
      ];

      setResults(combined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencari');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRequestClick = (item: SearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequestTarget(item);
    setRequestMessage('');
    setShowRequestModal(true);
    setOpen(false);
  };

  const handleRequestSubmit = async () => {
    if (!requestTarget) return;
    setRequesting(requestTarget.id);
    try {
      const payload = requestTarget.type === 'folder'
        ? { folderId: requestTarget.id, message: requestMessage.trim() || undefined }
        : { fileId: requestTarget.id, message: requestMessage.trim() || undefined };
      await apiClient.requestAccess(payload);

      // Update local state to show 'pending'
      setResults(prev => prev.map(r => r.id === requestTarget.id ? { ...r, requestStatus: 'pending' } : r));
      setShowRequestModal(false);
      setRequestTarget(null);
      setRequestMessage('');
    } catch (err: any) {
      setError(err.message || 'Gagal meminta akses');
    } finally {
      setRequesting(null);
    }
  };

  // Handle input change with debounce
  const handleChange = (value: string) => {
    setQuery(value);
    setOpen(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      doSearch(value);
    }, 300);
  };

  return (
    <div className="relative w-96 lg:w-[500px]" ref={containerRef}>
      {/* Input */}
      <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
        <Search size={25} className="text-black" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Cari file atau folder..."
          className="w-full text-sm outline-none text-black"
        />
      </div>

      {/* Dropdown Result */}
      {open && query && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-white shadow-lg max-h-80 overflow-y-auto">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 p-3 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Mencari...
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* No results */}
          {!loading && !error && results.length === 0 && (
            <div className="p-3 text-sm text-gray-500">
              Tidak ada hasil yang ditemukan
            </div>
          )}

          {/* Results */}
          {!loading && !error && results.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="text-black p-3 hover:bg-gray-50 flex items-center justify-between border-b last:border-b-0"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 text-sm font-medium truncate">
                  {item.type === 'folder' ? (
                    <FolderIcon size={16} className="text-yellow-500 shrink-0" />
                  ) : (
                    <FileIcon size={16} className="text-blue-500 shrink-0" />
                  )}
                  <span className="truncate">{item.name}</span>
                </div>

                <div className="text-xs text-gray-500 ml-6 mt-0.5 truncate">
                  {item.type} • Parent: {item.parent}
                </div>

                <div className="text-xs text-gray-400 ml-6 truncate">
                  Owner: {item.owner}
                </div>
              </div>

              <div className="shrink-0">
                {item.hasAccess ? (
                  <button 
                    onClick={() => {
                      setOpen(false);
                      if (item.type === 'folder') {
                        setSelectedFolderId(item.id);
                        setActiveMenu(null);
                        router.push('/dashboard');
                      } else {
                        // User can navigate to the shared files view to find it
                        // Or if it's their own file, to all folders
                        setActiveMenu('shared-files');
                        setSelectedFolderId(null);
                        router.push('/dashboard');
                      }
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      item.requestStatus === 'approved' 
                        ? 'text-blue-700 hover:bg-blue-200 bg-blue-100 border-blue-200'
                        : 'text-green-700 hover:bg-green-200 bg-green-100 border-green-200'
                    }`}
                  >
                    {item.requestStatus === 'approved' ? 'Approved (Open)' : 'Open'}
                  </button>
                ) : item.requestStatus === 'pending' ? (
                  <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2.5 py-1.5 rounded-full border border-orange-200">
                    Requested (Pending)
                  </span>
                ) : (
                  <button
                    onClick={(e) => handleRequestClick(item, e)}
                    disabled={requesting === item.id}
                    className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {requesting === item.id ? 'Requesting...' : 'Request Access'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Request Access Modal */}
      {showRequestModal && requestTarget && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
          onClick={() => { setShowRequestModal(false); setRequestTarget(null); }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-blue-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Request Access</h3>
              </div>
              <button
                onClick={() => { setShowRequestModal(false); setRequestTarget(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-start gap-3">
                {requestTarget.type === 'folder' ? (
                  <FolderIcon className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                ) : (
                  <FileIcon className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{requestTarget.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Owner: {requestTarget.owner}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Pesan untuk Pemilik (Opsional)</label>
                <p className="text-xs text-gray-500 mb-2">Jelaskan alasan Anda membutuhkan akses ini.</p>
                <textarea
                  value={requestMessage}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setRequestMessage(e.target.value);
                  }}
                  placeholder="Contoh: Saya membutuhkan akses untuk keperluan tugas akhir..."
                  rows={4}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-black focus:outline-hidden resize-none ${
                    requestMessage.length >= 500
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  autoFocus
                />
                <div className="flex justify-between items-center mt-1">
                  {requestMessage.length >= 500 && (
                    <p className="text-xs text-red-500 font-medium">Pesan sudah mencapai batas maksimal!</p>
                  )}
                  <p className={`text-xs ml-auto font-medium ${
                    requestMessage.length >= 500 ? 'text-red-500' : requestMessage.length >= 450 ? 'text-amber-500' : 'text-gray-400'
                  }`}>
                    {requestMessage.length}/500
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowRequestModal(false); setRequestTarget(null); }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleRequestSubmit}
                disabled={requesting === requestTarget.id}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {requesting === requestTarget.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                Kirim Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}