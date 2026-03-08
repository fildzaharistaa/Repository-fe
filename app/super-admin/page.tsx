'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleManagement } from '@/app/super-admin/components/RoleManagement';

function SuperAdminContent() {
  return <RoleManagement />;
}

export default function SuperAdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <SuperAdminContent />
    </ProtectedRoute>
  );
}
