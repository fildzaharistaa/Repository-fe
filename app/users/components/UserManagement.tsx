'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { handleApiError } from '@/lib/utils/errorHandler';
import type { User } from '@/types';
import { ConfirmModal } from '@/components/ConfirmModal';
import toast from 'react-hot-toast';

export function UserManagement() {
  const { users, loading, error, fetchUsers, updateUser, deleteUser } = useUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const [page, setPage] = useState(1);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role_id: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchUsers(page, 10);
  }, [page, fetchUsers]);

  const handleUpdate = async () => {
    if (!selectedUser) return;

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    try {
      await updateUser(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        role_id: formData.role_id || undefined,
        ...(formData.password && { password: formData.password }),
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      setFormData({ email: '', password: '', confirmPassword: '', name: '', role_id: '' });
      setShowPassword(false);
      setShowConfirmPassword(false);
      fetchUsers(page, 10);
      toast.success('User updated successfully');
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const handleDelete = (id: string) => {
    setUserToDelete(id);
    setShowConfirm(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      confirmPassword: '',
      name: user.name,
      role_id: user.role_id,
    });
    setShowEditDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setLoadingDelete(true);

      await deleteUser(userToDelete);

      toast.success("User deleted successfully");

      fetchUsers(page, 10);

      setShowConfirm(false);
      setUserToDelete(null);

    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoadingDelete(false);
    }
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

      {showEditDialog && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-md">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-black mb-4 text-lg font-semibold">Edit User</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-black w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 ml-1">Email Address</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="text-black w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 ml-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="text-black w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 ml-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="text-black w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-[-8px] ml-1">Leave password fields empty to keep current password.</p>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 ml-1">User Role</label>
                <div className="relative">
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="text-black w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    disabled={rolesLoading}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)} {role.description ? `- ${role.description}` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
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
                  setFormData({ email: '', password: '', confirmPassword: '', name: '', role_id: '' });
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
                className="text-black flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showConfirm}
        title="Delete User"
        description="Are you sure you want to delete this user?"
        loading={loadingDelete}
        onCancel={() => {
          setShowConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
      />
    </div>
  );
}

