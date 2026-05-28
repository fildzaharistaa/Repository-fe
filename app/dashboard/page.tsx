'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { FileList } from '@/app/dashboard/components/FileList';
import { DashboardStats } from '@/components/DashboardStats';
import { SuperAdminDashboard } from '@/components/SuperAdminDashboard';
import { AllFoldersView } from '@/components/AllFoldersView';
import { AllFilesView } from '@/components/AllFilesView';
import { SharedFoldersView } from '@/components/SharedFoldersView';
import { SharedFilesView } from '@/components/SharedFilesView';
import { RecycleBinView } from '@/components/RecycleBinView';
import { useFolderContext } from '@/context/FolderContext';
import { useAuthContext } from '@/context/AuthContext';
import { useMemo } from 'react';

function DashboardContent() {
  const { selectedFolderId, activeMenu } = useFolderContext();
  const { isAdmin, user } = useAuthContext();

  const dateLabel = useMemo(() =>
    new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  []);


  // If a folder is selected, show file list
  if (selectedFolderId) {
    return (
      <div className="flex h-full flex-col bg-gray-50">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <FileList folderId={selectedFolderId} />
          </div>
        </div>
      </div>
    );
  }

  // Otherwise show content based on active menu
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto p-6">
        {activeMenu === 'dashboard' && (
          <div>
            {isAdmin ? (
              <SuperAdminDashboard />
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="mt-0.5 text-sm text-gray-500">Selamat datang, {user?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{dateLabel}</p>
                  </div>
                </div>
                <DashboardStats />
              </>
            )}
          </div>
        )}
        {activeMenu === 'all-folders' && (
          <div>
            <AllFoldersView />
          </div>
        )}
        {activeMenu === 'all-files' && (
          <div>
            <AllFilesView />
          </div>
        )}
        {activeMenu === 'shared-folders' && (
          <div>
            <SharedFoldersView />
          </div>
        )}
        {activeMenu === 'shared-files' && (
          <div>
            <SharedFilesView />
          </div>
        )}
        {activeMenu === 'recycle-bin' && (
          <div>
            <RecycleBinView />
          </div>
        )}
        {!activeMenu && (
          <div>
            {isAdmin ? (
              <SuperAdminDashboard />
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="mt-0.5 text-sm text-gray-500">Selamat datang, {user?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{dateLabel}</p>
                  </div>
                </div>
                <DashboardStats />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

