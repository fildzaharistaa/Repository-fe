'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield, Search, Users, ChevronDown, ChevronUp, UserCog, UserPlus, Eye, EyeOff, Filter } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { handleApiError } from '@/lib/utils/errorHandler';
import type { User, Role } from '@/types';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, string> = {
  'super admin': 'bg-purple-100 text-purple-800 border-purple-200',
  'admin': 'bg-purple-100 text-purple-800 border-purple-200',
  'wd1': 'bg-blue-100 text-blue-800 border-blue-200',
  'wd2': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'wd3': 'bg-amber-100 text-amber-800 border-amber-200',
  'dosen': 'bg-sky-100 text-sky-800 border-sky-200',
  'tendik': 'bg-slate-100 text-slate-800 border-slate-200',
};

const ROLE_LABELS: Record<string, string> = {
  'super admin': 'Super Admin',
  'admin': 'Admin',
  'wd1': 'Wakil Dekan 1',
  'wd2': 'Wakil Dekan 2',
  'wd3': 'Wakil Dekan 3',
  'dosen': 'Dosen',
  'tendik': 'Tendik',
};

function RoleBadge({ roleName }: { roleName: string }) {
  const colorClass = ROLE_COLORS[roleName] || 'bg-gray-100 text-gray-800 border-gray-200';
  const label = ROLE_LABELS[roleName] || roleName;

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  );
}

