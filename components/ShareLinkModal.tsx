'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Link2, Copy, Check, RefreshCw, EyeOff, Globe, Building2,
  Eye, Download, Clock, Loader2, AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { ShareLink, ShareItemType, ShareAccessLevel, SharePermission } from '@/types';
import toast from 'react-hot-toast';
import { ConfirmModal } from './ConfirmModal';

interface ShareLinkModalProps {
  open: boolean;
  onClose: () => void;
  itemType: ShareItemType;
  itemId: string;
  itemName: string;
}

function buildShareUrl(token: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/share/${token}`;
}

export function ShareLinkModal({ open, onClose, itemType, itemId, itemName }: ShareLinkModalProps) {
  const [link, setLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Settings state
  const [accessLevel, setAccessLevel] = useState<ShareAccessLevel>('anyone');
  const [permission, setPermission] = useState<SharePermission>('view');
  const [expiry, setExpiry] = useState<'never' | '1d' | '7d' | 'custom'>('never');
  const [customDate, setCustomDate] = useState('');

  const loadExisting = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const existing = await apiClient.getExistingShareLink(itemType, itemId);
      if (existing) {
        setLink(existing);
        setAccessLevel(existing.access_level);
        setPermission(existing.permission);
        if (!existing.expires_at) {
          setExpiry('never');
        } else {
          const d = new Date(existing.expires_at);
          const diffDays = Math.round((d.getTime() - Date.now()) / 86400000);
          if (diffDays <= 1) setExpiry('1d');
          else if (diffDays <= 7) setExpiry('7d');
          else {
            setExpiry('custom');
            setCustomDate(d.toISOString().slice(0, 10));
          }
        }
      } else {
        setLink(null);
        setAccessLevel('anyone');
        setPermission('view');
        setExpiry('never');
        setCustomDate('');
      }
    } catch {
      setLink(null);
    } finally {
      setLoading(false);
    }
  }, [open, itemType, itemId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const computeExpiresAt = (): string | null => {
    if (expiry === 'never') return null;
    if (expiry === '1d') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString();
    }
    if (expiry === '7d') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString();
    }
    if (expiry === 'custom' && customDate) {
      return new Date(customDate + 'T23:59:59').toISOString();
    }
    return null;
  };

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const newLink = await apiClient.generateShareLink({
        type: itemType,
        id: itemId,
        access_level: accessLevel,
        permission,
        expires_at: computeExpiresAt(),
      });
      setLink(newLink);
      toast.success('Share link berhasil dibuat');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat share link');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!link) return handleGenerate();
    setSaving(true);
    try {
      const updated = await apiClient.updateShareLink(link.token, {
        access_level: accessLevel,
        permission,
        expires_at: computeExpiresAt(),
        is_active: true,
      });
      setLink(updated);
      toast.success('Pengaturan share link diperbarui');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui share link');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(buildShareUrl(link.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!link) return;
    setSaving(true);
    try {
      const newLink = await apiClient.regenerateShareLink(link.token);
      setLink(newLink);
      toast.success('Token baru berhasil dibuat');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat token baru');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!link) return;
    setDisabling(true);
    try {
      await apiClient.disableShareLink(link.token);
      setLink(null);
      setShowDisableConfirm(false);
      toast.success('Share link dinonaktifkan');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menonaktifkan share link');
    } finally {
      setDisabling(false);
    }
  };

  const isExpired = link?.expires_at ? new Date(link.expires_at) < new Date() : false;

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
                <Link2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Share Link</h3>
                <p className="text-xs text-gray-500 truncate max-w-[240px]" title={itemName}>{itemName}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Link URL input */}
              {link && !isExpired && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Share URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={buildShareUrl(link.token)}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:outline-none truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  {/* Stats row */}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {link.view_count} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" /> {link.download_count} downloads
                    </span>
                  </div>
                </div>
              )}

              {/* Expired / disabled warning */}
              {link && isExpired && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Link Kadaluarsa</p>
                    <p className="text-xs text-amber-600">Link ini sudah tidak berlaku. Generate link baru untuk melanjutkan.</p>
                  </div>
                </div>
              )}

              {/* Access Level */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Akses
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'anyone', label: 'Anyone with link', icon: Globe, desc: 'Siapa saja bisa akses' },
                    { value: 'organization', label: 'Only within org', icon: Building2, desc: 'Hanya anggota organisasi' },
                  ] as const).map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      onClick={() => setAccessLevel(value)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                        accessLevel === value
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-orange-200'
                      }`}
                    >
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${accessLevel === value ? 'text-orange-600' : 'text-gray-400'}`} />
                      <div>
                        <p className={`text-xs font-semibold ${accessLevel === value ? 'text-orange-700' : 'text-gray-700'}`}>{label}</p>
                        <p className="text-[10px] text-gray-400">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Permission
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'view', label: 'View only', icon: Eye, desc: 'Hanya bisa melihat' },
                    { value: 'download', label: 'View & Download', icon: Download, desc: 'Bisa melihat & unduh' },
                  ] as const).map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      onClick={() => setPermission(value)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                        permission === value
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-orange-200'
                      }`}
                    >
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${permission === value ? 'text-orange-600' : 'text-gray-400'}`} />
                      <div>
                        <p className={`text-xs font-semibold ${permission === value ? 'text-orange-700' : 'text-gray-700'}`}>{label}</p>
                        <p className="text-[10px] text-gray-400">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Berlaku Hingga
                </label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'never', label: 'Tidak Kedaluwarsa' },
                    { value: '1d', label: '1 Hari' },
                    { value: '7d', label: '7 Hari' },
                    { value: 'custom', label: 'Pilih Tanggal' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setExpiry(value)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        expiry === value
                          ? 'border-orange-400 bg-orange-500 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
                {expiry === 'custom' && (
                  <input
                    type="date"
                    value={customDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                {/* Save / Generate */}
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 transition-all"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {link ? 'Simpan Pengaturan' : 'Buat Share Link'}
                </button>

                {link && (
                  <div className="flex gap-2">
                    {/* Regenerate token */}
                    <button
                      onClick={handleRegenerate}
                      disabled={saving}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-all"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Generate New Link
                    </button>

                    {/* Disable link */}
                    <button
                      onClick={() => setShowDisableConfirm(true)}
                      disabled={saving}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition-all"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      Disable Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={showDisableConfirm}
        title="Nonaktifkan Share Link"
        description="Link ini akan dinonaktifkan dan tidak bisa diakses lagi. Apakah Anda yakin?"
        confirmText="Nonaktifkan"
        loading={disabling}
        onConfirm={handleDisable}
        onCancel={() => setShowDisableConfirm(false)}
      />
    </>
  );
}
