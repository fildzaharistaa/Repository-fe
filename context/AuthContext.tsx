'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import type { Permission, Role, User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;

  // multi-role state
  activeRole: Role | null;
  activeRoleId: string | null;
  assignments: UserRole[];
  loadingRoles: boolean;
  switchRole: (roleId: string) => Promise<void>;
  refreshRoles: () => Promise<void>;

  // permission helpers
  permissionSlugs: Set<string>;
  hasPermission: (slug: string) => boolean;
  hasAnyPermission: (...slugs: string[]) => boolean;
  hasRole: (roleName: string) => boolean;

  // role flags
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** @deprecated will be removed; prefer hasPermission */
  isDosen: boolean;
  /** @deprecated will be removed; prefer hasPermission */
  isTendik: boolean;
  /** @deprecated; derived from permission 'folder.create' */
  canCreateFolder: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function matchSlug(slugs: Set<string>, required: string): boolean {
  if (slugs.has('*')) return true;
  if (slugs.has(required)) return true;
  const dot = required.indexOf('.');
  if (dot > 0 && slugs.has(`${required.substring(0, dot)}.*`)) return true;
  return false;
}

const ACTIVE_ROLE_KEY = 'active_role_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, login, logout } = useAuth();
  const [assignments, setAssignments] = useState<UserRole[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(false);
  const [permissionSlugs, setPermissionSlugs] = useState<Set<string>>(new Set());
  const permCacheRef = useRef<Map<string, Set<string>>>(new Map());

  const activeRole: Role | null = useMemo(() => {
    if (!activeRoleId) return user?.role ?? null;
    const fromAssignments = assignments.find((a) => a.role_id === activeRoleId)?.role;
    return fromAssignments ?? user?.role ?? null;
  }, [activeRoleId, assignments, user]);

  const loadPermissionsFor = useCallback(async (roleId: string | null): Promise<Set<string>> => {
    if (!roleId) return new Set();
    const cached = permCacheRef.current.get(roleId);
    if (cached) return cached;
    try {
      const perms: Permission[] = await apiClient.saListRolePermissions(roleId);
      const set = new Set(perms.map((p) => p.slug));
      permCacheRef.current.set(roleId, set);
      return set;
    } catch (e) {
      // Backend may 403 (no role.view) or 404. Fallback to wildcard if role is admin.
      return new Set();
    }
  }, []);

  const recomputePermissions = useCallback(
    async (role: Role | null) => {
      if (!role) {
        setPermissionSlugs(new Set());
        return;
      }
      if (role.is_admin) {
        setPermissionSlugs(new Set(['*']));
        return;
      }
      const set = await loadPermissionsFor(role.id);
      setPermissionSlugs(set);
    },
    [loadPermissionsFor],
  );

  const refreshRoles = useCallback(async () => {
    if (!user) return;
    setLoadingRoles(true);
    try {
      const data = await apiClient.getMyRoles();
      setAssignments(data.assignments || []);
      const stored = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_ROLE_KEY) : null;
      const candidate =
        (stored && data.assignments?.some((a) => a.role_id === stored && a.status === 'ACTIVE')
          ? stored
          : data.active_role_id) ||
        data.assignments?.find((a) => a.is_primary && a.status === 'ACTIVE')?.role_id ||
        data.assignments?.find((a) => a.status === 'ACTIVE')?.role_id ||
        user.role_id ||
        null;

      // Auto-sync JWT if FE's candidate role differs from the current JWT's active_role_id.
      // This handles stale localStorage after re-login without explicit role switch.
      if (candidate && candidate !== data.active_role_id) {
        try {
          const res = await apiClient.switchActiveRole(candidate);
          setActiveRoleId(res.active_role_id);
          return; // useEffect on activeRole will trigger recomputePermissions
        } catch {
          // Switch failed (assignment suspended/deleted?), fall through
        }
      }
      setActiveRoleId(candidate);
    } catch {
      // graceful fallback: legacy single-role user
      setAssignments([]);
      setActiveRoleId(user.role_id ?? null);
    } finally {
      setLoadingRoles(false);
    }
  }, [user]);

  // Load roles on user change
  useEffect(() => {
    if (user) {
      refreshRoles();
    } else {
      setAssignments([]);
      setActiveRoleId(null);
      setPermissionSlugs(new Set());
      permCacheRef.current.clear();
    }
  }, [user, refreshRoles]);

  // Recompute permissions whenever activeRole changes
  useEffect(() => {
    recomputePermissions(activeRole);
  }, [activeRole, recomputePermissions]);

  const switchRole = useCallback(
    async (roleId: string) => {
      const res = await apiClient.switchActiveRole(roleId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_ROLE_KEY, roleId);
      }
      setActiveRoleId(res.active_role_id);
      // bust permission cache for this role since BE may have changed
      permCacheRef.current.delete(roleId);
      await recomputePermissions(res.active_role ?? null);
    },
    [recomputePermissions],
  );

  const hasPermission = useCallback(
    (slug: string) => matchSlug(permissionSlugs, slug),
    [permissionSlugs],
  );

  const hasAnyPermission = useCallback(
    (...slugs: string[]) => slugs.some((s) => matchSlug(permissionSlugs, s)),
    [permissionSlugs],
  );

  const hasRole = useCallback(
    (roleName: string) => {
      const n = roleName.toLowerCase();
      return assignments.some(
        (a) => a.status === 'ACTIVE' && a.role?.name?.toLowerCase() === n,
      );
    },
    [assignments],
  );

  const roleName = activeRole?.name?.toLowerCase() || '';
  const isAdmin =
    activeRole?.is_admin === true ||
    roleName === 'admin' ||
    roleName === 'super admin' ||
    roleName === 'superadmin' ||
    roleName === 'super_admin';
  const isSuperAdmin = !!activeRole?.is_admin && !!activeRole?.is_system;

  // Legacy flags — derived from permission slug + role metadata for backward compatibility
  const isDosen = roleName === 'dosen';
  const isTendik = roleName === 'tendik';
  const canCreateFolder = hasPermission('folder.create') || isAdmin || (!!user && !isDosen && !isTendik);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        activeRole,
        activeRoleId,
        assignments,
        loadingRoles,
        switchRole,
        refreshRoles,
        permissionSlugs,
        hasPermission,
        hasAnyPermission,
        hasRole,
        isAdmin,
        isSuperAdmin,
        isDosen,
        isTendik,
        canCreateFolder,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
