'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeSlash, ArrowRightToBracket, ExclamationCircle } from 'flowbite-react-icons/outline';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    } catch (err) {
      setError('Gagal terhubung ke server');
      setLoading(false);
    }
  };

  // Floating circle configs
  const floatingCircles = [
    { size: 320, top: '-8%', right: '-5%', bg: 'bg-primary-200/30', delay: 0, dur: 20 },
    { size: 240, bottom: '-6%', left: '-4%', bg: 'bg-primary-300/25', delay: 2, dur: 25 },
    { size: 180, top: '30%', left: '8%', bg: 'bg-accent-200/20', delay: 4, dur: 22 },
    { size: 140, bottom: '20%', right: '10%', bg: 'bg-primary-100/30', delay: 1, dur: 18 },
    { size: 100, top: '15%', left: '25%', bg: 'bg-teal-200/20', delay: 3, dur: 24 },
    { size: 80, bottom: '35%', right: '25%', bg: 'bg-accent-100/25', delay: 5, dur: 20 },
  ];

  // Random dots positions (deterministic for SSR)
  const dots = [
    { t: '12%', l: '8%' }, { t: '25%', l: '15%' }, { t: '45%', l: '5%' },
    { t: '70%', l: '12%' }, { t: '85%', l: '22%' }, { t: '18%', l: '75%' },
    { t: '35%', l: '85%' }, { t: '55%', l: '90%' }, { t: '75%', l: '78%' },
    { t: '90%', l: '65%' }, { t: '8%', l: '45%' }, { t: '60%', l: '50%' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 30%, #a7f3d0 60%, #ecfdf5 100%)' }}
    >
      {/* Background Image: Peta Batik Baturetno */}
      <div className="absolute inset-0">
        <img 
          src="/bg-baturetno.png" 
          alt="" 
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(236,253,245,0.75) 0%, rgba(209,250,229,0.6) 40%, rgba(167,243,208,0.5) 70%, rgba(236,253,245,0.7) 100%)'
        }} />
      </div>

      {/* Floating Circles with slow drift animation */}
      {floatingCircles.map((c, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${c.bg} blur-3xl`}
          style={{
            width: c.size, height: c.size,
            top: c.top, bottom: c.bottom, left: c.left, right: c.right,
          }}
          animate={{
            y: [0, -30, 0, 25, 0],
            x: [0, 15, 0, -15, 0],
            scale: [1, 1.05, 1, 0.97, 1],
          }}
          transition={{
            duration: c.dur,
            repeat: Infinity,
            delay: c.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Small floating dots */}
      {dots.map((d, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute w-2 h-2 rounded-full bg-primary-400/30"
          style={{ top: d.t, left: d.l }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/85 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-primary-900/10 border border-white/60 p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mx-auto w-20 h-20 mb-4 overflow-hidden rounded-full shadow-lg shadow-primary-300/40 ring-4 ring-primary-100 bg-white flex items-center justify-center"
            >
              <img
                src="/logo.png"
                alt="Logo TP PKK Kecamatan Baturetno"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = '/map-baturetno.svg'; e.currentTarget.classList.replace('object-cover', 'object-contain'); }}
              />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold text-primary-800 font-mono"
            >
              Sistem Rekapitulasi Data
            </motion.h1>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm font-semibold text-primary-700 mt-1"
            >
              TP PKK Kecamatan Baturetno
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-primary-500 mt-0.5"
            >
              Kabupaten Wonogiri • Jawa Tengah
            </motion.p>
          </div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                <ExclamationCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-primary-800 mb-1.5">Nama Pengguna</label>
              <input
                id="username"
                type="text"
                className="w-full px-4 py-3 bg-primary-50/50 border border-primary-200 rounded-xl text-sm text-primary-900 placeholder-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white outline-none transition-all"
                placeholder="Masukkan nama pengguna"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-primary-800 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-12 bg-primary-50/50 border border-primary-200 rounded-xl text-sm text-primary-900 placeholder-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white outline-none transition-all"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 transition-colors p-1"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-700 to-primary-500 hover:from-primary-800 hover:to-primary-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-600/30 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl hover:shadow-primary-600/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-6"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <><ArrowRightToBracket className="w-5 h-5" /> Masuk</>
              )}
            </button>
          </motion.form>

          <div className="text-center mt-6">
            <p className="text-xs text-primary-400 font-medium">Tahun {new Date().getFullYear()}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
