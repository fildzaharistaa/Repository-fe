'use client';

import { Bell, Check, X, FolderIcon, FileIcon, Loader2, PersonStandingIcon } from 'lucide-react';
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
  createdAt: string;
};

type UpdateNotif = {
  id: number;
  type: 'update';
  resourceName: string;
  resourceType: 'folder' | 'file';
  status: string;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [incoming, setIncoming] = useState<IncomingNotif[]>([]);
  const [updates, setUpdates] = useState<UpdateNotif[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notifikasi dari backend
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getNotifications();
      setIncoming(data.incoming || []);
      setUpdates(data.updates || []);
    } catch {
      // Jika gagal, biarkan kosong
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch saat pertama kali mount & polling setiap 30 detik
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
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

  // Approve request
  const handleApprove = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id);
    try {
      await apiClient.approveAccessRequest(id, { can_read: true });
      // Hapus dari list incoming
      setIncoming(prev => prev.filter(n => n.id !== id));
    } catch {
      // skip
    } finally {
      setActionLoading(null);
    }
  };

  // Reject request
  const handleReject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id);
    try {
      await apiClient.rejectAccessRequest(id);
      setIncoming(prev => prev.filter(n => n.id !== id));
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
        onClick={() => setOpen(!open)}
        className="text-black relative rounded-full p-2 hover:bg-gray-100"
      >
        <Bell size={20} />

        {badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-white shadow-lg z-50 max-h-96 overflow-y-auto">
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
                          {notif.resourceType === 'folder' ? (
                            <FolderIcon size={16} className="text-yellow-500" />
                          ) : (
                            <FileIcon size={16} className="text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{notif.requesterName}</span>  
                            <br />
                            {' '} Requested Access to {notif.resourceType}{' '}
                            <br />
                            <span className="font-medium">"{notif.resourceName}"</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>

                          {/* Tombol Approve / Reject */}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={(e) => handleApprove(notif.id, e)}
                              disabled={actionLoading === notif.id}
                              className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              <Check size={12} />
                              Approve
                            </button>
                            <button
                              onClick={(e) => handleReject(notif.id, e)}
                              disabled={actionLoading === notif.id}
                              className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <X size={12} />
                              Reject
                            </button>
                          </div>
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
    </div>
  );
}