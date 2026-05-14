'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DynamicRoleManager } from '@/app/super-admin/components/DynamicRoleManager';
import { PermissionManager } from '@/app/super-admin/components/PermissionManager';
import { RolePermissionMatrix } from '@/app/super-admin/components/RolePermissionMatrix';
import { UserRoleAssignment } from '@/app/super-admin/components/UserRoleAssignment';

type TabKey = 'roles' | 'permissions' | 'matrix' | 'assignments';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'roles', label: 'Roles' },
  { key: 'permissions', label: 'Permissions' },
  { key: 'matrix', label: 'Role Permission' },
  { key: 'assignments', label: 'Assign Role ke User' },
];

function SuperAdminContent() {
  const [tab, setTab] = useState<TabKey>('roles');
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Role & Access Management</h1>
        <p className="text-sm text-gray-500">Kelola Role, Permission, dan Multi Role User</p>
      </div>
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      {tab === 'roles' && <DynamicRoleManager />}
      {tab === 'permissions' && <PermissionManager />}
      {tab === 'matrix' && <RolePermissionMatrix />}
      {tab === 'assignments' && <UserRoleAssignment />}
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <SuperAdminContent />
    </ProtectedRoute>
  );
}
