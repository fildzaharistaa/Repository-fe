// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role_id: string;
  role: Role;
  max_folder_depth?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  max_folder_depth?: number | null;
  is_admin?: boolean;
  is_active?: boolean;
  is_system?: boolean;
  hierarchy_level?: number;
  category?: string | null;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type UserRoleStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_REACTIVATION';
export type PermissionVisibility = 'internal' | 'public' | 'hidden';

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  role?: Role;
  is_primary: boolean;
  status: UserRoleStatus;
  suspended_reason: string | null;
  expires_at: string | null;
  assigned_at: string;
  suspended_at: string | null;
  reactivated_at: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  user?: { id: string; name: string; email: string };
}

export interface Permission {
  id: string;
  slug: string;
  module: string;
  action: string;
  submodule: string | null;
  name: string;
  description: string | null;
  category: string | null;
  visibility: PermissionVisibility;
  is_system: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AssignRolePayload {
  roleId: string;
  isPrimary?: boolean;
  expiresAt?: string;
}

export interface BulkAssignPayload {
  userIds: string[];
  roleId: string;
  isPrimary?: boolean;
  expiresAt?: string;
}

export interface SwitchRoleResponse {
  access_token: string;
  active_role: Role;
  active_role_id: string;
}

export interface MyRolesResponse {
  active_role_id: string | null;
  assignments: UserRole[];
}

export interface BulkAssignResult {
  roleId: string;
  total: number;
  results: { userId: string; ok: boolean; error?: string }[];
}

// Folder Types
export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  parent?: Folder;
  children?: Folder[];
  owner?: User;
  owner_id?: string;
  owner_name?: string;
  owner_role?: string;
  permissions?: FolderPermission[];
}

export interface FolderTreeNode extends Folder {
  children?: FolderTreeNode[];
}

// File Types
export interface File {
  id: string;
  name: string;
  path: string;
  mime_type: string;
  size: number;
  folder_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  folder?: Folder;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
  owner_role?: string;
  can_read?: boolean;
  can_download?: boolean;
  can_create?: boolean;
  can_update?: boolean;
  can_delete?: boolean;
}

// Permission Types
export interface FolderPermission {
  id: string;
  folder_id: string;
  user_id: string | null;
  role_id: string | null;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_download?: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  folder?: Folder;
  user?: User | null;
  role?: Role | null;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error Response
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

// Login Response
export interface LoginResponse {
  access_token: string;
  user: User;
}
