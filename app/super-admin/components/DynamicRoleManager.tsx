'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Edit2,
  Info,
  Loader2,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import type { Role } from '@/types';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface RoleFormState {
  name: string;
  description: string;
  category: string;
  hierarchy_level: number;
  is_admin: boolean;
  is_active: boolean;
  is_private: boolean;
  max_folder_depth?: number | undefined;
}

const emptyForm: RoleFormState = {
  name: '',
  description: '',
  category: '',
  hierarchy_level: 0,
  is_admin: false,
  is_active: true,
  is_private: false,
  max_folder_depth: undefined,
};

type FilterKey = 'all' | 'active' | 'inactive';

export function DynamicRoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [cloneSrc, setCloneSrc] = useState<Role | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneCopyPerm, setCloneCopyPerm] = useState(true);
  const [cloning, setCloning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.saListRoles({ includeInactive: true });
      setRoles(data);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((r) => {
      if (filter === 'active' && r.is_active === false) return false;
      if (filter === 'inactive' && r.is_active !== false) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [roles, search, filter]);

  const activeCount = roles.filter((r) => r.is_active !== false).length;
  const inactiveCount = roles.filter((r) => r.is_active === false).length;

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (r: Role) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      description: r.description ?? '',
      category: r.category ?? '',
      hierarchy_level: r.hierarchy_level ?? 0,
      is_admin: !!r.is_admin,
      is_active: r.is_active !== false,
      is_private: !!r.is_private,
      max_folder_depth: r.max_folder_depth ?? undefined,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Nama role wajib diisi');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || undefined,
        category: form.category || undefined,
        hierarchy_level: form.hierarchy_level,
        is_admin: form.is_admin,
        is_active: form.is_active,
        is_private: form.is_private,
        max_folder_depth: form.max_folder_depth ?? undefined,
      };
      if (editingId) {
        await apiClient.saUpdateRole(editingId, payload);
        toast.success('Role berhasil diperbarui');
      } else {
        await apiClient.saCreateRole(payload);
        toast.success('Role berhasil dibuat');
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan role');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Role) => {
    if (r.is_system) return toast.error('Role sistem tidak dapat dihapus');
    if (!confirm(`Hapus role "${r.name}"?`)) return;
    try {
      await apiClient.saDeleteRole(r.id);
      toast.success('Role dihapus');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus role');
    }
  };

  const submitClone = async () => {
    if (!cloneSrc || !cloneName.trim()) return;
    setCloning(true);
    try {
      await apiClient.saCloneRole(cloneSrc.id, { newName: cloneName.trim(), copyPermissions: cloneCopyPerm });
      toast.success(`Role berhasil diduplikasi sebagai "${cloneName}"`);
      setCloneSrc(null);
      setCloneName('');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menduplikasi role');
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Kelola Role</h2>
            {!loading && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                {roles.length} role
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">Kelola jabatan dan tingkat akses dalam sistem.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Tambah Role
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau deskripsi role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {([
            { key: 'all', label: `Semua (${roles.length})` },
            { key: 'active', label: `Aktif (${activeCount})` },
            { key: 'inactive', label: `Nonaktif (${inactiveCount})` },
          ] as { key: FilterKey; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${filter === key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
          {search ? `Tidak ada role cocok dengan "${search}"` : filter === 'inactive' ? 'Tidak ada role nonaktif.' : 'Belum ada role.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((r) => (
            <div
              key={r.id}
              className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md border-gray-200 ${r.is_active === false ? 'opacity-60' : ''}`}
            >
              {/* Avatar + name */}
              <div className="flex items-start gap-3 p-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: r.color || '#94a3b8' }}
                >
                  {getInitials(r.name) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gray-900">{r.name}</p>
                  {r.description
                    ? <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{r.description}</p>
                    : <p className="mt-0.5 text-xs italic text-gray-400">Tidak ada deskripsi</p>
                  }
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                {r.is_admin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    <ShieldCheck className="h-2.5 w-2.5" /> Admin Penuh
                  </span>
                )}
                {r.is_system && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <Shield className="h-2.5 w-2.5" /> Sistem
                  </span>
                )}
                {r.is_private && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                    Workspace Pribadi
                  </span>
                )}
                {r.is_active === false && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">Nonaktif</span>
                )}
              </div>

              {/* Info */}
              <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2.5">
                {r.category
                  ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">{r.category}</span>
                  : <span className="text-[10px] italic text-gray-400">Tanpa kategori</span>
                }
                <span className="text-gray-300">•</span>
                <span className="text-[10px] text-gray-500">Level <span className="font-semibold text-gray-700">{r.hierarchy_level ?? 0}</span></span>
                {r.max_folder_depth != null && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-[10px] text-gray-500">Folder maks <span className="font-semibold text-gray-700">{r.max_folder_depth}</span></span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 border-t border-gray-100 bg-gray-50 px-3 py-2">
                <button onClick={() => openEdit(r)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => { setCloneSrc(r); setCloneName(`${r.name} Copy`); }} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  <Copy className="h-3.5 w-3.5" /> Duplikasi
                </button>
                <button
                  onClick={() => remove(r)}
                  disabled={!!r.is_system}
                  title={r.is_system ? 'Role sistem tidak bisa dihapus' : 'Hapus'}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl" style={{ maxHeight: '90vh' }}>
            <div className="shrink-0 flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{editingId ? 'Edit Role' : 'Tambah Role Baru'}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{editingId ? 'Ubah informasi role yang sudah ada.' : 'Buat jabatan baru untuk digunakan dalam sistem.'}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 px-6 py-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800">Nama Role <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Contoh: Kepala Laboratorium, Koordinator Prodi"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800">Deskripsi</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Deskripsi singkat tugas dan tanggung jawab role ini"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800">Kategori</label>
                  <p className="mt-0.5 text-xs text-gray-500">Pengelompokan role. Contoh: pimpinan, staff.</p>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="pimpinan, staff, akademik"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800">Tingkat Senioritas</label>
                  <p className="mt-0.5 text-xs text-gray-500">Angka makin besar = makin senior.</p>
                  <input
                    type="number"
                    min={0}
                    value={form.hierarchy_level}
                    onChange={(e) => setForm({ ...form, hierarchy_level: parseInt(e.target.value || '0', 10) })}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800">Batas Kedalaman Folder <span className="ml-1 text-xs font-normal text-gray-500">(opsional)</span></label>
                <div className="mt-1 flex items-start gap-1.5">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                  <p className="text-xs text-gray-500">Berapa level subfolder yang boleh dibuat. Kosongkan = tidak ada batas.</p>
                </div>
                <input
                  type="number"
                  min={0}
                  value={form.max_folder_depth ?? ''}
                  onChange={(e) => setForm({ ...form, max_folder_depth: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Contoh: 3 (kosongkan = tidak ada batas)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border-2 p-4 transition-colors ${form.is_admin ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_admin} onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} className="h-4 w-4 accent-red-600" />
                    <span className={`text-sm font-semibold ${form.is_admin ? 'text-red-700' : 'text-gray-700'}`}>Admin Penuh</span>
                    {form.is_admin && <ShieldCheck className="h-4 w-4 text-red-500" />}
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500">Akses ke <strong>semua fitur</strong> secara otomatis. Gunakan hanya untuk Super Admin.</p>
                </label>

                <label className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border-2 p-4 transition-colors ${form.is_active ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-blue-600" />
                    <span className={`text-sm font-semibold ${form.is_active ? 'text-blue-700' : 'text-gray-700'}`}>Role Aktif</span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500">Role bisa di-assign ke user. Hilangkan centang untuk <strong>menonaktifkan sementara</strong>.</p>
                </label>
              </div>

              <label className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border-2 p-4 transition-colors ${form.is_private ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_private} onChange={(e) => setForm({ ...form, is_private: e.target.checked })} className="h-4 w-4 accent-purple-600" />
                  <span className={`text-sm font-semibold ${form.is_private ? 'text-purple-700' : 'text-gray-700'}`}>Workspace Pribadi</span>
                </div>
                <p className="text-xs leading-relaxed text-gray-500">Setiap user punya ruang kerja sendiri — folder tidak terlihat oleh user lain ber-role sama. Cocok untuk <strong>Dosen</strong> dan <strong>Tendik</strong>.</p>
              </label>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 rounded-b-2xl border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Batal</button>
              <button onClick={submit} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Simpan Perubahan' : 'Buat Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {cloneSrc && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Duplikasi Role</h3>
                <p className="text-xs text-gray-500 mt-0.5">Buat salinan dari role yang sudah ada.</p>
              </div>
              <button onClick={() => setCloneSrc(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: cloneSrc.color || '#94a3b8' }}>
                  {getInitials(cloneSrc.name)}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Menduplikasi dari:</p>
                  <p className="text-sm font-semibold text-gray-800">{cloneSrc.name}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Nama Role Baru <span className="text-red-500">*</span></label>
                <input
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nama role hasil duplikasi"
                />
              </div>
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${cloneCopyPerm ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="checkbox" checked={cloneCopyPerm} onChange={(e) => setCloneCopyPerm(e.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Salin permission juga</p>
                  <p className="text-xs text-gray-500 mt-0.5">Semua permission milik "{cloneSrc.name}" akan otomatis diberikan ke role baru.</p>
                </div>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
              <button onClick={() => setCloneSrc(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Batal</button>
              <button onClick={submitClone} disabled={cloning || !cloneName.trim()} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
                {cloning && <Loader2 className="h-4 w-4 animate-spin" />}
                Duplikasi Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
