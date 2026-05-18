'use client';

import { useEffect, useState } from 'react';
import { User, Lock, Shield, CheckCircle, ExclamationCircle, Clock } from 'flowbite-react-icons/outline';
import { timeAgo } from '@/lib/time';

const ROLE_LABELS = {
  admin: 'Administrator',
  pokja1: 'Pokja I',
  pokja2: 'Pokja II',
  pokja3: 'Pokja III',
  pokja4: 'Pokja IV',
  user: 'Pengguna',
  dusun_soko: 'Kader Dusun Soko',
  dusun_melikan: 'Kader Dusun Melikan',
  dusun_jamprit_wetan: 'Kader Dusun Jamprit Wetan',
  dusun_jamprit_kulon: 'Kader Dusun Jamprit Kulon',
  dusun_belikurip: 'Kader Dusun Belikurip',
  dusun_pagersari: 'Kader Dusun Pagersari',
  dusun_klerong: 'Kader Dusun Klerong',
  dusun_tanjung: 'Kader Dusun Tanjung',
  dusun_banyuripan: 'Kader Dusun Banyuripan',
};

const ACTION_LABEL = {
  update: 'Update',
  create: 'Create',
  delete: 'Delete',
  import: 'Import',
  period_submit: 'Ajukan periode',
  period_approve: 'Setujui periode',
  period_return: 'Kembalikan periode',
  period_lock: 'Kunci periode',
  period_unlock: 'Buka periode',
};

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) setMe(await res.json());
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    async function loadActivity() {
      try {
        const res = await fetch('/api/auth/me/activity');
        if (res.ok) {
          const data = await res.json();
          setActivity(data.items || []);
        }
      } catch { /* silent */ }
      setActivityLoading(false);
    }
    load();
    loadActivity();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    setFieldErrors({});

    // Client-side validation per field
    const errors = {};
    if (!pwForm.current) errors.current = 'Kata sandi lama harus diisi';
    if (!pwForm.next) errors.next = 'Kata sandi baru harus diisi';
    else if (pwForm.next.length < 6) errors.next = 'Kata sandi baru minimal 6 karakter';
    if (!pwForm.confirm) errors.confirm = 'Konfirmasi kata sandi harus diisi';
    else if (pwForm.next !== pwForm.confirm) errors.confirm = 'Kata sandi baru dan konfirmasi tidak cocok';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: 'success', text: data.message || 'Kata sandi berhasil diubah. Silakan login kembali.' });
        setPwForm({ current: '', next: '', confirm: '' });
      } else {
        setPwMsg({ type: 'error', text: data.error || 'Gagal mengubah kata sandi' });
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Gagal menghubungi server' });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-52 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <User className="w-7 h-7" /> Profil Saya
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Informasi akun dan pengaturan keamanan</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Informasi Akun</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Username</div>
            <div className="text-base font-medium text-gray-800">@{me?.username}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Role</div>
            <div className="text-base font-medium text-gray-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-600" />
              {ROLE_LABELS[me?.role] || me?.role}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs font-semibold text-gray-500 mb-1">Izin Menulis Tabel</div>
            <div className="flex flex-wrap gap-2">
              {me?.permissions?.length > 0 ? (
                me.permissions.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                    <CheckCircle className="w-3 h-3" /> {t}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">Hanya dapat melihat data (tidak ada izin menulis)</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">Login Terakhir</div>
            <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              {me?.lastLoginAt ? timeAgo(me.lastLoginAt) : 'Belum tercatat'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Aktivitas 30 Hari Terakhir</h2>
        {activityLoading ? (
          <div className="text-sm text-gray-400">Memuat...</div>
        ) : activity.length === 0 ? (
          <div className="text-sm text-gray-400">Belum ada aktivitas tercatat.</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono font-semibold uppercase">
                      {ACTION_LABEL[a.action] || a.action}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{a.table_name}</span>
                    {(a.dusun_nama || a.desa_nama) && (
                      <span className="text-xs text-gray-500">• {a.dusun_nama || a.desa_nama}</span>
                    )}
                  </div>
                  {a.detail && <div className="text-xs text-gray-500 mt-0.5 truncate">{a.detail}</div>}
                  <div className="text-[10px] text-gray-400 mt-0.5">{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Ganti Kata Sandi
        </h2>
        {pwMsg && (
          <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
            pwMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {pwMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <ExclamationCircle className="w-4 h-4" />}
            {pwMsg.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          <div>
            <label htmlFor="pw-current" className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Lama</label>
            <input id="pw-current" type="password" autoComplete="current-password"
              value={pwForm.current} onChange={(e) => { setPwForm({ ...pwForm, current: e.target.value }); setFieldErrors(prev => ({ ...prev, current: undefined })); }}
              className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ${fieldErrors.current ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
            {fieldErrors.current && <p className="text-xs text-red-600 mt-1">{fieldErrors.current}</p>}
          </div>
          <div>
            <label htmlFor="pw-next" className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Baru</label>
            <input id="pw-next" type="password" autoComplete="new-password" minLength={6}
              value={pwForm.next} onChange={(e) => { setPwForm({ ...pwForm, next: e.target.value }); setFieldErrors(prev => ({ ...prev, next: undefined })); }}
              className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ${fieldErrors.next ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
            {fieldErrors.next && <p className="text-xs text-red-600 mt-1">{fieldErrors.next}</p>}
          </div>
          <div>
            <label htmlFor="pw-confirm" className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" minLength={6}
              value={pwForm.confirm} onChange={(e) => { setPwForm({ ...pwForm, confirm: e.target.value }); setFieldErrors(prev => ({ ...prev, confirm: undefined })); }}
              className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ${fieldErrors.confirm ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
            {fieldErrors.confirm && <p className="text-xs text-red-600 mt-1">{fieldErrors.confirm}</p>}
          </div>
          <button type="submit" disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
            Simpan Kata Sandi Baru
          </button>
        </form>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800 flex items-start gap-2">
        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Untuk reset password tanpa tahu sandi lama, hubungi administrator.</span>
      </div>
    </div>
  );
}
