'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeSlash, ArrowRightToBracket, ExclamationCircle, AngleLeft } from 'flowbite-react-icons/outline';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import AmbientMotionToggle from '@/components/AmbientMotionToggle';
import { useAmbientMotionPreference } from '@/lib/useAmbientMotionPreference';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { motionAllowed } = useAmbientMotionPreference();

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
    if (loading) return;
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
    <div className="min-h-screen flex items-center justify-center relative bg-[#f6f9f6] px-4 pt-24 pb-10">
      <AmbientBackdrop variant="workspace" />
      <div className="absolute right-4 top-4 z-20"><AmbientMotionToggle /></div>

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1 text-sm text-primary-700 hover:text-primary-800 z-20"
      >
        <AngleLeft className="w-4 h-4" /> Beranda
      </Link>

      <motion.div
        initial={motionAllowed ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl grid md:grid-cols-[0.95fr_1fr] gap-7 md:gap-12 items-center"
      >
        <div className="px-2 sm:px-5">
          <p className="text-sm font-semibold text-primary-800 mb-4">Lumbung PKK Desa Belikurip</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-gray-900">Ruang kerja<br />pencatatan PKK.</h2>
          <p className="mt-4 max-w-sm text-sm text-gray-600 leading-relaxed">Masuk dengan akun petugas untuk mengisi data, meninjau kelengkapan, dan menyiapkan laporan sesuai kewenangan.</p>
          <Link href="/publik" className="inline-flex min-h-11 items-center mt-5 text-sm font-semibold text-primary-700 underline focus-visible:ring-2 focus-visible:ring-primary-600">Lihat ringkasan publik</Link>
        </div>
        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 mb-3 rounded-full bg-white/70 shadow-md ring-2 ring-primary-200 flex items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/map-baturetno.svg'; }}
                alt="Logo TP PKK Desa Belikurip"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-lg font-bold text-primary-800">Masuk Aplikasi</h1>
            <p className="text-xs text-gray-500 mt-1">
              Lumbung Data PKK<br />
              Desa Belikurip, Kecamatan Baturetno, Wonogiri
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
            {error && (
              <div id="login-error" role="alert" className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
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
                aria-describedby={error ? 'login-error' : undefined}
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
                  aria-describedby={error ? 'login-error' : undefined}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-full shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div aria-hidden="true" className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full ${motionAllowed ? 'animate-spin' : ''}`} />
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

        <p className="text-center text-[11px] text-gray-500 md:col-span-2">
          © {new Date().getFullYear()} TP PKK Desa Belikurip · Kecamatan Baturetno
        </p>
      </motion.div>
    </div>
  );
}
