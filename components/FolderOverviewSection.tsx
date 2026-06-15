'use client';

import { useRef, useEffect, useState } from 'react';
import { Search, RefreshCw, FolderOpen, ChevronDown } from 'lucide-react';
import { useFolderOverview, FolderSortOption } from '@/hooks/useFolderOverview';
import { FolderStatsCard } from '@/components/FolderStatsCard';
import { invalidateFolderChildrenCache } from '@/hooks/useFolderChildren';
import { useFolderContext } from '@/context/FolderContext';

const SORT_LABELS: Record<FolderSortOption, string> = {
  'recently-updated': 'Terbaru',
  'most-files': 'Terbanyak File',
  'a-z': 'A – Z',
};

interface Props {
  roleVersion: number;
}

export function FolderOverviewSection({ roleVersion }: Props) {
  const { setSelectedFolderId, setActiveMenu, setVirtualRootFolderId } = useFolderContext();
  const { items, loading, search, setSearch, sortBy, setSortBy, refresh, totalCount } =
    useFolderOverview(roleVersion);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Clear the module-level folder-children cache whenever the active role changes.
  // Without this, expanding a folder card after a role switch could show stale
  // children data fetched under the previous role.
  useEffect(() => {
    invalidateFolderChildrenCache();
  }, [roleVersion]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = (id: string) => {
    setVirtualRootFolderId(null);
    setSelectedFolderId(id);
  };

  const handleNavigateAllFolders = () => {
    setActiveMenu('all-folders');
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-orange-100 p-2">
            <FolderOpen className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              Folder Overview
            </h3>
            {!loading && (
              <p className="text-xs text-gray-500 mt-0.5">
                {totalCount} folder root {totalCount !== 1 ? 'tersedia' : 'tersedia'}
              </p>
            )}
          </div>
          {!loading && totalCount > 0 && (
            <span className="rounded-full bg-orange-100 text-orange-700 px-2.5 py-0.5 text-xs font-bold">
              {totalCount}
            </span>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={refresh}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-lg border border-gray-200
                     px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300
                     transition-colors"
          title="Refresh folder stats"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Search + Sort toolbar */}
      <div className="px-6 py-3 border-b border-gray-50 flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari folder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm
                       placeholder-gray-400 focus:bg-white focus:border-orange-400 focus:outline-none
                       focus:ring-2 focus:ring-orange-100 transition-colors"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative shrink-0" ref={sortRef}>
          <button
            onClick={() => setSortOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm transition-all ${
              sortBy === 'recently-updated'
                ? 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                : 'border-orange-400 bg-orange-500 text-white'
            }`}
          >
            <span>{SORT_LABELS[sortBy]}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 min-w-[160px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
              <div className="p-1.5 space-y-0.5">
                {(Object.keys(SORT_LABELS) as FolderSortOption[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setSortOpen(false); }}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                      sortBy === key
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Loading skeleton grid */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <FolderStatsCard key={i} loading={true} />
            ))}
          </div>
        )}

        {/* Empty state – no folders at all */}
        {!loading && totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-5">
              <FolderOpen className="h-12 w-12 text-gray-300" />
            </div>
            <p className="text-base font-semibold text-gray-700">Belum ada folder</p>
            <p className="mt-1.5 text-sm text-gray-400 max-w-xs">
              Buat folder pertama Anda untuk mulai mengelola file dan dokumen
            </p>
          </div>
        )}

        {/* Empty state – search returned nothing */}
        {!loading && totalCount > 0 && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-700">
              Folder &ldquo;{search}&rdquo; tidak ditemukan
            </p>
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-xs text-orange-600 hover:underline"
            >
              Hapus pencarian
            </button>
          </div>
        )}

        {/* Folder cards grid */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <FolderStatsCard
                key={item.id}
                item={item}
                onOpen={handleOpen}
                onNavigateAllFolders={handleNavigateAllFolders}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