export function RoleManagement() {
  const { users, loading, error, fetchUsers, updateUser, createUser } = useUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'role'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);

  // Add User Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
  });

  useEffect(() => {
    fetchUsers(page, 50);
  }, [page, fetchUsers]);

  // Filter users by search and role
  const filteredUsers = useMemo(() => {
    if (!users?.data) return [];
    let result = users.data;

    // Filter by role
    if (selectedRoleFilter) {
      result = result.filter((u) => (u.role?.name || 'unknown') === selectedRoleFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role?.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [users, searchQuery, selectedRoleFilter]);

  // Sort users
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = (a.role?.name || '').localeCompare(b.role?.name || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredUsers, sortField, sortDir]);

  // Statistik per role
  const roleStats = useMemo(() => {
    if (!users?.data) return [];
    const counts: Record<string, number> = {};
    users.data.forEach((u) => {
      const name = u.role?.name || 'unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [users]);

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRoleId(user.role_id);
    setShowEditModal(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !selectedRoleId) return;

    try {
      setUpdating(true);
      await updateUser(selectedUser.id, { role_id: selectedRoleId });
      toast.success(`Role untuk ${selectedUser.name} berhasil diperbarui`);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers(page, 50);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
      toast.error('Nama, Email, dan Password wajib diisi');
      return;
    }
    try {
      setCreating(true);
      await createUser({
        name: newUserForm.name,
        email: newUserForm.email,
        password: newUserForm.password,
        role_id: newUserForm.role_id || undefined,
      });
      toast.success(`Pengguna ${newUserForm.name} berhasil ditambahkan`);
      setShowAddModal(false);
      setNewUserForm({ name: '', email: '', password: '', role_id: '' });
      setShowPassword(false);
      fetchUsers(page, 50);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const toggleSort = (field: 'name' | 'role') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: 'name' | 'role' }) => {
    if (sortField !== field) return <ChevronDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  if (loading && !users) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Memuat data pengguna...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
              <p className="text-sm text-gray-500">Kelola assignment role untuk setiap pengguna</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowAddModal(true);
              if (roles.length > 0 && !newUserForm.role_id) {
                setNewUserForm(prev => ({ ...prev, role_id: roles[0].id }));
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg"
          >
            <UserPlus className="h-4 w-4" />
            Create New User
          </button>
        </div>
      </div>

      {/* Role Filter Cards */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter className="h-4 w-4" />
          Filter by Role
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {/* All card */}
          <button
            onClick={() => setSelectedRoleFilter(null)}
            className={`rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md ${
              selectedRoleFilter === null
                ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300'
                : 'border-gray-100 bg-white'
            }`}
          >
            <div className="mb-2">
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                Semua
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{users?.data?.length || 0}</div>
            <div className="text-xs text-gray-500">pengguna</div>
          </button>
          {roleStats.map((stat) => (
            <button
              key={stat.name}
              onClick={() => setSelectedRoleFilter(selectedRoleFilter === stat.name ? null : stat.name)}
              className={`rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md ${
                selectedRoleFilter === stat.name
                  ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <div className="mb-2">
                <RoleBadge roleName={stat.name} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
              <div className="text-xs text-gray-500">pengguna</div>
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, email, atau role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center">
                    Nama
                    <SortIcon field="name" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th
                  scope="col"
                  className="cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  onClick={() => toggleSort('role')}
                >
                  <div className="flex items-center">
                    Role
                    <SortIcon field="role" />
                  </div>
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                    <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    {searchQuery
                      ? 'Tidak ada pengguna yang cocok dengan pencarian.'
                      : 'Belum ada pengguna.'}
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white shadow-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <RoleBadge roleName={user.role?.name || 'unknown'} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(user)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-all hover:bg-purple-100 hover:shadow-sm"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                        "Ubah Role"
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {users && users.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Halaman {page} dari {users.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(users.totalPages, p + 1))}
            disabled={page === users.totalPages}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
                <UserCog className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Ubah Role</h3>
                <p className="text-sm text-gray-500">{selectedUser.name}</p>
              </div>
            </div>

            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Email
            </div>
            <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {selectedUser.email}
            </div>

            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Role Saat Ini
            </div>
            <div className="mb-4">
              <RoleBadge roleName={selectedUser.role?.name || 'unknown'} />
            </div>

            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Role Baru
            </div>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="mb-6 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              disabled={rolesLoading}
            >
              {roles.map((role: Role) => (
                <option key={role.id} value={role.id}>
                  {ROLE_LABELS[role.name] || role.name} — {role.description}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={handleUpdateRole}
                disabled={updating || selectedRoleId === selectedUser.role_id}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50"
              >
                {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  setSelectedRoleId('');
                }}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm">
          <form 
            onSubmit={handleCreateUser}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tambah Pengguna Baru</h3>
                <p className="text-sm text-gray-500">Buat akun pengguna baru untuk sistem</p>
              </div>
            </div>

            {/* Nama Lengkap */}
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Nama Lengkap <span className="text-red-500">*</span>
            </div>
            <input
              type="text"
              name="new-user-name"
              autoComplete="off"
              value={newUserForm.name}
              onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Masukkan nama lengkap"
              required
              className="mb-4 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />

            {/* Email */}
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Email <span className="text-red-500">*</span>
            </div>
            <input
              type="email"
              name="new-user-email"
              autoComplete="off"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="admin@upnvj.ac.id"
              required
              className="mb-4 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />

            {/* Password */}
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Password <span className="text-red-500">*</span>
            </div>
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                name="new-user-password"
                autoComplete="new-password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Masukkan password"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Role */}
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Role <span className="text-red-500">*</span>
            </div>
            <select
              value={newUserForm.role_id}
              onChange={(e) => setNewUserForm(prev => ({ ...prev, role_id: e.target.value }))}
              required
              className="mb-6 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              disabled={rolesLoading}
            >
              <option value="" disabled hidden>Pilih role...</option>
              {roles.map((role: Role) => (
                <option key={role.id} value={role.id}>
                  {ROLE_LABELS[role.name] || role.name} — {role.description}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || !newUserForm.name || !newUserForm.email || !newUserForm.password}
                className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-green-700 hover:to-emerald-700 hover:shadow-lg disabled:opacity-50"
              >
                {creating ? 'Menyimpan...' : 'Tambah Pengguna'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewUserForm({ name: '', email: '', password: '', role_id: '' });
                  setShowPassword(false);
                }}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
