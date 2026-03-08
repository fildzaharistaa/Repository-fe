'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, FolderIcon, FileIcon } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleRequestAccess = async (item: SearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequesting(item.id);
    try {
      const payload = item.type === 'folder' ? { folderId: item.id } : { fileId: item.id };
      await apiClient.requestAccess(payload);
      
      // Update local state to show 'pending'
      setResults(prev => prev.map(r => r.id === item.id ? { ...r, requestStatus: 'pending' } : r));
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
    <div className="relative w-80" ref={containerRef}>
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

              <div className="flex-shrink-0">
                {item.hasAccess ? (
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1.5 rounded-full border border-green-200">
                    Open
                  </span>
                ) : item.requestStatus === 'pending' ? (
                  <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2.5 py-1.5 rounded-full border border-orange-200">
                    Requested (Pending)
                  </span>
                ) : (
                  <button
                    onClick={(e) => handleRequestAccess(item, e)}
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
    </div>
  );
}