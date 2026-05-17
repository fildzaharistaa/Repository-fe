'use client';

import { useState, useRef, useEffect } from 'react';
import { useSharedFolders } from '@/hooks/useSharedFolders';
import { useFolderContext } from '@/context/FolderContext';
import { useAuthContext } from '@/context/AuthContext';
import { Folder, FolderPlus, Loader2, Mail, User } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import { FolderModal } from '@/components/FolderModal';
import toast from 'react-hot-toast';

export function SharedFoldersView() {
  const { roleVersion, canCreateSubfolder } = useAuthContext();
  const { folders, loading, error } = useSharedFolders(roleVersion);
  const { setSelectedFolderId, setVirtualRootFolderId } = useFolderContext();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [subfolderParentId, setSubfolderParentId] = useState<string | null>(null);

  const uniqueRoles = Array.from(new Set(folders.map((f: any) => f.owner_role).filter(Boolean)));

  const filteredFolders = folders.filter((f: any) => 
    roleFilter === 'all' || f.owner_role === roleFilter
  );

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
        Error loading shared folders: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared Folders</h1>
          <p className="text-sm text-gray-500 mt-1">Folders that have been shared with you by other users</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">Filter Role</span>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm transition-all ${
                roleFilter === 'all'
                  ? 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                  : 'border-orange-400 bg-orange-500 text-white'
              }`}
            >
              <span>{roleFilter === 'all' ? 'Semua Role' : roleFilter}</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                <div className="p-1.5 space-y-0.5">
                  {[{ value: 'all', label: 'Semua Role' }, ...uniqueRoles.map((r: any) => ({ value: r, label: r }))].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => { setRoleFilter(value); setDropdownOpen(false); }}
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
      </div>

      {filteredFolders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {roleFilter === 'all' ? 'No shared folders' : `No shared folders from ${roleFilter}`}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {roleFilter === 'all' 
              ? "You don't have access to any folders shared by other users yet."
              : `No one with the role "${roleFilter}" has shared any folders with you.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              className="group relative flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
            >
              {/* Create subfolder button — only visible if user has permission */}
              {canCreateSubfolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubfolderParentId(folder.id);
                  }}
                  title="Buat subfolder"
                  className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>Subfolder</span>
                </button>
              )}

              <button
                onClick={() => {
                  setVirtualRootFolderId(folder.id);
                  setSelectedFolderId(folder.id);
                }}
                className="w-full text-left focus:outline-none"
              >
              <div className="flex w-full items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-100">
                  <Folder className="h-5 w-5" />
                </div>
              </div>
              <div className="w-full">
                <h3 className="truncate text-base font-semibold text-gray-900" title={folder.name}>
                  {folder.name}
                </h3>
                <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-600 font-medium truncate">{(folder as any).owner_name || 'Unknown'}</span>
                  </div>
                  {(folder as any).owner_email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-400 truncate">{(folder as any).owner_email}</span>
                    </div>
                  )}
                  {(folder as any).owner_role && (
                    <span className="inline-block mt-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">
                      {(folder as any).owner_role}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center text-xs text-gray-400">
                  <span>{formatDate(folder.created_at)}</span>
                </div>
              </div>
              </button>
            </div>
          ))}
        </div>
      )}
      {/* FolderModal for subfolder creation inside shared folder */}
      <FolderModal
        isOpen={!!subfolderParentId}
        onClose={() => setSubfolderParentId(null)}
        editFolderId={null}
        parentId={subfolderParentId}
        onSuccess={(msg) => { toast.success(msg); setSubfolderParentId(null); }}
        refreshFolders={() => {}}
      />
    </div>
  );
}
