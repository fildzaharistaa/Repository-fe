'use client';

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, Files, FolderTree, ExternalLink } from 'lucide-react';
import { useFolderChildren } from '@/hooks/useFolderChildren';
import { useFolderContext } from '@/context/FolderContext';
import type { FolderOverviewItem } from '@/types';

const MAX_DEPTH = 8; // safety cap for deeply nested structures

interface FolderChildNodeProps {
  item: FolderOverviewItem;
  depth?: number;
}

export function FolderChildNode({ item, depth = 0 }: FolderChildNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { setSelectedFolderId, setVirtualRootFolderId } = useFolderContext();

  const canExpand = item.subfolder_count > 0 && depth < MAX_DEPTH;

  // Only trigger fetch when expanded (lazy)
  const { children, loading } = useFolderChildren(isExpanded ? item.id : null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canExpand) setIsExpanded((v) => !v);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVirtualRootFolderId(null);
    setSelectedFolderId(item.id);
  };

  // Indent: each depth level adds 20px, capped so deep nesting stays readable
  const indentPx = Math.min(depth * 20, 120);

  return (
    <div>
      {/* Row */}
      <div
        className={`group flex items-center gap-2 rounded-lg py-2 pr-2 transition-colors cursor-pointer
          ${canExpand
            ? 'hover:bg-orange-50'
            : 'hover:bg-gray-50 cursor-default'
          }`}
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
        <span
          className="flex-1 truncate text-sm text-gray-800 font-medium"
          title={item.name}
        >
          {item.name}
        </span>

        {/* Stat badges — always visible */}
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

        {/* Open shortcut — appears on hover */}
        <button
          onClick={handleOpen}
          title="Buka folder"
          className="ml-1 shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100
                     text-gray-400 hover:text-orange-600 hover:bg-orange-100 transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Children — lazy-loaded when expanded */}
      {isExpanded && (
        <div>
          {loading && (
            <ChildrenSkeleton depth={depth + 1} />
          )}

          {!loading && children.length === 0 && (
            <div
              className="py-2 text-xs text-gray-400 italic"
              style={{ paddingLeft: `${12 + (depth + 1) * 20 + 4}px` }}
            >
              Tidak ada subfolder
            </div>
          )}

          {!loading && children.map((child) => (
            <FolderChildNode key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton rows shown while fetching children ──────────────────────────────
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
          <div
            className="h-3.5 rounded bg-gray-100"
            style={{ width: `${55 + (i % 3) * 15}%` }}
          />
          <div className="ml-auto flex gap-1">
            <div className="h-4 w-8 rounded-full bg-blue-50" />
            <div className="h-4 w-6 rounded-full bg-green-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
