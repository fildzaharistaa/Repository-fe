import type {
  User,
  Role,
  Folder,
  FolderTreeNode,
  File as FileEntity,
  FolderPermission,
  PaginatedResponse,
  LoginResponse,
  Permission,
  UserRole,
  AssignRolePayload,
  BulkAssignPayload,
  BulkAssignResult,
  MyRolesResponse,
  SwitchRoleResponse,
  PermissionVisibility,
} from '@/types';
import { apiLogger } from './logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:3030/api';
if (typeof window !== 'undefined') {
  console.log('ApiClient: Using API_BASE_URL:', API_BASE_URL);
}


class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const headers: Record<string, string> = {};

    // Copy existing headers
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    // Only set Content-Type for JSON requests (not for FormData)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    apiLogger.log(`${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle empty responses (204 No Content)
    if (response.status === 204 || response.status === 201) {
      if (response.headers.get('content-length') === '0') {
        return {} as T;
      }
    }

    if (!response.ok) {
      let error: { message: string | string[]; statusCode?: number };
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        try {
          error = await response.json();
        } catch {
          error = { message: 'Request failed', statusCode: response.status };
        }
      } else {
        const text = await response.text();
        error = {
          message: text || 'Request failed',
          statusCode: response.status
        };
      }

      apiLogger.error(`Request failed: ${response.status}`, error);

      if (response.status === 401) {
        // Token expired or invalid, clear storage
        apiLogger.warn('Unauthorized - clearing token');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }

      const errorMessage = Array.isArray(error.message)
        ? error.message.join(', ')
        : error.message || `Request failed with status ${response.status}`;

      throw new Error(errorMessage);
    }

    // Handle empty response body
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text as unknown as T;
    }
  }

  // Autentikasi (Sistem Login)
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Manajemen Pengguna & Profil User
  async getProfile(): Promise<User> {
    return this.request<User>('/users/profile');
  }

  async getUserRole(): Promise<{ role: Role; role_id: string }> {
    return this.request<{ role: Role; role_id: string }>('/users/role');
  }

  async getRoles(): Promise<Role[]> {
    return this.request<Role[]>('/roles');
  }

  async getUsers(page = 1, limit = 10): Promise<PaginatedResponse<User>> {
    return this.request<PaginatedResponse<User>>(
      `/users?page=${page}&limit=${limit}`
    );
  }

  async createUser(userData: {
    email: string;
    password?: string;
    name: string;
    role_id?: string;
  }): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async importUsers(usersData: any[]): Promise<{ success: number; failed: number; errors: any[] }> {
    return this.request<{ success: number; failed: number; errors: any[] }>('/users/import-excel', {
      method: 'POST',
      body: JSON.stringify(usersData)
    });
  }

  async updateUser(
    id: string,
    userData: Partial<{
      name: string;
      password: string;
      role_id: string;
    }>
  ): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Manajemen Folder (Struktur & CRUD)
  async getFolderTree(): Promise<FolderTreeNode[]> {
    return this.request<FolderTreeNode[]>('/folders/tree');
  }

  async getSharedFolderTree(): Promise<FolderTreeNode[]> {
    return this.request<FolderTreeNode[]>('/folders/shared/tree');
  }

  async getFolders(): Promise<Folder[]> {
    return this.request<Folder[]>('/folders');
  }

  // Khusus Admin - Mengambil semua folder di sistem tanpa filter permission
  async getAllFolders(): Promise<Folder[]> {
    return this.request<Folder[]>('/folders/admin/all');
  }

  async getAdminFolderTree(): Promise<FolderTreeNode[]> {
    return this.request<FolderTreeNode[]>('/folders/admin/tree');
  }

  async getFolder(id: string): Promise<Folder> {
    return this.request<Folder>(`/folders/${id}`);
  }

  async createFolder(data: {
    name: string;
    parent_id?: string | null;
    share_with_roles?: string[];
    user_permissions?: any[];
    initial_subfolders?: string[];
  }): Promise<Folder> {
    return this.request<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFolder(
    id: string,
    data: { name?: string; share_with_roles?: string[]; user_permissions?: any[] }
  ): Promise<Folder> {
    return this.request<Folder>(`/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFolder(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/folders/${id}`, {
      method: 'DELETE',
    });
  }

  // Manajemen File (Upload, Download, Hapus File)
  async uploadFile(folderId: string, file: globalThis.File): Promise<FileEntity> {
    const formData = new FormData();
    // File extends Blob, but TypeScript needs explicit handling
    formData.append('file', file as unknown as Blob, file.name);

    const token = this.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(
      `${API_BASE_URL}/files/upload/${folderId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type for FormData, browser will set it with boundary
        },
        body: formData,
      }
    );

    if (!response.ok) {
      let error: { message: string | string[] };
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        try {
          error = await response.json();
        } catch {
          error = { message: 'Upload failed' };
        }
      } else {
        const text = await response.text();
        error = { message: text || 'Upload failed' };
      }

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }

      // Handle 403 Forbidden - Permission denied
      if (response.status === 403) {
        const errorMsg = Array.isArray(error.message)
          ? error.message.join(', ')
          : error.message || 'Permission denied';
        throw new Error(`Upload failed: ${errorMsg}. You don't have permission to upload files to this folder.`);
      }

      throw new Error(
        Array.isArray(error.message)
          ? error.message.join(', ')
          : error.message || `Upload failed with status ${response.status}`
      );
    }

    return response.json();
  }

  async getFiles(folderId: string): Promise<FileEntity[]> {
    return this.request<FileEntity[]>(`/files/folder/${folderId}`);
  }

  async getFile(id: string): Promise<FileEntity> {
    return this.request<FileEntity>(`/files/${id}`);
  }

  async renameFile(id: string, name: string): Promise<FileEntity> {
    return this.request<FileEntity>(`/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    });
  }

  async shareFile(
    id: string,
    data: { share_with_roles?: string[]; user_permissions?: any[]; message?: string }
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/access-requests/files/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFileShares(fileId: string): Promise<any[]> {
    return this.request<any[]>(`/access-requests/files/${fileId}/shares`);
  }

  async downloadFile(id: string): Promise<Blob> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(
      `${API_BASE_URL}/files/${id}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }

      const errorText = await response.text().catch(() => 'Download failed');
      throw new Error(errorText || `Download failed with status ${response.status}`);
    }

    return response.blob();
  }

  async deleteFile(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/files/${id}`, {
      method: 'DELETE',
    });
  }

  async previewFile(id: string): Promise<Blob> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(
      `${API_BASE_URL}/files/${id}/preview`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Preview failed');
      throw new Error(errorText || `Preview failed with status ${response.status}`);
    }

    return response.blob();
  }

  getPreviewUrl(id: string): string {
    const token = this.getToken();
    return `${API_BASE_URL}/files/${id}/preview?token=${token}`;
  }

  // Pengaturan Hak Akses Folder (Permission - Khusus Admin)
  async getPermissions(folderId?: string): Promise<FolderPermission[]> {
    const query = folderId ? `?folderId=${folderId}` : '';
    return this.request<FolderPermission[]>(`/permissions${query}`);
  }

  async createPermission(data: {
    folder_id: string;
    user_id?: string | null;
    role_id?: string | null;
    can_read?: boolean;
    can_create?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    expires_at?: string | null;
  }): Promise<FolderPermission> {
    return this.request<FolderPermission>('/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePermission(
    id: string,
    data: Partial<{
      can_read: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
      expires_at: string | null;
    }>
  ): Promise<FolderPermission> {
    return this.request<FolderPermission>(`/permissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePermission(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/permissions/${id}`, {
      method: 'DELETE',
    });
  }

  // Fitur Asisten Cerdas (Chatbot AI)
  async chatWithBot(message: string): Promise<{ response: string; timestamp: string }> {
    return this.request<{ response: string; timestamp: string }>('/chatbot/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async searchFolders(query: string): Promise<{
    query: string;
    results: Array<{
      id: string;
      name: string;
      accessible: boolean;
      roles_with_access: string[];
      needs_admin_permission: boolean;
    }>;
    count: number;
  }> {
    return this.request('/chatbot/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // Fitur Pencarian Global (Seluruh Sistem)
  async globalSearch(keyword: string): Promise<{
    folders: Array<{ id: string; name: string; type: string; parent: string; owner: string; hasAccess: boolean; requestStatus: string | null }>;
    files: Array<{ id: string; name: string; type: string; parent: string; owner: string; hasAccess: boolean; requestStatus: string | null }>;
  }> {
    return this.request(`/search?q=${encodeURIComponent(keyword)}`);
  }

  // Mengirimkan Permintaan Akses (Request Access)
  async requestAccess(data: { folderId?: string; fileId?: string; message?: string }): Promise<any> {
    return this.request('/access-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Data Statistik Khusus Super Admin
  async getSuperAdminStats(): Promise<{
    totalRoles: number;
    totalFolders: number;
    totalFiles: number;
    totalSize: number;
    maxFolderDepth: number;
    maxStoragePerUser: number;
    foldersPerUnit: Array<{ unit: string; count: string }>;
    usersPerRole: Array<{ roleName: string; count: string }>;
    recentActivity: Array<{ timestamp: string; user: string; action: string; type: 'superadmin' | 'user' }>;
  }> {
    return this.request('/stats/super-admin');
  }

  // Data Statistik User Biasa (Hanya folder milik sendiri)
  async getUserStats(): Promise<{
    totalFolders: number;
    totalFiles: number;
    totalSize: number;
    maxStoragePerUser: number;
    maxFolderDepth: number;
    recentFiles: Array<{
      id: string;
      name: string;
      size: number;
      created_at: string;
      folder_name: string;
    }>;
  }> {
    return this.request('/stats/user');
  }

  // Mengelola Status Permintaan Akses (List, Approve, Reject)
  async getPendingAccessRequests(): Promise<any[]> {
    return this.request('/access-requests/pending');
  }

  async getMyAccessRequests(): Promise<any[]> {
    return this.request('/access-requests/my-requests');
  }

  async getAllAccessRequests(): Promise<any[]> {
    return this.request('/access-requests/pending');
  }

  async approveAccessRequest(
    id: number,
    permissions?: {
      can_read?: boolean;
      can_create?: boolean;
      can_update?: boolean;
      can_delete?: boolean;
      response_message?: string;
    }
  ): Promise<{ message: string }> {
    return this.request(`/access-requests/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(permissions || { can_read: true }),
    });
  }

  async rejectAccessRequest(id: number, responseMessage?: string): Promise<any> {
    return this.request(`/access-requests/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ response_message: responseMessage }),
    });
  }

  async getSharedFiles(): Promise<FileEntity[]> {
    return this.request('/access-requests/shared-files');
  }

  // Mengambil Data Notifikasi Lonceng (Bell)
  async getNotifications(): Promise<{
    incoming: Array<{
      id: number;
      type: 'incoming';
      requesterName: string;
      requesterEmail: string;
      resourceName: string;
      resourceType: 'folder' | 'file';
      status: string;
      message: string | null;
      createdAt: string;
    }>;
    updates: Array<{
      id: number;
      type: 'update';
      requesterName: string;
      requesterEmail: string;
      resourceName: string;
      resourceType: 'folder' | 'file';
      status: string;
      response_message: string | null;
      createdAt: string;
    }>;
  }> {
    return this.request('/access-requests/notifications');
  }

  // Recycle Bin
  async getRecycleBin(): Promise<{
    folders: Array<{ id: string; name: string; type: 'folder'; deleted_at: string; parent_id: string | null }>;
    files: Array<{ id: string; name: string; type: 'file'; mime_type: string; size: number; deleted_at: string; folder_id: string }>;
  }> {
    return this.request('/recycle-bin');
  }

  async restoreFile(id: string): Promise<{ message: string }> {
    return this.request(`/recycle-bin/restore/file/${id}`, { method: 'PATCH' });
  }

  async restoreFolder(id: string): Promise<{ message: string }> {
    return this.request(`/recycle-bin/restore/folder/${id}`, { method: 'PATCH' });
  }

  async permanentDeleteFile(id: string): Promise<{ message: string }> {
    return this.request(`/recycle-bin/file/${id}`, { method: 'DELETE' });
  }

  async permanentDeleteFolder(id: string): Promise<{ message: string }> {
    return this.request(`/recycle-bin/folder/${id}`, { method: 'DELETE' });
  }

  // ========== System Settings ==========
  async getSettings(): Promise<Record<string, string>> {
    return this.request('/settings');
  }

  async updateSetting(key: string, value: string): Promise<any> {
    return this.request(`/settings/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
  }

  // ========== Hierarchy Requests ==========
  async requestHierarchyIncrease(data: { requested_depth: number; message?: string }): Promise<any> {
    return this.request('/access-requests/hierarchy', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveHierarchyRequest(id: number, responseMessage?: string): Promise<any> {
    return this.request(`/access-requests/${id}/approve-hierarchy`, {
      method: 'PATCH',
      body: JSON.stringify({ response_message: responseMessage }),
    });
  }

  async getPendingHierarchyRequests(): Promise<any[]> {
    return this.request('/access-requests/hierarchy/pending');
  }

  // ========== Roles ==========
  async updateRoleDepth(roleIds: string[], maxDepth: number): Promise<any> {
    return this.request('/roles/depth', {
      method: 'PATCH',
      body: JSON.stringify({ roleIds, maxDepth }),
    });
  }

  // ========== Phase 1 RBAC: Self-service multi-role ==========
  async getMyRoles(): Promise<MyRolesResponse> {
    return this.request<MyRolesResponse>('/users/my-roles');
  }

  async getMyPermissions(): Promise<{ permissions: string[]; isWildcard: boolean }> {
    return this.request('/users/my-permissions');
  }

  async switchActiveRole(roleId: string): Promise<SwitchRoleResponse> {
    const res = await this.request<SwitchRoleResponse>('/users/switch-role', {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    });
    if (typeof window !== 'undefined' && res?.access_token) {
      localStorage.setItem('token', res.access_token);
    }
    return res;
  }

  // ========== Phase 1 RBAC: Super-admin roles ==========
  async saCreateRole(payload: {
    name: string;
    description?: string;
    is_admin?: boolean;
    is_active?: boolean;
    hierarchy_level?: number;
    category?: string;
    color?: string;
    max_folder_depth?: number;
  }): Promise<Role> {
    return this.request<Role>('/super-admin/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async saListRoles(opts?: { includeInactive?: boolean; category?: string }): Promise<Role[]> {
    const qs = new URLSearchParams();
    if (opts?.includeInactive) qs.set('include_inactive', 'true');
    if (opts?.category) qs.set('category', opts.category);
    const q = qs.toString() ? `?${qs}` : '';
    return this.request<Role[]>(`/super-admin/roles${q}`);
  }

  async saGetRole(id: string): Promise<Role> {
    return this.request<Role>(`/super-admin/roles/${id}`);
  }

  async saUpdateRole(
    id: string,
    payload: Partial<{
      name: string;
      description: string;
      is_admin: boolean;
      is_active: boolean;
      hierarchy_level: number;
      category: string;
      color: string;
      max_folder_depth: number;
    }>,
  ): Promise<Role> {
    return this.request<Role>(`/super-admin/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async saToggleRoleActive(id: string): Promise<Role> {
    return this.request<Role>(`/super-admin/roles/${id}/toggle-active`, {
      method: 'PATCH',
    });
  }

  async saDeleteRole(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/super-admin/roles/${id}`, {
      method: 'DELETE',
    });
  }

  async saCloneRole(
    id: string,
    payload: { newName: string; description?: string; copyPermissions?: boolean },
  ): Promise<Role> {
    return this.request<Role>(`/super-admin/roles/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ========== Phase 1 RBAC: Super-admin permissions ==========
  async saCreatePermission(payload: {
    slug: string;
    module: string;
    action: string;
    submodule?: string;
    name: string;
    description?: string;
    category?: string;
    visibility?: PermissionVisibility;
    is_active?: boolean;
  }): Promise<Permission> {
    return this.request<Permission>('/super-admin/permissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async saListPermissions(opts?: {
    module?: string;
    category?: string;
    visibility?: PermissionVisibility;
  }): Promise<Permission[]> {
    const qs = new URLSearchParams();
    if (opts?.module) qs.set('module', opts.module);
    if (opts?.category) qs.set('category', opts.category);
    if (opts?.visibility) qs.set('visibility', opts.visibility);
    const q = qs.toString() ? `?${qs}` : '';
    return this.request<Permission[]>(`/super-admin/permissions${q}`);
  }

  async saGetPermissionsGrouped(): Promise<Record<string, Permission[]>> {
    return this.request<Record<string, Permission[]>>('/super-admin/permissions/grouped');
  }

  async saUpdatePermission(
    id: string,
    payload: Partial<{
      name: string;
      description: string;
      category: string;
      visibility: PermissionVisibility;
      is_active: boolean;
    }>,
  ): Promise<Permission> {
    return this.request<Permission>(`/super-admin/permissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async saDeletePermission(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/super-admin/permissions/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== Phase 1 RBAC: Role ↔ Permission ==========
  async saListRolePermissions(roleId: string): Promise<Permission[]> {
    return this.request<Permission[]>(`/super-admin/roles/${roleId}/permissions`);
  }

  async saAddRolePermissions(roleId: string, permissionIds: string[]): Promise<Permission[]> {
    return this.request<Permission[]>(`/super-admin/roles/${roleId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permissionIds }),
    });
  }

  async saReplaceRolePermissions(roleId: string, permissionIds: string[]): Promise<Permission[]> {
    return this.request<Permission[]>(`/super-admin/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds }),
    });
  }

  async saRemoveRolePermission(roleId: string, permissionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/super-admin/roles/${roleId}/permissions/${permissionId}`,
      { method: 'DELETE' },
    );
  }

  async saCopyRolePermissions(
    roleId: string,
    sourceRoleId: string,
    mode: 'merge' | 'replace' = 'merge',
  ): Promise<Permission[]> {
    return this.request<Permission[]>(`/super-admin/roles/${roleId}/copy-permissions`, {
      method: 'POST',
      body: JSON.stringify({ sourceRoleId, mode }),
    });
  }

  // ========== Phase 1 RBAC: User ↔ Role ==========
  async saListUserRoles(userId: string): Promise<UserRole[]> {
    return this.request<UserRole[]>(`/super-admin/users/${userId}/roles`);
  }

  async saAssignRole(userId: string, payload: AssignRolePayload): Promise<UserRole> {
    return this.request<UserRole>(`/super-admin/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async saBulkAssignRole(payload: BulkAssignPayload): Promise<BulkAssignResult> {
    return this.request<BulkAssignResult>('/super-admin/user-roles/bulk-assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async saRemoveRoleAssignment(userId: string, roleId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/super-admin/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  async saSetPrimaryRole(userId: string, roleId: string): Promise<UserRole> {
    return this.request<UserRole>(
      `/super-admin/users/${userId}/roles/${roleId}/set-primary`,
      { method: 'PATCH' },
    );
  }

  async saSuspendAssignment(assignmentId: string, reason?: string): Promise<UserRole> {
    return this.request<UserRole>(`/super-admin/user-roles/${assignmentId}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  async saReactivateAssignment(assignmentId: string): Promise<UserRole> {
    return this.request<UserRole>(`/super-admin/user-roles/${assignmentId}/reactivate`, {
      method: 'PATCH',
    });
  }

  async saRequestReactivation(assignmentId: string): Promise<UserRole> {
    return this.request<UserRole>(
      `/super-admin/user-roles/${assignmentId}/request-reactivation`,
      { method: 'PATCH' },
    );
  }

  async saGetPendingReactivations(): Promise<UserRole[]> {
    return this.request<UserRole[]>('/super-admin/user-roles/pending-reactivation');
  }

  async saGetAllActiveUserRoles(): Promise<UserRole[]> {
    return this.request<UserRole[]>('/super-admin/user-roles/active-summary');
  }
}

export const apiClient = new ApiClient();

