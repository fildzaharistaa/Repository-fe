'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Edit2,
  FileText,
  Folder,
  Key,
  Loader2,
  Lock,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import type { Permission, PermissionVisibility } from '@/types';

// ── Module metadata ──────────────────────────────────────────────
interface ModuleMeta {
  icon: LucideIcon;
  label: string;
  color: string;
  iconBg: string;
  headerBg: string;
  border: string;
}

const MODULE_META: Record<string, ModuleMeta> = {
  folder: {
    icon: Folder,
    label: 'Folder',
    color: 'text-orange-600',
    iconBg: 'bg-orange-100',
    headerBg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  file: {
    icon: FileText,
    label: 'File',
    color: 'text-blue-600',
    iconBg: 'bg-blue-100',
    headerBg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  role: {
    icon: Shield,
    label: 'Role',
    color: 'text-purple-600',
    iconBg: 'bg-purple-100',
    headerBg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  permission: {
    icon: Lock,
    label: 'Permission',
    color: 'text-purple-600',
    iconBg: 'bg-purple-100',
    headerBg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  user: {
    icon: Users,
    label: 'User',
    color: 'text-green-600',
    iconBg: 'bg-green-100',
    headerBg: 'bg-green-50',
    border: 'border-green-200',
  },
  audit: {
    icon: Activity,
    label: 'Audit',
    color: 'text-gray-600',
    iconBg: 'bg-gray-100',
    headerBg: 'bg-gray-50',
    border: 'border-gray-200',
  },
};

const FALLBACK_META: ModuleMeta = {
  icon: Key,
  label: '',
  color: 'text-gray-600',
  iconBg: 'bg-gray-100',
  headerBg: 'bg-gray-50',
  border: 'border-gray-200',
};

function getModuleMeta(key: string): ModuleMeta {
  const k = key.toLowerCase();
  for (const [mod, meta] of Object.entries(MODULE_META)) {
    if (k.includes(mod)) return meta;
  }
  return FALLBACK_META;
}

// ── Form state ───────────────────────────────────────────────────
interface PermFormState {
  slug: string;
  module: string;
  action: string;
  submodule: string;
  name: string;
  description: string;
  category: string;
  visibility: PermissionVisibility;
  is_active: boolean;
}

const emptyForm: PermFormState = {
  slug: '',
  module: '',
  action: '',
  submodule: '',
  name: '',
  description: '',
  category: '',
  visibility: 'internal',
  is_active: true,
};

// ── Toggle switch component ──────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────
export function PermissionManager() {
  const [groups, setGroups] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PermFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.saGetPermissionsGrouped();
      setGroups(data);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat permission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Filtering ──────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    const result: Record<string, Permission[]> = {};
    for (const [key, perms] of Object.entries(groups)) {
      const matched = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q),
      );
      if (matched.length) result[key] = matched;
    }
    return result;
  }, [groups, q]);

  const totalCount = Object.values(groups).reduce((s, a) => s + a.length, 0);
  const groupKeys = Object.keys(filteredGroups).sort();

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Form helpers ───────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Permission) => {
    setEditingId(p.id);
    setForm({
      slug: p.slug,
      module: p.module,
      action: p.action,
      submodule: p.submodule ?? '',
      name: p.name,
      description: p.description ?? '',
      category: p.category ?? '',
      visibility: p.visibility,
      is_active: p.is_active,
    });
    setModalOpen(true);
  };

  const onModuleAction = (next: Partial<PermFormState>) => {
    const merged = { ...form, ...next };
    if (!editingId) {
      const mod = merged.module.trim().toLowerCase().replace(/\s+/g, '_');
      const act = merged.action.trim().toLowerCase().replace(/\s+/g, '_');
      const sub = merged.submodule.trim().toLowerCase().replace(/\s+/g, '_');
      merged.slug = mod && act ? (sub ? `${mod}.${sub}.${act}` : `${mod}.${act}`) : '';
    }
    setForm(merged);
  };

  const submit = async () => {
    if (!form.slug.trim() || !form.module.trim() || !form.action.trim() || !form.name.trim()) {
      return toast.error('Modul, aksi, slug, dan nama wajib diisi');
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.saUpdatePermission(editingId, {
          name: form.name,
          description: form.description || undefined,
          category: form.category || undefined,
          visibility: form.visibility,
          is_active: form.is_active,
        });
        toast.success('Permission berhasil diperbarui');
      } else {
        await apiClient.saCreatePermission({
          slug: form.slug.trim(),
          module: form.module.trim(),
          action: form.action.trim(),
          submodule: form.submodule.trim() || undefined,
          name: form.name.trim(),
          description: form.description || undefined,
          category: form.category || undefined,
          visibility: form.visibility,
          is_active: form.is_active,
        });
        toast.success('Permission berhasil ditambahkan');
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan permission');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Permission) => {
    if (p.is_system) return toast.error('Permission sistem tidak dapat dihapus');
    if (!confirm(`Hapus permission "${p.name}" (${p.slug})?`)) return;
    try {
      await apiClient.saDeletePermission(p.id);
      toast.success('Permission dihapus');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus permission');
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Kelola Permission</h2>
            {!loading && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                {totalCount} permission
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Atur hak akses yang bisa di-assign ke setiap role di sistem.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Tambah Permission
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, slug, atau deskripsi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : groupKeys.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
          {search ? `Tidak ada permission yang cocok dengan "${search}"` : 'Belum ada permission.'}
        </div>
      ) : (
        <div className="space-y-3">
          {groupKeys.map((key) => {
            const perms = filteredGroups[key];
            const meta = getModuleMeta(key);
            const Icon = meta.icon;
            const isCollapsed = collapsed.has(key);

            return (
              <div
                key={key}
                className={`overflow-hidden rounded-xl border ${meta.border} bg-white shadow-sm`}
              >
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(key)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:brightness-95 ${meta.headerBg}`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.iconBg}`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </span>
                  <span className="flex-1">
                    <span className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      {key}
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.iconBg} ${meta.color}`}>
                    {perms.length} permission
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {/* Permission list */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {perms.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                      >
                        {/* Name + description */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                            <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                              {p.slug}
                            </code>
                          </div>
                          {p.description && (
                            <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex shrink-0 items-center gap-1.5">
                          {p.is_system && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                              <Shield className="h-2.5 w-2.5" />
                              Sistem
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              p.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {p.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit permission"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(p)}
                            disabled={p.is_system}
                            title={p.is_system ? 'Permission sistem tidak bisa dihapus' : 'Hapus permission'}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:cursor-not-allowed disabled:opacity-25"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingId ? 'Edit Permission' : 'Tambah Permission Baru'}
                </h3>
                <p className="text-xs text-gray-500">
                  {editingId
                    ? 'Perbarui nama, deskripsi, dan status permission.'
                    : 'Buat hak akses baru untuk digunakan di role.'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                {/* Edit mode: show slug as read-only info card (no confusing disabled inputs) */}
                {editingId ? (
                  <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-600">ID Permission (tidak dapat diubah)</p>
                      <code className="mt-0.5 block font-mono text-sm font-bold text-gray-800">{form.slug}</code>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Slug adalah identitas unik permission yang dipakai di seluruh sistem. Untuk mengubahnya, hapus dan buat ulang permission.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Create mode: module + submodule + action inputs */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700">
                          Modul <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={form.module}
                          onChange={(e) => onModuleAction({ module: e.target.value })}
                          placeholder="misal: folder"
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700">Submodul</label>
                        <input
                          value={form.submodule}
                          onChange={(e) => onModuleAction({ submodule: e.target.value })}
                          placeholder="opsional"
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700">
                          Aksi <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={form.action}
                          onChange={(e) => onModuleAction({ action: e.target.value })}
                          placeholder="misal: create"
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Slug preview */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">
                        Slug (ID Unik Permission)
                        <span className="ml-1 font-normal text-gray-400">— otomatis terisi</span>
                      </label>
                      <div
                        className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 ${
                          form.slug ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <code
                          className={`flex-1 font-mono text-sm ${
                            form.slug ? 'text-blue-700' : 'italic text-gray-400'
                          }`}
                        >
                          {form.slug || 'modul.aksi'}
                        </code>
                        {form.slug && (
                          <span className="text-[10px] font-semibold text-blue-500">PREVIEW</span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Nama Tampilan <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="misal: Buat Folder"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Nama yang ditampilkan di UI untuk admin.</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Deskripsi</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Jelaskan fungsi permission ini secara singkat..."
                    className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Category + Visibility */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Kategori</label>
                    <input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="misal: folder"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Visibilitas</label>
                    <select
                      value={form.visibility}
                      onChange={(e) =>
                        setForm({ ...form, visibility: e.target.value as PermissionVisibility })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="internal">Internal (admin saja)</option>
                      <option value="public">Public (semua user)</option>
                      <option value="hidden">Hidden (tersembunyi)</option>
                    </select>
                  </div>
                </div>

                {/* is_active toggle */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Status Aktif</p>
                    <p className="text-xs text-gray-500">
                      Nonaktifkan untuk menonaktifkan permission tanpa menghapusnya.
                    </p>
                  </div>
                  <Toggle
                    checked={form.is_active}
                    onChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Simpan Perubahan' : 'Tambah Permission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
