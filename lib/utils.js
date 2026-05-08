/**
 * @file Utility helpers
 * Formatting functions for Indonesian locale
 */

/**
 * Format number as Indonesian Rupiah
 * @param {number} nominal
 * @returns {string} e.g. "Rp 1.500.000"
 */
function formatRupiah(nominal) {
  if (nominal == null || isNaN(nominal)) return 'Rp 0';
  return 'Rp ' + Number(nominal).toLocaleString('id-ID');
}

/**
 * Format number with Indonesian thousands separator
 * @param {number} num
 * @returns {string} e.g. "1.500"
 */
function formatAngka(num) {
  if (num == null || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID');
}

/**
 * Format date to Indonesian format
 * @param {string|Date} date
 * @returns {string} e.g. "7 Mei 2025"
 */
function formatTanggal(date) {
  const bulanIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const d = new Date(date);
  return `${d.getDate()} ${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Get Indonesian month name
 * @param {number} bulan - 1-12
 * @returns {string}
 */
function namaBulan(bulan) {
  const bulanIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return bulanIndo[(bulan - 1)] || '';
}

module.exports = { formatRupiah, formatAngka, formatTanggal, namaBulan };
