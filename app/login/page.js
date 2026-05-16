'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeSlash, ArrowRightToBracket, ExclamationCircle, AngleLeft } from 'flowbite-react-icons/outline';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect kalau sudah login
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!cancelled && res.ok) router.replace('/dashboard');
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan');
        setLoading(false);
        return;
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError('Gagal terhubung ke server');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-primary-50 via-white to-emerald-50 px-4 py-8">
      {/* Subtle bg pattern, tidak pakai motion blob — terlalu berat di mobile */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block" aria-hidden="true">
        <img
          src="/bg-baturetno.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 motion-safe:opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-primary-50/80" />
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1 text-sm text-primary-700 hover:text-primary-800 z-20"
      >
        <AngleLeft className="w-4 h-4" /> Beranda
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 border border-gray-100 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 mb-3 rounded-full bg-white shadow-md ring-2 ring-primary-100 flex items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="Logo TP PKK Kecamatan Baturetno"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-lg font-bold text-gray-800">Masuk Aplikasi</h1>
            <p className="text-xs text-gray-500 mt-1">
              Sistem Rekapitulasi Data TP PKK<br />
              Kecamatan Baturetno, Wonogiri
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                <ExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nama Pengguna
              </label>
              <input
                id="username"
                type="text"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white outline-none transition-colors"
                placeholder="Masukkan nama pengguna"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white outline-none transition-colors"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <><ArrowRightToBracket className="w-5 h-5" /> Masuk</>
              )}
            </button>

            <p className="text-center text-xs text-gray-500 pt-2">
              Lupa password? Hubungi administrator desa atau kecamatan.
            </p>
          </form>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          © {new Date().getFullYear()} TP PKK Kecamatan Baturetno
        </p>
      </motion.div>
    </div>
  );
}
