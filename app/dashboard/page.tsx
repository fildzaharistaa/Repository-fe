'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { FileList } from '@/app/dashboard/components/FileList';
import { DashboardStats } from '@/components/DashboardStats';
import { SuperAdminDashboard } from '@/components/SuperAdminDashboard';
import { AllFoldersView } from '@/components/AllFoldersView';
import { RecentFilesView } from '@/components/RecentFilesView';
import { useFolderContext } from '@/context/FolderContext';
import { useAuthContext } from '@/context/AuthContext';

function DashboardContent() {
  const { selectedFolderId, activeMenu } = useFolderContext();
  const { isAdmin } = useAuthContext();

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
                <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>
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
        {activeMenu === 'recent-files' && (
          <div>
            <RecentFilesView />
          </div>
        )}
        {!activeMenu && (
          <div>
            {isAdmin ? (
              <SuperAdminDashboard />
            ) : (
              <>
                <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>
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

