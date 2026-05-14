'use client';

import { useState } from 'react';
import { ChevronDown, Check, Clock, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import { apiClient } from '@/lib/api/client';
import type { UserRole } from '@/types';

export function RoleSwitcher() {
  const { assignments, activeRoleId, switchRole, loadingRoles, refreshRoles } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  // Local overrides for optimistic PENDING_REACTIVATION update
  const [localOverrides, setLocalOverrides] = useState<Record<string, UserRole['status']>>({});

  const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE');
  const inactiveAssignments = assignments.filter(
    (a) => a.status === 'SUSPENDED' || a.status === 'PENDING_REACTIVATION',
  );

  // Show switcher if there are any active roles > 1 OR any inactive roles
  const shouldShow = activeAssignments.length > 1 || inactiveAssignments.length > 0;
  if (loadingRoles || !shouldShow) return null;

  const active = activeAssignments.find((a) => a.role_id === activeRoleId);

  const handleSwitch = async (roleId: string) => {
    if (roleId === activeRoleId) {
      setOpen(false);
      return;
    }
    setSwitching(roleId);
    try {
      await switchRole(roleId);
      const name = activeAssignments.find((a) => a.role_id === roleId)?.role?.name;
      toast.success(`Aktif sebagai ${name}`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal ganti role');
    } finally {
      setSwitching(null);
    }
  };

  const handleRequestReactivation = async (a: UserRole) => {
    setRequesting(a.id);
    try {
      await apiClient.saRequestReactivation(a.id);
      // Optimistic update
      setLocalOverrides((prev) => ({ ...prev, [a.id]: 'PENDING_REACTIVATION' }));
      await refreshRoles();
      toast.success(`Permintaan reaktivasi "${a.role?.name}" dikirim ke Super Admin`);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal mengirim permintaan');
    } finally {
      setRequesting(null);
    }
  };

  const getStatus = (a: UserRole): UserRole['status'] =>
    (localOverrides[a.id] as UserRole['status']) || a.status;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <span className="text-gray-500">Role:</span>
        <span
          className="rounded px-1.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: active?.role?.color || '#2563eb' }}
        >
          {active?.role?.name || '—'}
        </span>
        {inactiveAssignments.length > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {inactiveAssignments.length}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {/* Active roles section */}
            {activeAssignments.length > 0 && (
              <>
                <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                  Role Aktif
                </div>
                {activeAssignments.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleSwitch(a.role_id)}
                    disabled={!!switching}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: a.role?.color || '#94a3b8' }}
                      />
                      <span className="font-medium text-gray-800">{a.role?.name}</span>
                      {a.is_primary && (
                        <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-700">
                          PRIMARY
                        </span>
                      )}
                    </span>
                    {switching === a.role_id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : a.role_id === activeRoleId ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : null}
                  </button>
                ))}
              </>
            )}

            {/* Inactive (suspended / pending) section */}
            {inactiveAssignments.length > 0 && (
              <>
                <div className="border-t border-gray-200 border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                  Jabatan Tidak Aktif
                </div>
                {inactiveAssignments.map((a) => {
                  const currentStatus = getStatus(a);
                  const isPending = currentStatus === 'PENDING_REACTIVATION';
                  const isRequesting = requesting === a.id;
                  return (
                    <div
                      key={a.id}
                      className="border-b border-gray-100 px-3 py-2.5 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full opacity-50"
                            style={{ backgroundColor: a.role?.color || '#94a3b8' }}
                          />
                          <span className="text-sm font-medium text-gray-700">{a.role?.name}</span>
                        </span>
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Clock className="h-3 w-3" />
                            Menunggu
                          </span>
                        ) : (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                            Suspended
                          </span>
                        )}
                      </div>
                      {a.suspended_reason && (
                        <p className="mt-0.5 pl-5 text-xs text-gray-500">↪ {a.suspended_reason}</p>
                      )}
                      {!isPending && (
                        <button
                          type="button"
                          onClick={() => handleRequestReactivation(a)}
                          disabled={isRequesting}
                          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                        >
                          {isRequesting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Minta Reaktivasi
                        </button>
                      )}
                      {isPending && (
                        <p className="mt-1 pl-5 text-xs italic text-amber-600">
                          Permintaan dikirim, menunggu persetujuan Super Admin
                        </p>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
