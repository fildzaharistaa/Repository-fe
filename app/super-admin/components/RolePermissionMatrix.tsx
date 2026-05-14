'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckSquare,
  Copy,
  FileText,
  Folder,
  Key,
  Loader2,
  Lock,
  Save,
  Shield,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import type { Permission, Role } from '@/types';

// ── Module metadata (shared with PermissionManager) ──────────────
interface ModuleMeta {
  icon: LucideIcon;
  color: string;
  iconBg: string;
  headerBg: string;
  border: string;
  selectedBorder: string;
}

const MODULE_META: Record<string, ModuleMeta> = {
  folder: {
    icon: Folder,
    color: 'text-orange-600',
    iconBg: 'bg-orange-100',
    headerBg: 'bg-orange-50',
    border: 'border-orange-200',
    selectedBorder: 'border-orange-400',
  },
  file: {
    icon: FileText,
    color: 'text-blue-600',
    iconBg: 'bg-blue-100',
    headerBg: 'bg-blue-50',
    border: 'border-blue-200',
    selectedBorder: 'border-blue-400',
  },
  role: {
    icon: Shield,
    color: 'text-purple-600',
    iconBg: 'bg-purple-100',
    headerBg: 'bg-purple-50',
    border: 'border-purple-200',
    selectedBorder: 'border-purple-400',
  },
  permission: {
    icon: Lock,
    color: 'text-purple-600',
    iconBg: 'bg-purple-100',
    headerBg: 'bg-purple-50',
    border: 'border-purple-200',
    selectedBorder: 'border-purple-400',
  },
  user: {
    icon: Users,
    color: 'text-green-600',
    iconBg: 'bg-green-100',
    headerBg: 'bg-green-50',
    border: 'border-green-200',
    selectedBorder: 'border-green-400',
  },
  audit: {
    icon: Activity,
    color: 'text-gray-600',
    iconBg: 'bg-gray-100',
    headerBg: 'bg-gray-50',
    border: 'border-gray-200',
    selectedBorder: 'border-gray-400',
  },
};

const FALLBACK_META: ModuleMeta = {
  icon: Key,
  color: 'text-gray-600',
  iconBg: 'bg-gray-100',
  headerBg: 'bg-gray-50',
  border: 'border-gray-200',
  selectedBorder: 'border-gray-400',
};

function getModuleMeta(key: string): ModuleMeta {
  const k = key.toLowerCase();
  for (const [mod, meta] of Object.entries(MODULE_META)) {
    if (k.includes(mod)) return meta;
  }
  return FALLBACK_META;
}

