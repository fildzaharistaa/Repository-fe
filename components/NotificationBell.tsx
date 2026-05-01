'use client';

import { Bell, Check, X, FolderIcon, FileIcon, Loader2, PersonStandingIcon, MessageCircle, Layers, Trash2, Info } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

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
  resourceName: string;
  resourceType: 'folder' | 'file';
  status: string;
  response_message: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [showExpandedBadge, setShowExpandedBadge] = useState(false);
  const [incoming, setIncoming] = useState<IncomingNotif[]>([]);
  const [updates, setUpdates] = useState<UpdateNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [isFirstFetchDone, setIsFirstFetchDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Ref untuk deteksi notifikasi baru
  const prevIncomingRef = useRef<IncomingNotif[]>([]);
  const prevUpdatesRef = useRef<UpdateNotif[]>([]);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const openRef = useRef(open);
  const hasAutoOpenedOnLoadRef = useRef(false);
  
  // Keep openRef updated
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

  // Fetch notifikasi dari backend
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiClient.getNotifications();
      setIncoming(data.incoming || []);
      setUpdates(data.updates || []);
    } catch {
      // Jika gagal, biarkan kosong
    } finally {
      setLoading(false);
      setIsFirstFetchDone(true);
    }
  }, []);

  // Fetch saat pertama kali mount & polling setiap 5 detik
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refresh saat dropdown dibuka
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Effect untuk pop down notifikasi angka otomatis saat ada notifikasi baru atau pertama kali login
  useEffect(() => {
    if (!isFirstFetchDone) return;

    // Saat pertama kali data ter-fetch setelah login/refresh
    if (!hasAutoOpenedOnLoadRef.current) {
      hasAutoOpenedOnLoadRef.current = true;
      
      prevIncomingRef.current = incoming;
      prevUpdatesRef.current = updates;

      // Jika ada notifikasi saat awal masuk, kita tampilkan secara pop-down selama 5 detik
      if (incoming.length > 0) {
        if (!openRef.current) {
          setShowExpandedBadge(true);
          if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = setTimeout(() => {
            setShowExpandedBadge(false);
            autoCloseTimerRef.current = null;
          }, 5000);
        }
      }
      return;
    }

    // Deteksi apakah ada id baru di incoming/updates
    const newIncoming = incoming.filter(curr => !prevIncomingRef.current.some(prev => prev.id === curr.id));
    const newUpdates = updates.filter(curr => !prevUpdatesRef.current.some(prev => prev.id === curr.id));

    prevIncomingRef.current = incoming;
    prevUpdatesRef.current = updates;

    if (newIncoming.length > 0) {
      if (!openRef.current) {
        setShowExpandedBadge(true);
        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = setTimeout(() => {
          setShowExpandedBadge(false);
          autoCloseTimerRef.current = null;
        }, 5000);
      }
    }
  }, [incoming, updates, isFirstFetchDone]);

  // Approve request
  const handleApproveClick = (notif: IncomingNotif, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notif.resourceType === 'folder') {
      // Buka modal untuk set permission
      setOpen(false);
      setShowPermissionModal(notif.id);
      setApproveMessage('');
      setSelectedPermissions({
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
        can_download: true,
      });
    } else {
      // File request — also open permission modal for response message
      setOpen(false);
      setShowPermissionModal(notif.id);
      setApproveMessage('');
      setSelectedPermissions({
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
        can_download: true,
      });
    }
  };

  const executeApprove = async (id: number, permissions: any) => {
    setActionLoading(id);
    try {
      await apiClient.approveAccessRequest(id, {
        ...permissions,
        response_message: approveMessage.trim() || undefined,
      });
      // Hapus dari list incoming
      setIncoming(prev => prev.filter(n => n.id !== id));
      setShowPermissionModal(null);
      setApproveMessage('');
    } catch {
      // skip
    } finally {
      setActionLoading(null);
    }
  };

  // Reject request — open reject modal
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
    } catch {
      // skip
    } finally {
      setActionLoading(null);
    }
  };

  // Badge count = incoming pending requests
  const badgeCount = incoming.length;

  // Hitung waktu relatif
  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => { setOpen(!open); setShowExpandedBadge(false); }}
        className="text-black relative rounded-full p-2 hover:bg-gray-100"
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

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-white shadow-lg z-50 max-h-96 overflow-y-auto transform transition-all duration-200 origin-top animate-in fade-in slide-in-from-top-4">
          <div className="text-black p-3 text-sm font-semibold border-b">
            Notifications
          </div>

          {loading && incoming.length === 0 && updates.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Memuat...
            </div>
          ) : incoming.length === 0 && updates.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Tidak ada notifikasi
            </div>
          ) : (
            <>
              {/* Incoming: Request masuk (untuk pemilik folder / admin) */}
              {incoming.length > 0 && (
                <div>
                  <div className="text-black p-3 text-sm font-semibold">
                    Access Requests :
                  </div>
                  {incoming.map((notif) => (
                    <div key={`in-${notif.id}`} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
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
                                <span className="font-medium">{notif.requesterName} - {notif.requesterEmail} </span>
                                <br />
                                Request tambah kedalaman folder ke{' '}
                                <span className="font-bold text-orange-600">{notif.requested_depth} level</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
                              {notif.message && (
                                <div className="mt-2 rounded-md bg-orange-50 border border-orange-100 px-3 py-2">
                                  <div className="flex items-start gap-1.5">
                                    <MessageCircle size={12} className="text-orange-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-orange-800 leading-relaxed italic">"{notif.message}"</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setActionLoading(notif.id);
                                    try {
                                      await apiClient.approveHierarchyRequest(notif.id);
                                      setIncoming(prev => prev.filter(n => n.id !== notif.id));
                                    } catch { /* skip */ } finally {
                                      setActionLoading(null);
                                    }
                                  }}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 transition-colors disabled:opacity-50"
                                >
                                  <Check size={12} />
                                  Approve
                                </button>
                                <button
                                  onClick={(e) => handleRejectClick(notif.id, e)}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </div>
                            </>
                          ) : notif.request_type === 'delete_confirmation' ? (
                            <>
                              <p className="text-sm text-gray-900 font-semibold text-red-600">
                                Konfirmasi Penghapusan
                              </p>
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">"{notif.resourceName}"</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
                              <div className="mt-2 rounded-md bg-red-50 border border-red-100 px-3 py-2">
                                <p className="text-xs text-red-800 leading-relaxed italic">"{notif.message}"</p>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setActionLoading(notif.id);
                                    try {
                                      await apiClient.approveAccessRequest(notif.id);
                                      setIncoming(prev => prev.filter(n => n.id !== notif.id));
                                    } catch { /* skip */ } finally {
                                      setActionLoading(null);
                                    }
                                  }}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 transition-colors disabled:opacity-50"
                                >
                                  <Check size={12} />
                                  Setuju
                                </button>
                                <button
                                  onClick={(e) => handleRejectClick(notif.id, e)}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  <X size={12} />
                                  Tolak
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">{notif.requesterName}</span>  
                                <br />
                                {' '} Requested Access to {notif.resourceType}{' '}
                                <br />
                                <span className="font-medium">"{notif.resourceName}"</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>

                              {notif.message && (
                                <div className="mt-2 rounded-md bg-blue-50 border border-blue-100 px-3 py-2">
                                  <div className="flex items-start gap-1.5">
                                    <MessageCircle size={12} className="text-blue-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-blue-800 leading-relaxed italic">"{notif.message}"</p>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={(e) => handleApproveClick(notif, e)}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 transition-colors disabled:opacity-50"
                                >
                                  <Check size={12} />
                                  Approve
                                </button>
                                <button
                                  onClick={(e) => handleRejectClick(notif.id, e)}
                                  disabled={actionLoading === notif.id}
                                  className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  <X size={12} />
                                  Reject
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

              {/* Updates: Status request saya (untuk requester) */}
              {updates.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-50">
                    Request Updates
                  </div>
                  {updates.map((notif) => (
                    <div key={`up-${notif.id}`} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
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
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>

                          {/* Show owner's response message if present */}
                          {notif.response_message && (
                            <div className="mt-2 rounded-md bg-gray-100 border border-gray-200 px-3 py-2">
                              <div className="flex items-start gap-1.5">
                                <MessageCircle size={12} className="text-gray-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-gray-700 leading-relaxed italic">"{notif.response_message}"</p>
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
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden text-left" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Folder Permissions</h3>
              <button 
                onClick={() => setShowPermissionModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-black mb-4">
                Pilih akses (permission) apa saja yang akan Anda berikan ke pengguna ini untuk folder tersebut:
              </p>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.can_read}
                    disabled
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">View (Read Only)</p>
                    <p className="text-gray-500">Dapat melihat folder dan isinya.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.can_download}
                    onChange={(e) => setSelectedPermissions({...selectedPermissions, can_download: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Download</p>
                    <p className="text-gray-500">Dapat mengunduh file.</p>
                  </div>
                </label>
              </div>

              {/* Response message textarea */}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Pesan untuk Peminta Akses (Opsional)</label>
                <textarea
                  value={approveMessage}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setApproveMessage(e.target.value);
                  }}
                  placeholder="Contoh: Akses diberikan, silakan gunakan dengan bijak..."
                  rows={3}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-black focus:outline-hidden resize-none ${
                    approveMessage.length >= 500
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-orange-500 focus:ring-orange-500'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  {approveMessage.length >= 500 && (
                    <p className="text-xs text-red-500 font-medium">Pesan sudah mencapai batas maksimal!</p>
                  )}
                  <p className={`text-xs ml-auto font-medium ${
                    approveMessage.length >= 500 ? 'text-red-500' : approveMessage.length >= 450 ? 'text-amber-500' : 'text-gray-400'
                  }`}>
                    {approveMessage.length}/500
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowPermissionModal(null); setApproveMessage(''); }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => executeApprove(showPermissionModal, selectedPermissions)}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors shadow-sm"
              >
                {actionLoading === showPermissionModal ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal !== null && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden text-left" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 bg-red-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Tolak Request</h3>
              </div>
              <button
                onClick={() => { setShowRejectModal(null); setRejectMessage(''); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">
                Apakah Anda yakin ingin menolak request ini? Anda dapat menyertakan pesan alasan penolakan.
              </p>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Pesan Penolakan (Opsional)</label>
                <textarea
                  value={rejectMessage}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setRejectMessage(e.target.value);
                  }}
                  placeholder="Contoh: Maaf, request ditolak karena..."
                  rows={4}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-black focus:outline-hidden resize-none ${
                    rejectMessage.length >= 500
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                  }`}
                  autoFocus
                />
                <div className="flex justify-between items-center mt-1">
                  {rejectMessage.length >= 500 && (
                    <p className="text-xs text-red-500 font-medium">Pesan sudah mencapai batas maksimal!</p>
                  )}
                  <p className={`text-xs ml-auto font-medium ${
                    rejectMessage.length >= 500 ? 'text-red-500' : rejectMessage.length >= 450 ? 'text-amber-500' : 'text-gray-400'
                  }`}>
                    {rejectMessage.length}/500
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowRejectModal(null); setRejectMessage(''); }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => executeReject(showRejectModal)}
                disabled={actionLoading === showRejectModal}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
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