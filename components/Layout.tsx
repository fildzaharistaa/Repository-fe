'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { useFolderContext } from '@/context/FolderContext';
import { FolderTree } from '@/components/FolderTree';
import { NotificationBell } from '@/components/NotificationBell';
import { GlobalSearch } from '@/components/GlobalSearch';
import { RoleSwitcher } from '@/components/RoleSwitcher';

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 288;
const SIDEBAR_STORAGE_KEY = 'sidebar_width';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, activeRole } = useAuthContext();
  const router = useRouter();
  const { selectedFolderId, setSelectedFolderId } = useFolderContext();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Restore persisted width
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored) {
      const w = parseInt(stored, 10);
      if (w >= SIDEBAR_MIN && w <= SIDEBAR_MAX) setSidebarWidth(w);
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartWidth.current + delta));
      setSidebarWidth(next);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(dragStartWidth.current));
      // save final width
      setSidebarWidth((w) => { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(w)); return w; });
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  if (!user) return <>{children}</>;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className="relative shrink-0 border-r border-gray-200 bg-white shadow-lg transition-all duration-200"
        style={{ width: sidebarOpen ? sidebarWidth : 0, overflow: sidebarOpen ? 'visible' : 'hidden' }}
      >
        {sidebarOpen && (
          <div style={{ width: sidebarWidth }} className="h-full overflow-hidden">
            <FolderTree
              selectedFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
            />
          </div>
        )}

        {/* Resize handle */}
        {sidebarOpen && (
          <div
            onMouseDown={onMouseDown}
            className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-orange-400 active:bg-orange-500 transition-colors"
            title="Drag untuk mengubah lebar sidebar"
          />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-4">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-orange-600 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </button>
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <RoleSwitcher />

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* User info — compact, no role badge (already in RoleSwitcher) */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-semibold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-sm leading-tight">
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            <NotificationBell />

            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

