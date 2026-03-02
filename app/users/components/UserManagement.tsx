'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { handleApiError } from '@/lib/utils/errorHandler';
import type { User } from '@/types';

export function UserManagement() {
  const { users, loading, error, fetchUsers, createUser, updateUser, deleteUser } = useUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role_id: '',
  });

  useEffect(() => {
    fetchUsers(page, 10);
  }, [page, fetchUsers]);

  const handleCreate = async () => {
    try {
      await createUser(formData);
      setShowCreateDialog(false);
      setFormData({ email: '', password: '', name: '', role_id: '' });
      fetchUsers(page, 10);
      alert('User created successfully');
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    
    try {
      await updateUser(selectedUser.id, {
        name: formData.name,
        role_id: formData.role_id || undefined,
        ...(formData.password && { password: formData.password }),
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      setFormData({ email: '', password: '', name: '', role_id: '' });
      fetchUsers(page, 10);
      alert('User updated successfully');
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await deleteUser(id);
      fetchUsers(page, 10);
      alert('User deleted successfully');
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role_id: user.role_id,
    });
    setShowEditDialog(true);
  };

  if (loading && !users) {
    return <div className="p-6">Loading users...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-black">User Management</h2>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-orange-700 hover:to-orange-800 hover:shadow-lg"
        >
          <Plus className="h-4 w-4 font" />
          Create User
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users?.data.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {user.role.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditDialog(user)}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-50 p-2 text-blue-600 transition-all hover:bg-blue-100 hover:shadow-sm"
                        title="Edit User"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="inline-flex items-center justify-center rounded-lg bg-red-50 p-2 text-red-600 transition-all hover:bg-red-100 hover:shadow-sm"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users && users.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-4 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {users.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(users.totalPages, p + 1))}
            disabled={page === users.totalPages}
            className="rounded-md border px-4 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-md">
          <div className="w-full max-w-md rounded-lg bg-white p-6 ">
            <h3 className="text-black mb-4 text-lg font-semibold">Create User</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nama"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-black w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="text-black w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="text-black w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="text-black w-full rounded-md border border-gray-300 px-3 py-2"
                disabled={rolesLoading}
              >
                <option value="">Select Role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} - {role.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setFormData({ email: '', password: '', name: '', role_id: '' });
                }}
                className="text-black flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditDialog && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-md">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-black mb-4 text-lg font-semibold">Edit User</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-black w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="password"
                placeholder="New Password (leave empty to keep current)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="text-black w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="text-black w-full rounded-md border border-gray-300 px-3 py-2"
                disabled={rolesLoading}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} - {role.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedUser(null);
                  setFormData({ email: '', password: '', name: '', role_id: '' });
                }}
                className="text-black flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
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

