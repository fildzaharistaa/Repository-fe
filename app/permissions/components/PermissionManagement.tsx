'use client';

import { useState, useEffect } from 'react';
import { Check, X, Trash2, Plus, EditIcon } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useFolders } from '@/hooks/useFolders';
import { useRoles } from '@/hooks/useRoles';
import { handleApiError } from '@/lib/utils/errorHandler';
import type { FolderPermission } from '@/types';

export function PermissionManagement() {
  const { permissions, loading, error, fetchPermissions, createPermission, updatePermission, deletePermission } = usePermissions();
  // Use admin mode to see all folders including those without permissions
  const { folders } = useFolders(true);
  const { roles, loading: rolesLoading } = useRoles();
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    folder_id: '',
    user_id: '',
    role_id: '',
    can_read: true,
    can_create: false,
    can_update: false,
    can_delete: false,
    expires_at: '',
  });

  useEffect(() => {
    fetchPermissions(selectedFolderId || undefined);
  }, [selectedFolderId, fetchPermissions]);

  const handleCreate = async () => {
    try {
      await createPermission({
        folder_id: formData.folder_id,
        user_id: formData.user_id || null,
        role_id: formData.role_id || null,
        can_read: formData.can_read,
        can_create: formData.can_create,
        can_update: formData.can_update,
        can_delete: formData.can_delete,
        expires_at: formData.expires_at || null,
      });
      setShowCreateDialog(false);
      setFormData({
        folder_id: '',
        user_id: '',
        role_id: '',
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
        expires_at: '',
      });
      fetchPermissions(selectedFolderId || undefined);
      alert('Permission created successfully');
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return;
    
    try {
      await deletePermission(id);
      fetchPermissions(selectedFolderId || undefined);
      alert('Permission deleted successfully');
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const getFolderName = (folderId: string) => {
    const findFolder = (folders: any[]): any => {
      for (const folder of folders) {
        if (folder.id === folderId) return folder;
        if (folder.children) {
          const found = findFolder(folder.children);
          if (found) return found;
        }
      }
      return null;
    };
    const folder = findFolder(folders);
    return folder?.name || folderId;
  };

  if (loading && permissions.length === 0) {
    return <div className="p-6">Loading permissions...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-black">Permission Management</h2>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Create Permission
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Filter by Folder
        </label>
        <select
          value={selectedFolderId}
          onChange={(e) => setSelectedFolderId(e.target.value)}
          className="mt-1 rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">All Folders</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 text-red-600">Error: {error}</div>}

      <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Folder
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User/Role
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Read
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Create
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Update
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Delete
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Expires
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {permissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {getFolderName(permission.folder_id)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {permission.user_id ? `User: ${permission.user_id}` : `Role: ${permission.role_id}`}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                    {permission.can_read ? (
                      <Check className="mx-auto h-5 w-5 text-green-600" />
                    ) : (
                      <X className="mx-auto h-5 w-5 text-red-600" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                    {permission.can_create ? (
                      <Check className="mx-auto h-5 w-5 text-green-600" />
                    ) : (
                      <X className="mx-auto h-5 w-5 text-red-600" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                    {permission.can_update ? (
                      <Check className="mx-auto h-5 w-5 text-green-600" />
                    ) : (
                      <X className="mx-auto h-5 w-5 text-red-600" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                    {permission.can_delete ? (
                      <Check className="mx-auto h-5 w-5 text-green-600" />
                    ) : (
                      <X className="mx-auto h-5 w-5 text-red-600" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {permission.expires_at
                      ? new Date(permission.expires_at).toLocaleDateString()
                      : 'Never'}
                  </td>

                   <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(permission.id)}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-50 p-2 text-blue-600 transition-all hover:bg-red-100 hover:shadow-sm"
                      title="Edit Permission"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                  </td> 
                               
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(permission.id)}
                      className="inline-flex items-center justify-center rounded-lg bg-red-50 p-2 text-red-600 transition-all hover:bg-red-100 hover:shadow-sm"
                      title="Delete Permission"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td> 
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-md">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Create Permission</h3>
            <div className="space-y-4">
              <select
                value={formData.folder_id}
                onChange={(e) => setFormData({ ...formData, folder_id: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
              >
                <option value="">Select Folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="User ID (optional)"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                disabled={rolesLoading}
              >
                <option value="">Select Role (optional)</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} - {role.description}
                  </option>
                ))}
              </select>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.can_read}
                    onChange={(e) => setFormData({ ...formData, can_read: e.target.checked })}
                    className="mr-2"
                  />
                  Can Read
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.can_create}
                    onChange={(e) => setFormData({ ...formData, can_create: e.target.checked })}
                    className="mr-2"
                  />
                  Can Create
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.can_update}
                    onChange={(e) => setFormData({ ...formData, can_update: e.target.checked })}
                    className="mr-2"
                  />
                  Can Update
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.can_delete}
                    onChange={(e) => setFormData({ ...formData, can_delete: e.target.checked })}
                    className="mr-2"
                  />
                  Can Delete
                </label>
              </div>
              <input
                type="datetime-local"
                placeholder="Expires At (optional)"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setFormData({
                    folder_id: '',
                    user_id: '',
                    role_id: '',
                    can_read: true,
                    can_create: false,
                    can_update: false,
                    can_delete: false,
                    expires_at: '',
                  });
                }}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

