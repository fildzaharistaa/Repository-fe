'use client';

import {
  Bell,
  Check,
  X,
  FolderIcon,
  FileIcon,
  Loader2,
  MessageCircle,
  Layers,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useAuthContext } from '@/context/AuthContext';
import type { UserRole } from '@/types';

type IncomingNotif = {
  id: number;
  type: 'incoming';
  requesterName: string;
  requesterEmail: string;
  resourceName: string;
  resourceType: 'folder' | 'file';
  status: string;
  message: string | null;
  request_type?: 'access' | 'hierarchy' | 'delete_confirmation' | 'system_notification';
  requested_depth?: number | null;
  createdAt: string;
};

type UpdateNotif = {
  id: number;
  type: 'update';
  requesterName: string;
  requesterEmail: string;
  resourceName: string;
  resourceType: 'folder' | 'file';
  status: string;
  response_message: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const { isAdmin, activeRoleId } = useAuthContext();

  const [open, setOpen] = useState(false);
  const [showExpandedBadge, setShowExpandedBadge] = useState(false);
  const [incoming, setIncoming] = useState<IncomingNotif[]>([]);
  const [updates, setUpdates] = useState<UpdateNotif[]>([]);
  const [pendingReactivations, setPendingReactivations] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [reactivationActionLoading, setReactivationActionLoading] = useState<string | null>(null);
  const [isFirstFetchDone, setIsFirstFetchDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const prevIncomingRef = useRef<IncomingNotif[]>([]);
  const prevUpdatesRef = useRef<UpdateNotif[]>([]);
  const prevReactivationsRef = useRef<UserRole[]>([]);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const openRef = useRef(open);
  const hasAutoOpenedOnLoadRef = useRef(false);

  useEffect(() => { openRef.current = open; }, [open]);

  // Permission Modal state
  const [showPermissionModal, setShowPermissionModal] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState({
    can_read: true,
    can_create: false,
    can_update: false,
    can_delete: false,
    can_download: true,
  });
  const [approveMessage, setApproveMessage] = useState('');

  // Reject Modal state
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
  const [rejectMessage, setRejectMessage] = useState('');

  const triggerExpandedBadge = () => {
    if (!openRef.current) {
      setShowExpandedBadge(true);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = setTimeout(() => {
        setShowExpandedBadge(false);
        autoCloseTimerRef.current = null;
      }, 5000);
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const [accessResult, reactivationResult] = await Promise.allSettled([
        apiClient.getNotifications(activeRoleId ?? undefined),
        isAdmin ? apiClient.saGetPendingReactivations() : Promise.resolve([] as UserRole[]),
      ]);
      if (accessResult.status === 'fulfilled') {
        setIncoming(accessResult.value.incoming || []);
        setUpdates(accessResult.value.updates || []);
      }
      if (reactivationResult.status === 'fulfilled') {
        setPendingReactivations(reactivationResult.value || []);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setIsFirstFetchDone(true);
    }
  }, [isAdmin, activeRoleId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Deteksi notifikasi baru → auto-popup badge
  useEffect(() => {
    if (!isFirstFetchDone) return;

    if (!hasAutoOpenedOnLoadRef.current) {
      hasAutoOpenedOnLoadRef.current = true;
      prevIncomingRef.current = incoming;
      prevUpdatesRef.current = updates;
      prevReactivationsRef.current = pendingReactivations;
      const total = incoming.length + pendingReactivations.length;
      if (total > 0) triggerExpandedBadge();
      return;
    }

    const newIncoming = incoming.filter(c => !prevIncomingRef.current.some(p => p.id === c.id));
    const newReactivations = pendingReactivations.filter(c => !prevReactivationsRef.current.some(p => p.id === c.id));
    prevIncomingRef.current = incoming;
    prevUpdatesRef.current = updates;
    prevReactivationsRef.current = pendingReactivations;

    if (newIncoming.length > 0 || newReactivations.length > 0) {
      triggerExpandedBadge();
    }
  }, [incoming, updates, pendingReactivations, isFirstFetchDone]);

  // ---- Actions: access requests ----
  const handleApproveClick = (notif: IncomingNotif, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    setShowPermissionModal(notif.id);
    setApproveMessage('');
    setSelectedPermissions({ can_read: true, can_create: false, can_update: false, can_delete: false, can_download: true });
  };

  const executeApprove = async (id: number, permissions: typeof selectedPermissions) => {
    setActionLoading(id);
    try {
      await apiClient.approveAccessRequest(id, { ...permissions, response_message: approveMessage.trim() || undefined });
      setIncoming(prev => prev.filter(n => n.id !== id));
      setShowPermissionModal(null);
      setApproveMessage('');
    } catch { /* skip */ }
    finally { setActionLoading(null); }
  };

  const handleRejectClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    setShowRejectModal(id);
    setRejectMessage('');
  };

  const executeReject = async (id: number) => {
    setActionLoading(id);
    try {
      await apiClient.rejectAccessRequest(id, rejectMessage.trim() || undefined);
      setIncoming(prev => prev.filter(n => n.id !== id));
      setShowRejectModal(null);
      setRejectMessage('');
    } catch { /* skip */ }
    finally { setActionLoading(null); }
  };

  // ---- Actions: reactivation requests ----
  const handleApproveReactivation = async (ur: UserRole) => {
    setReactivationActionLoading(ur.id);
    try {
      await apiClient.saReactivateAssignment(ur.id);
      setPendingReactivations(prev => prev.filter(r => r.id !== ur.id));
    } catch { /* skip */ }
    finally { setReactivationActionLoading(null); }
  };

  const handleRejectReactivation = async (ur: UserRole) => {
    setReactivationActionLoading(ur.id);
    try {
      await apiClient.saSuspendAssignment(ur.id);
      setPendingReactivations(prev => prev.filter(r => r.id !== ur.id));
    } catch { /* skip */ }
    finally { setReactivationActionLoading(null); }
  };

  // ---- Derived ----
  const badgeCount = incoming.length + pendingReactivations.length;
  const hasAnyNotif = incoming.length > 0 || updates.length > 0 || pendingReactivations.length > 0;

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); setShowExpandedBadge(false); }}
        className="relative rounded-full p-2 text-black hover:bg-gray-100"
      >
        <Bell size={20} />
        {(badgeCount > 0 || showExpandedBadge) && (
          <span className={`absolute flex items-center justify-center bg-red-500 text-white font-medium shadow-sm transition-all duration-500 ease-in-out z-20 overflow-hidden ${showExpandedBadge ? 'top-10 -right-2 h-7 px-3 rounded-full text-xs' : '-right-1 -top-1 h-4 w-4 rounded-full text-[10px]'}`}>
            <span className="whitespace-nowrap">
              {showExpandedBadge ? `${badgeCount} Notifikasi Baru` : (badgeCount > 9 ? '9+' : badgeCount)}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-xl z-50 max-h-[520px] overflow-y-auto transform transition-all duration-200 origin-top animate-in fade-in slide-in-from-top-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">Notifikasi</span>
              {badgeCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {badgeCount}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          {loading && !hasAnyNotif ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Memuat...
            </div>
          ) : !hasAnyNotif ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
              <Bell size={32} className="opacity-30" />
              <p className="text-sm font-medium">Semua bersih!</p>
              <p className="text-xs">Tidak ada notifikasi baru.</p>
            </div>
          ) : (
            <>
              {/* ===== SECTION: Permintaan Reaktivasi (admin only) ===== */}
              {isAdmin && pendingReactivations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2">
                    <RefreshCw size={13} className="text-amber-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Permintaan Reaktivasi
                    </span>
                    <span className="ml-auto rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                      {pendingReactivations.length}
                    </span>
                  </div>
                  {pendingReactivations.map(ur => (
                    <div key={ur.id} className="border-b border-amber-100 bg-amber-50/40 p-3 last:border-b-0 hover:bg-amber-50">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 shrink-0 rounded-full bg-amber-100 p-1">
                          <RefreshCw size={12} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{ur.user?.name}</p>
                          <p className="text-xs text-gray-500">{ur.user?.email}</p>
                          <p className="mt-1 text-xs text-gray-700">
                            Minta aktifkan kembali jabatan{' '}
                            <span className="font-semibold text-amber-700">"{ur.role?.name}"</span>
                          </p>
                          {ur.suspended_reason && (
                            <p className="mt-0.5 text-xs italic text-gray-400">↪ {ur.suspended_reason}</p>
                          )}
                          <p className="mt-0.5 text-xs text-gray-400">
                            {timeAgo(ur.updated_at || ur.assigned_at)}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => handleApproveReactivation(ur)}
                              disabled={reactivationActionLoading === ur.id}
                              className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              {reactivationActionLoading === ur.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Check size={11} />}
                              Setujui
                            </button>
                            <button
                              onClick={() => handleRejectReactivation(ur)}
                              disabled={reactivationActionLoading === ur.id}
                              className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <X size={11} /> Tolak
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ===== SECTION: Access Requests ===== */}
              {incoming.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50/60 px-4 py-2">
                    <FolderIcon size={13} className="text-blue-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                      Access Requests
                    </span>
                    <span className="ml-auto rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                      {incoming.length}
                    </span>
                  </div>
                  {incoming.map((notif) => (
                    <div key={`in-${notif.id}`} className="border-b border-gray-100 p-3 last:border-b-0 hover:bg-gray-50">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 shrink-0">
                          {notif.request_type === 'hierarchy' ? (
                            <Layers size={16} className="text-orange-500" />
                          ) : notif.request_type === 'delete_confirmation' ? (
                            <Trash2 size={16} className="text-red-500" />
                          ) : notif.resourceType === 'folder' ? (
                            <FolderIcon size={16} className="text-yellow-500" />
                          ) : (
                            <FileIcon size={16} className="text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {notif.request_type === 'hierarchy' ? (
                            <>
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">{notif.requesterName}</span>
                                <span className="text-xs text-gray-400"> • {notif.requesterEmail}</span>
                              </p>
                              <p className="mt-0.5 text-xs text-gray-600">
                                Request tambah kedalaman folder ke{' '}
                                <span className="font-bold text-orange-600">{notif.requested_depth} level</span>
                              </p>
                              <p className="mt-0.5 text-xs text-gray-400">{timeAgo(notif.createdAt)}</p>
                              {notif.message && (
                                <div className="mt-2 rounded-md border border-orange-100 bg-orange-50 px-3 py-2">
                                  <div className="flex items-start gap-1.5">
                                    <MessageCircle size={12} className="mt-0.5 shrink-0 text-orange-500" />
                                    <p className="text-xs italic leading-relaxed text-orange-800">"{notif.message}"</p>
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setActionLoading(notif.id);
                                    try { await apiClient.approveHierarchyRequest(notif.id); setIncoming(prev => prev.filter(n => n.id !== notif.id)); }
                                    catch { /* skip */ } finally { setActionLoading(null); }
                                  }}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 transition-colors disabled:opacity-50"
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button
                                  onClick={(e) => handleRejectClick(notif.id, e)}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  <X size={12} /> Reject
                                </button>
                              </div>
                            </>
                          ) : notif.request_type === 'delete_confirmation' ? (
                            <>
                              <p className="text-sm font-semibold text-gray-900">Konfirmasi Penghapusan</p>
                              <p className="mt-0.5 text-xs text-gray-700">
                                <span className="font-medium">"{notif.resourceName}"</span>
                              </p>
                              <p className="mt-0.5 text-xs text-gray-400">{timeAgo(notif.createdAt)}</p>
                              {notif.message && (
                                <div className="mt-2 rounded-md border border-red-100 bg-red-50 px-3 py-2">
                                  <p className="text-xs italic text-red-800">"{notif.message}"</p>
                                </div>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setActionLoading(notif.id);
                                    try { await apiClient.approveAccessRequest(notif.id); setIncoming(prev => prev.filter(n => n.id !== notif.id)); }
                                    catch { /* skip */ } finally { setActionLoading(null); }
                                  }}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 transition-colors disabled:opacity-50"
                                >
                                  <Check size={12} /> Setuju
                                </button>
                                <button
                                  onClick={(e) => handleRejectClick(notif.id, e)}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  <X size={12} /> Tolak
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">{notif.requesterName}</span>
                                {notif.requesterEmail && (
                                  <span className="text-xs text-gray-400"> • {notif.requesterEmail}</span>
                                )}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-600">
                                Request akses{' '}
                                <span className="font-medium">"{notif.resourceName}"</span>
                              </p>
                              <p className="mt-0.5 text-xs text-gray-400">{timeAgo(notif.createdAt)}</p>
                              {notif.message && (
                                <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                                  <div className="flex items-start gap-1.5">
                                    <MessageCircle size={12} className="mt-0.5 shrink-0 text-blue-500" />
                                    <p className="text-xs italic leading-relaxed text-blue-800">"{notif.message}"</p>
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={(e) => handleApproveClick(notif, e)}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 transition-colors disabled:opacity-50"
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button
                                  onClick={(e) => handleRejectClick(notif.id, e)}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  <X size={12} /> Reject
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ===== SECTION: Request Updates ===== */}
              {updates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 border-b border-gray-200 border-t border-t-gray-200 bg-gray-50 px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Update Permintaan Saya
                    </span>
                  </div>
                  {updates.map((notif) => (
                    <div key={`up-${notif.id}`} className="border-b border-gray-100 p-3 last:border-b-0 hover:bg-gray-50">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 shrink-0">
                          {notif.resourceType === 'folder' ? (
                            <FolderIcon size={16} className="text-yellow-500" />
                          ) : (
                            <FileIcon size={16} className="text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            Akses ke {notif.resourceType}{' '}
                            <span className="font-medium">"{notif.resourceName}"</span>{' '}
                            {notif.status === 'approved' ? (
                              <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                Approved ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                Rejected ✕
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">{timeAgo(notif.createdAt)}</p>
                          {notif.response_message && (
                            <div className="mt-2 rounded-md border border-gray-200 bg-gray-100 px-3 py-2">
                              <div className="flex items-start gap-1.5">
                                <MessageCircle size={12} className="mt-0.5 shrink-0 text-gray-500" />
                                <p className="text-xs italic leading-relaxed text-gray-700">"{notif.response_message}"</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal !== null && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white text-left shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Folder Permissions</h3>
              <button onClick={() => setShowPermissionModal(null)} className="p-1 text-gray-400 transition-colors hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-black">Pilih akses yang akan Anda berikan ke pengguna ini:</p>
              <div className="space-y-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={selectedPermissions.can_read} disabled className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">View (Read Only)</p>
                    <p className="text-gray-500">Dapat melihat folder dan isinya.</p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={selectedPermissions.can_download} onChange={(e) => setSelectedPermissions({ ...selectedPermissions, can_download: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Download</p>
                    <p className="text-gray-500">Dapat mengunduh file.</p>
                  </div>
                </label>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Pesan (Opsional)</label>
                <textarea
                  value={approveMessage}
                  onChange={(e) => { if (e.target.value.length <= 500) setApproveMessage(e.target.value); }}
                  placeholder="Contoh: Akses diberikan, silakan gunakan dengan bijak..."
                  rows={3}
                  className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <p className="mt-1 text-right text-xs text-gray-400">{approveMessage.length}/500</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button onClick={() => { setShowPermissionModal(null); setApproveMessage(''); }} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={() => executeApprove(showPermissionModal, selectedPermissions)} className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700">
                {actionLoading === showPermissionModal ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal !== null && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white text-left shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 bg-red-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Tolak Request</h3>
              </div>
              <button onClick={() => { setShowRejectModal(null); setRejectMessage(''); }} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-gray-700">Apakah Anda yakin ingin menolak request ini?</p>
              <textarea
                value={rejectMessage}
                onChange={(e) => { if (e.target.value.length <= 500) setRejectMessage(e.target.value); }}
                placeholder="Contoh: Maaf, request ditolak karena..."
                rows={4}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-1 focus:ring-red-500"
                autoFocus
              />
              <p className="mt-1 text-right text-xs text-gray-400">{rejectMessage.length}/500</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button onClick={() => { setShowRejectModal(null); setRejectMessage(''); }} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Batal</button>
              <button onClick={() => executeReject(showRejectModal)} disabled={actionLoading === showRejectModal} className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50">
                {actionLoading === showRejectModal ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                Tolak Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
