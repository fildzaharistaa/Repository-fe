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

  // Permission Modal state
  const [showPermissionModal, setShowPermissionModal] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState({
    can_read: true,
    can_create: false,
    can_update: false,
    can_delete: false,
    can_download: true,
  });

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
  const handleApproveClick = (notif: IncomingNotif, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notif.resourceType === 'folder') {
      // Buka modal untuk set permission
      setOpen(false); // Tutup notif popup agar modal tidak tertutup otomatis oleh klik luar
      setShowPermissionModal(notif.id);
      setSelectedPermissions({
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
        can_download: true,
      });
    } else {
      // File request, just give read/download access
      executeApprove(notif.id, { can_read: true, can_download: true });
    }
  };

  const executeApprove = async (id: number, permissions: any) => {
    setActionLoading(id);
    try {
      await apiClient.approveAccessRequest(id, permissions);
      // Hapus dari list incoming
      setIncoming(prev => prev.filter(n => n.id !== id));
      setShowPermissionModal(null);
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
                              onClick={(e) => handleApproveClick(notif, e)}
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
                    checked={selectedPermissions.can_create}
                    onChange={(e) => setSelectedPermissions({...selectedPermissions, can_create: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Upload & Create</p>
                    <p className="text-gray-500">Dapat mengunggah file baru dan membuat folder.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.can_update}
                    onChange={(e) => setSelectedPermissions({...selectedPermissions, can_update: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Edit / Update</p>
                    <p className="text-gray-500">Dapat mengubah nama file atau folder.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.can_delete}
                    onChange={(e) => setSelectedPermissions({...selectedPermissions, can_delete: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Delete</p>
                    <p className="text-gray-500">Dapat menghapus file atau folder dari dalam.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowPermissionModal(null)}
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
    </div>
  );
}