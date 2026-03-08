// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role_id: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: 'admin' | 'super admin' | 'wd1' | 'wd2' | 'wd3' | 'dosen' | 'tendik';
  description: string;
  created_at?: string;
  updated_at?: string;
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
