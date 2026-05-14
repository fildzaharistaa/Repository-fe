'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requirePermission?: string;
  requireAnyPermission?: string[];
  requireRole?: string;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
  requirePermission,
  requireAnyPermission,
  requireRole,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSuperAdmin, hasPermission, hasAnyPermission, hasRole } =
    useAuthContext();
  const router = useRouter();

  const blocked = (() => {
    if (!user) return false; // handled separately
    if (requireSuperAdmin && !isSuperAdmin) return true;
    if (requireAdmin && !isAdmin) return true;
    if (requirePermission && !hasPermission(requirePermission)) return true;
    if (requireAnyPermission && !hasAnyPermission(...requireAnyPermission)) return true;
    if (requireRole && !hasRole(requireRole)) return true;
    return false;
  })();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
    } else if (blocked) {
      router.push('/dashboard');
    }
  }, [user, loading, blocked, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || blocked) return null;
  return <>{children}</>;
}
