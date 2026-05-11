/**
 * Kecil banget — formatter relative time dalam Bahasa Indonesia.
 * Pakai di dashboard supaya "Aktivitas terakhir" lebih informatif.
 */
export function timeAgo(iso) {
  if (!iso) return 'Belum ada aktivitas';
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '-';
  const diffMs = now - then;
  if (diffMs < 0) return 'baru saja';
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} minggu lalu`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} bulan lalu`;
  const y = Math.floor(d / 365);
  return `${y} tahun lalu`;
}
