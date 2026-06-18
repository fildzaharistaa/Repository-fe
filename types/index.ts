// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role_id: string;
  role: Role;
  userRoles?: UserRole[];
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
  is_private?: boolean;
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
  description?: string | null;
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
  description?: string;
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
  role_id?: string | null;
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
  shared_parent_name?: string | null;
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
  uploaded_by?: string;
  uploaded_by_role?: string;
  uploaded_by_role_id?: string | null;
  folder_owner_id?: string | null;
  can_read?: boolean;
  can_download?: boolean;
  can_create?: boolean;
  can_update?: boolean;
  can_delete?: boolean;
  last_accessed_at?: string | null;
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

// File Permission Types (user+role scoped, mirrors FolderPermission pattern)
export interface FilePermission {
  id: string;
  file_id: string;
  user_id: string | null;
  role_id: string | null;
  can_read: boolean;
  can_download: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: string; name: string; email: string } | null;
  role?: { id: string; name: string } | null;
}

// Payload for sharing a file with specific (user, role) pairs
export interface ShareFileUserPermEntry {
  user_id: string;
  role_id: string | null;
  can_read?: boolean;
  can_download?: boolean;
}

export interface ShareFilePayload {
  user_permissions: ShareFileUserPermEntry[];
  message?: string;
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

// Folder Overview Stats (per root folder, recursive counts)
export interface FolderOverviewItem {
  id: string;
  name: string;
  subfolder_count: number;
  file_count: number;
  storage_size: number;
  updated_at: string;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_role?: string | null;
  is_shared?: boolean;
}

// Share Link Types
export type ShareItemType = 'file' | 'folder';
export type ShareAccessLevel = 'anyone' | 'organization';
export type SharePermission = 'view' | 'download';

export interface ShareLink {
  id: string;
  token: string;
  item_type: ShareItemType;
  item_id: string;
  created_by: string;
  access_level: ShareAccessLevel;
  permission: SharePermission;
  expires_at: string | null;
  is_active: boolean;
  view_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface ShareLinkPublicInfo {
  token: string;
  item_type: ShareItemType;
  item_id: string;
  item_name: string;
  item_size?: number;
  mime_type?: string;
  shared_by: string;
  shared_by_email: string;
  access_level: ShareAccessLevel;
  permission: SharePermission;
  expires_at: string | null;
  is_active: boolean;
  view_count: number;
  download_count: number;
  created_at: string;
}

export interface ShareFolderFile {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface ShareFolderContents {
  folderName: string;
  permission: SharePermission;
  files: ShareFolderFile[];
}

export interface GenerateShareLinkPayload {
  type: ShareItemType;
  id: string;
  access_level?: ShareAccessLevel;
  permission?: SharePermission;
  expires_at?: string | null;
}

export interface UpdateShareLinkPayload {
  access_level?: ShareAccessLevel;
  permission?: SharePermission;
  expires_at?: string | null;
  is_active?: boolean;
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
