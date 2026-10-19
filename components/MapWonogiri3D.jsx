'use client';

import { useState } from 'react';

/**
 * MapWonogiri3D — menampilkan peta Kabupaten Wonogiri (gambar di
 * public/peta-wonogiri.png) dengan kemiringan 3D (perspective + rotateX),
 * efek glass, dan penanda berdenyut di Kecamatan Baturetno (fokus aplikasi).
 *
 * Pakai aset gambar lokal — jalan offline, tanpa dependency peta eksternal.
 * Jika gambar belum disimpan, tampilkan fallback yang informatif.
 *
 * Posisi pin Baturetno (markerX/markerY) dinyatakan dalam persen relatif
 * terhadap gambar; sesuaikan bila peta yang dipakai berbeda.
 */
export default function MapWonogiri3D({
  src = '/map-baturetno.svg',
  markerX = 48,   // % dari kiri — perkiraan letak Belikurip/Baturetno
  markerY = 54,   // % dari atas
  className = '',
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative select-none ${className}`} role="img" aria-label="Peta Kabupaten Wonogiri — Kecamatan Baturetno disorot">
      {failed ? (
        <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 p-8 min-h-[240px]">
          <span className="text-3xl mb-2">🗺️</span>
          <p className="text-sm font-semibold text-primary-800">Peta Wonogiri belum tersedia</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            Simpan gambar peta sebagai <code className="px-1 py-0.5 bg-white rounded text-primary-700">public/peta-wonogiri.png</code> untuk menampilkannya di sini.
          </p>
        </div>
      ) : (
        <div style={{ perspective: '1100px' }}>
          <div
            className="relative"
            style={{
              transform: 'rotateX(46deg) rotateZ(-4deg)',
              transformStyle: 'preserve-3d',
              transformOrigin: 'center 60%',
              filter: 'drop-shadow(0 26px 30px rgba(4,120,87,0.35))',
            }}
          >
            <img
              src={src}
              alt="Peta Kabupaten Wonogiri"
              className="w-full h-auto rounded-xl"
              onError={() => setFailed(true)}
            />

            {/* Penanda Baturetno (berdenyut) */}
            <div
              className="absolute"
              style={{ left: `${markerX}%`, top: `${markerY}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white shadow" />
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 text-center text-[11px] text-gray-400">
        Kabupaten Wonogiri · <span className="font-semibold text-primary-700">Kecamatan Baturetno</span> disorot
      </div>
    </div>
  );
}
