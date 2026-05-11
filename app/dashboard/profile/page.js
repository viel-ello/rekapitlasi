'use client';

import { useEffect, useState } from 'react';
import { User, Lock, Shield, CheckCircle, ExclamationCircle, Clock } from 'flowbite-react-icons/outline';

const ROLE_LABELS = {
  admin: 'Administrator',
  pokja1: 'Pokja I',
  pokja2: 'Pokja II',
  pokja3: 'Pokja III',
  pokja4: 'Pokja IV',
  sekretaris: 'Sekretaris',
  user: 'Pengguna',
};

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'Kata sandi baru dan konfirmasi tidak cocok' });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ type: 'error', text: 'Kata sandi baru minimal 6 karakter' });
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
        setPwMsg({ type: 'success', text: 'Kata sandi berhasil diubah' });
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
        </div>
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
            <input id="pw-current" type="password" autoComplete="current-password" required
              value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
          </div>
          <div>
            <label htmlFor="pw-next" className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Baru</label>
            <input id="pw-next" type="password" autoComplete="new-password" required minLength={6}
              value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
          </div>
          <div>
            <label htmlFor="pw-confirm" className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" required minLength={6}
              value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
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
