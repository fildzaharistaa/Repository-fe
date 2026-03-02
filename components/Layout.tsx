'use client';

import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';
import { useFolderContext } from '@/context/FolderContext';
import { FolderTree } from '@/components/FolderTree';
import { NotificationBell } from '@/components/NotificationBell';
import { GlobalSearch } from '@/components/GlobalSearch';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthContext();
  const router = useRouter();
  const { selectedFolderId, setSelectedFolderId } = useFolderContext();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Full Height from Top */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white shadow-lg">
        <FolderTree
          selectedFolderId={selectedFolderId}
          onFolderSelect={setSelectedFolderId}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white shadow-sm">
          <div className="border-gray-200 flex items-center justify-start gap-4 px-6 py-4">
              <GlobalSearch />
          </div>

          <div className="flex items-center justify-end gap-4 px-6 py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 rounded-lg bg-gray-100 px-4 py-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-100 px-2 py-1"><NotificationBell /></div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