// ── Helper: compare two Sets ─────────────────────────────────────
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// ── Main component ───────────────────────────────────────────────
export function RolePermissionMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySource, setCopySource] = useState<string>('');
  const [copyMode, setCopyMode] = useState<'merge' | 'replace'>('merge');

  // Track indeterminate state on group checkboxes
  const indeterminateRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Initial load ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [r, p] = await Promise.all([
          apiClient.saListRoles({ includeInactive: true }),
          apiClient.saListPermissions(),
        ]);
        setRoles(r);
        setAllPerms(p);
        if (r.length && !selectedRoleId) setSelectedRoleId(r[0].id);
      } catch (e: any) {
        toast.error(e?.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load permissions for selected role ─────────────────────────
  useEffect(() => {
    if (!selectedRoleId) return;
    setLoadingPerms(true);
    (async () => {
      try {
        const list = await apiClient.saListRolePermissions(selectedRoleId);
        const ids = new Set(list.map((p) => p.id));
        setAssignedIds(ids);
        setSavedIds(new Set(ids));
      } catch (e: any) {
        toast.error(e?.message || 'Gagal memuat permission role');
      } finally {
        setLoadingPerms(false);
      }
    })();
  }, [selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;
  const isDirty = !setsEqual(assignedIds, savedIds);

  // ── Grouped permissions ────────────────────────────────────────
  const groupedPerms = useMemo(() => {
    const m: Record<string, Permission[]> = {};
    for (const p of allPerms) {
      const k = p.category || p.module;
      if (!m[k]) m[k] = [];
      m[k].push(p);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.slug.localeCompare(b.slug));
    return m;
  }, [allPerms]);

  const groupKeys = Object.keys(groupedPerms).sort();
  const totalPerms = allPerms.length;
  const assignedCount = assignedIds.size;

  // ── Toggle helpers ─────────────────────────────────────────────
  const toggle = (id: string) => {
    if (selectedRole?.is_admin) return;
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllInGroup = (perms: Permission[]) => {
    if (selectedRole?.is_admin) return;
    const allChecked = perms.every((p) => assignedIds.has(p.id));
    setAssignedIds((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (allChecked) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  };

  // ── Save ───────────────────────────────────────────────────────
  const save = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await apiClient.saReplaceRolePermissions(selectedRoleId, Array.from(assignedIds));
      setSavedIds(new Set(assignedIds));
      toast.success(`Permission "${selectedRole?.name}" berhasil disimpan`);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // ── Copy ───────────────────────────────────────────────────────
  const runCopy = async () => {
    if (!selectedRoleId || !copySource) return;
    if (copySource === selectedRoleId) return toast.error('Role sumber harus berbeda');
    try {
      const list = await apiClient.saCopyRolePermissions(selectedRoleId, copySource, copyMode);
      const ids = new Set(list.map((p) => p.id));
      setAssignedIds(ids);
      toast.success(`Permission berhasil disalin`);
      setCopyModalOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyalin permission');
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const progressPct = totalPerms > 0 ? Math.round((assignedCount / totalPerms) * 100) : 0;

  return (
    <div className="flex gap-4" style={{ minHeight: '600px' }}>
      {/* ── Left panel: Role list ──────────────────────────────── */}
      <div className="w-56 shrink-0">
        <div className="sticky top-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Pilih Role</p>
          </div>
          <div className="max-h-[560px] overflow-y-auto py-1">
            {roles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-r-2 border-blue-500'
                      : 'hover:bg-gray-50 border-r-2 border-transparent'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: role.color || '#94a3b8' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm ${
                        isSelected ? 'font-bold text-blue-700' : 'font-medium text-gray-700'
                      }`}
                    >
                      {role.name}
                    </span>
                  </span>
                  {role.is_admin ? (
                    <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-700">
                      ADMIN
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right panel: Permissions ───────────────────────────── */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Header */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  {selectedRole?.name || '—'}
                </h2>
                {selectedRole?.is_admin && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    Administrator
                  </span>
                )}
                {isDirty && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">
                    ● Belum disimpan
                  </span>
                )}
              </div>
              {/* Progress */}
              {!selectedRole?.is_admin && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-800">{assignedCount}</span> dari{' '}
                      <span className="font-semibold text-gray-800">{totalPerms}</span> permission dipilih
                    </span>
                    <span className="text-xs font-semibold text-gray-600">{progressPct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => { setCopySource(''); setCopyModalOpen(true); }}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
                Salin dari Role Lain
              </button>
              <button
                onClick={save}
                disabled={saving || selectedRole?.is_admin || !isDirty}
                className={`relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                  isDirty && !selectedRole?.is_admin
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-300 cursor-not-allowed'
                } disabled:opacity-70`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>

        {/* Admin banner */}
        {selectedRole?.is_admin && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Role ini adalah Administrator
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Semua akses tersedia secara otomatis — tidak perlu assign permission satu per satu.
                Centang di bawah hanya untuk referensi.
              </p>
            </div>
          </div>
        )}

        {/* Permission groups */}
        {loadingPerms ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {groupKeys.map((key) => {
              const perms = groupedPerms[key];
              const meta = getModuleMeta(key);
              const Icon = meta.icon;
              const checkedInGroup = perms.filter((p) => assignedIds.has(p.id)).length;
              const allChecked = checkedInGroup === perms.length;
              const someChecked = checkedInGroup > 0 && !allChecked;

              return (
                <div
                  key={key}
                  className={`overflow-hidden rounded-xl border ${meta.border} bg-white shadow-sm`}
                >
                  {/* Group header */}
                  <div className={`flex items-center gap-3 px-4 py-2.5 ${meta.headerBg} border-b ${meta.border}`}>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.iconBg}`}>
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                    </span>
                    <span className="flex-1 text-sm font-bold uppercase tracking-wide text-gray-800">
                      {key}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.iconBg} ${meta.color}`}>
                      {checkedInGroup}/{perms.length} dipilih
                    </span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded accent-blue-600"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someChecked;
                            indeterminateRefs.current[key] = el;
                          }
                        }}
                        onChange={() => toggleAllInGroup(perms)}
                        disabled={!!selectedRole?.is_admin}
                      />
                      Pilih semua
                    </label>
                  </div>

                  {/* Permission cards grid */}
                  <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {perms.map((p) => {
                      const checked = assignedIds.has(p.id) || !!selectedRole?.is_admin;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggle(p.id)}
                          disabled={!!selectedRole?.is_admin}
                          className={`flex items-start gap-2.5 rounded-lg border-2 p-2.5 text-left transition-all ${
                            checked
                              ? `${meta.selectedBorder} bg-green-50`
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          } disabled:cursor-default`}
                        >
                          {/* Check indicator */}
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              checked
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-xs font-semibold leading-snug ${
                                checked ? 'text-gray-900' : 'text-gray-700'
                              }`}
                            >
                              {p.name}
                            </span>
                            <code className="mt-0.5 block truncate rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] text-gray-500">
                              {p.slug}
                            </code>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Copy modal ─────────────────────────────────────────── */}
      {copyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Salin Permission dari Role Lain</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Terapkan permission dari role lain ke <strong>{selectedRole?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setCopyModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {/* Source role */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">Role Sumber</label>
                <select
                  value={copySource}
                  onChange={(e) => setCopySource(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— Pilih role sumber —</option>
                  {roles
                    .filter((r) => r.id !== selectedRoleId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.is_admin ? ' ★' : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Mode cards */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Mode Penyalinan</label>
                <div className="space-y-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                      copyMode === 'merge'
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      className="mt-0.5 accent-blue-600"
                      checked={copyMode === 'merge'}
                      onChange={() => setCopyMode('merge')}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Tambahkan</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Menambah permission dari role sumber ke role ini.
                        Permission yang sudah ada <strong>tidak dihapus</strong>.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                      copyMode === 'replace'
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      className="mt-0.5 accent-red-600"
                      checked={copyMode === 'replace'}
                      onChange={() => setCopyMode('replace')}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        Timpa Semua
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Mengganti <strong>semua</strong> permission role ini dengan milik role sumber.
                        Permission lama akan <strong className="text-red-600">dihapus</strong>.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
              <button
                onClick={() => setCopyModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                onClick={runCopy}
                disabled={!copySource}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
                  copyMode === 'replace'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                {copyMode === 'replace' ? 'Timpa & Terapkan' : 'Tambahkan Permission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
