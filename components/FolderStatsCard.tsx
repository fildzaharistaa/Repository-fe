'use client';

import { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Folder,
  Files,
  FolderTree,
  Clock,
  ExternalLink,
  MoreHorizontal,
  ChevronDown,
  Share2,
  User,
} from 'lucide-react';
import { formatFileSize } from '@/lib/utils/formatters';
import { useFolderChildren } from '@/hooks/useFolderChildren';
import { FolderChildNode } from '@/components/FolderChildNode';
import type { FolderOverviewItem } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FolderStatsCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="rounded-xl bg-gray-100 h-12 w-12" />
        <div className="h-6 w-6 rounded bg-gray-100" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="flex gap-2 mb-3">
        <div className="h-5 bg-blue-100 rounded-full w-20" />
        <div className="h-5 bg-green-100 rounded-full w-16" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="pt-3 border-t border-gray-100">
        <div className="h-7 bg-gray-100 rounded-lg w-full" />
      </div>
    </div>
  );
}

// ─── More Menu ────────────────────────────────────────────────────────────────

function MoreMenu({ onNavigateAllFolders }: { onNavigateAllFolders: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        title="More options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 min-w-[160px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={(e) => { e.stopPropagation(); onNavigateAllFolders(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Lihat di All Folders
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Expansion Panel ──────────────────────────────────────────────────────────

function ExpansionPanel({ item }: { item: FolderOverviewItem }) {
  const { children, loading } = useFolderChildren(item.id);

  return (
    <div className="border-t border-orange-100 bg-orange-50/40 rounded-b-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-orange-100/60">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-500">
          Subfolder ({item.subfolder_count})
        </p>
      </div>

      <div className="px-2 py-2 max-h-72 overflow-y-auto">
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 animate-pulse">
                <div className="w-4 h-3 rounded bg-orange-100 shrink-0" />
                <div className="h-4 w-4 rounded bg-orange-100 shrink-0" />
                <div
                  className="h-3.5 rounded bg-orange-100"
                  style={{ width: `${50 + (i % 3) * 20}%` }}
                />
                <div className="ml-auto flex gap-1">
                  <div className="h-4 w-8 rounded-full bg-blue-100/60" />
                  <div className="h-4 w-6 rounded-full bg-green-100/60" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && children.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Folder className="h-8 w-8 text-orange-200 mb-2" />
            <p className="text-xs text-gray-400">Tidak ada subfolder</p>
          </div>
        )}

        {/* Recursive folder nodes */}
        {!loading && children.length > 0 && (
          <div className="space-y-0.5">
            {children.map((child) => (
              <FolderChildNode key={child.id} item={child} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

interface FolderStatsCardProps {
  item: FolderOverviewItem;
  onOpen: (id: string) => void;
  onNavigateAllFolders: () => void;
  loading?: false;
}

interface FolderStatsCardLoadingProps {
  loading: true;
}

type Props = FolderStatsCardProps | FolderStatsCardLoadingProps;

export function FolderStatsCard(props: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (props.loading) return <FolderStatsCardSkeleton />;

  const { item, onOpen, onNavigateAllFolders } = props;
  const canExpand = item.subfolder_count > 0;
  const storagePercent = item.storage_size > 0
    ? Math.min((item.storage_size / (100 * 1024 * 1024)) * 100, 100)
    : 0;

  const handleCardClick = () => {
    if (canExpand) setIsExpanded((v) => !v);
  };

  return (
    <div
      className={`group flex flex-col rounded-xl border-2 bg-white shadow-sm
        transition-all duration-200
        ${isExpanded
          ? 'border-orange-400 shadow-md'
          : 'border-gray-200 hover:shadow-lg hover:border-orange-300 hover:-translate-y-0.5'
        }
        ${canExpand ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      {/* ── Card body ── */}
      <div className="p-5 flex flex-col flex-1">
        {/* Header: icon + controls */}
        <div className="flex items-start justify-between mb-4">
          <div className={`rounded-xl p-3 transition-colors
            ${isExpanded
              ? 'bg-orange-200'
              : 'bg-linear-to-br from-orange-50 to-amber-100 group-hover:from-orange-100 group-hover:to-amber-200'
            }`}>
            {isExpanded
              ? <FolderOpen className="h-7 w-7 text-orange-700" />
              : <FolderOpen className="h-7 w-7 text-orange-600" />
            }
          </div>

          <div className="flex items-center gap-1">
            {/* Expand chevron — only when folder has children */}
            {canExpand && (
              <span className={`rounded-lg p-1.5 text-gray-400 transition-all duration-150
                ${isExpanded ? 'text-orange-500 bg-orange-50' : 'group-hover:text-orange-400'}`}>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </span>
            )}
            <div onClick={(e) => e.stopPropagation()}>
              <MoreMenu onNavigateAllFolders={onNavigateAllFolders} />
            </div>
          </div>
        </div>

        {/* Folder name + shared badge */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3
              className="text-sm font-semibold text-gray-900 truncate leading-snug"
              title={item.name}
            >
              {item.name}
            </h3>
            {item.is_shared && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600 shrink-0">
                <Share2 className="h-2.5 w-2.5" />
                Shared
              </span>
            )}
          </div>

          {/* Owner info — only shown for shared folders */}
          {item.is_shared && item.owner_name && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <User className="h-2.5 w-2.5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-gray-600 truncate">{item.owner_name}</p>
                {item.owner_email && (
                  <p className="text-[10px] text-gray-400 truncate">{item.owner_email}</p>
                )}
                {item.owner_role && (
                  <span className="mt-0.5 inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                    {item.owner_role}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stat badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
            <FolderTree className="h-3 w-3" />
            {item.subfolder_count} subfolder{item.subfolder_count !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">
            <Files className="h-3 w-3" />
            {item.file_count} file{item.file_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Last updated */}
        <p className="flex items-center gap-1 text-xs text-gray-400 mb-3">
          <Clock className="h-3 w-3 shrink-0" />
          {relativeTime(item.updated_at)}
        </p>

        {/* Optional mini storage bar */}
        {item.storage_size > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Storage</span>
              <span className="text-xs text-gray-500 font-medium">{formatFileSize(item.storage_size)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-orange-400 to-amber-400 transition-all duration-500"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Expand hint text */}
        {canExpand && !isExpanded && (
          <p className="text-[11px] text-orange-400 font-medium mb-3">
            Klik untuk lihat subfolder ↓
          </p>
        )}

        <div className="flex-1" />

        {/* Open button */}
        <div
          className="flex gap-2 pt-3 border-t border-gray-100 mt-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onOpen(item.id)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-orange-50
                       hover:bg-orange-100 text-orange-700 text-xs font-semibold py-2 transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Buka Folder
          </button>
        </div>
      </div>

      {/* ── Expansion panel (lazy-rendered) ── */}
      {isExpanded && <ExpansionPanel item={item} />}
    </div>
  );
}
