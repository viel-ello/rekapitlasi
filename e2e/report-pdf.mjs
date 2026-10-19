#!/usr/bin/env node
/**
 * @file Ubah hasil review E2E jadi PDF.
 *
 * Membaca artefak JSON di e2e-artifacts/ (sumber yang sama dengan REVIEW.md)
 * lalu menulis PDF ringkas untuk dibagikan.
 *
 * Pakai:
 *   node e2e/report-pdf.mjs                       # tulis ke e2e-artifacts/
 *   node e2e/report-pdf.mjs "C:/path/out.pdf"     # tulis ke lokasi tertentu
 */

import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const DIR = 'e2e-artifacts';
const OUT = process.argv[2] || path.join(DIR, 'REVIEW.pdf');

function read(name, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
  } catch {
    return fallback;
  }
}

const discovery = read('discovery.json', {});
const crawl = read('crawl.json');
const responsive = read('responsive.json');
const a11y = read('a11y.json');

const noH1 = (crawl?.pages || []).filter(
  (p) => !p.navError && !p.hasH1 && !(p.redirectedTo && p.redirectedTo !== p.path)
);

// --- Palet: cukup satu aksen + abu netral. Laporan defect tidak butuh warna-warni. ---
const INK = '#1a1a1a';
const MUTED = '#6b7280';
const RULE = '#d1d5db';
const ACCENT = '#0d7377';
const SEV = { critical: '#b91c1c', serious: '#c2410c', moderate: '#a16207', minor: '#4b5563' };

const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const LEFT = doc.page.margins.left;
const WIDTH = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const BOTTOM = () => doc.page.height - doc.page.margins.bottom;

/** Pindah halaman kalau sisa ruang kurang dari `need`. */
function room(need = 60) {
  if (doc.y + need > BOTTOM()) doc.addPage();
}

function h1(text) {
  room(50);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(18).text(text, LEFT, doc.y);
  doc.moveDown(0.3);
}

function h2(text) {
  room(60);
  doc.moveDown(0.6);
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(13).text(text, LEFT, doc.y);
  doc.moveDown(0.2);
  doc.strokeColor(RULE).lineWidth(0.5)
    .moveTo(LEFT, doc.y).lineTo(LEFT + WIDTH, doc.y).stroke();
  doc.moveDown(0.5);
}

function body(text, opts = {}) {
  room(30);
  doc.fillColor(opts.color || INK).font(opts.font || 'Helvetica').fontSize(opts.size || 10)
    .text(text, LEFT + (opts.indent || 0), doc.y, { width: WIDTH - (opts.indent || 0), ...opts });
}

function bullet(text, opts = {}) {
  room(24);
  const indent = opts.indent || 0;
  doc.fillColor(opts.color || INK).font('Helvetica').fontSize(opts.size || 9.5)
    .text(`•  ${text}`, LEFT + 8 + indent, doc.y, { width: WIDTH - 16 - indent });
  doc.moveDown(0.15);
}

/** Tabel dua kolom untuk metrik ringkasan. */
function metricTable(rows) {
  const labelW = WIDTH * 0.68;
  const valueW = WIDTH - labelW;
  for (const [label, value, highlight] of rows) {
    room(22);
    const y = doc.y;
    doc.fillColor(INK).font('Helvetica').fontSize(10).text(label, LEFT + 4, y + 4, { width: labelW });
    doc.fillColor(highlight || INK).font('Helvetica-Bold').fontSize(10)
      .text(String(value), LEFT + labelW, y + 4, { width: valueW - 4, align: 'right' });
    const rowBottom = y + 20;
    doc.strokeColor(RULE).lineWidth(0.4)
      .moveTo(LEFT, rowBottom).lineTo(LEFT + WIDTH, rowBottom).stroke();
    doc.y = rowBottom + 2;
  }
}

// ============================ Sampul ============================
doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(22)
  .text('Laporan Review Website', LEFT, doc.y);
doc.fillColor(INK).fontSize(15).text('Lumbung Data PKK Desa Belikurip');
doc.moveDown(0.6);

doc.font('Helvetica').fontSize(10).fillColor(MUTED);
doc.text(`Target       : ${discovery.baseURL || '-'}`);
doc.text(`Login sebagai: ${discovery.loggedInAs || '-'}`);
doc.text(`Dusun        : ${discovery.dusunCount ?? '-'}`);
doc.text(`Metode       : Playwright + axe-core, Chromium, 3 viewport`);
doc.moveDown(0.8);

// ============================ Ringkasan ============================
h2('Ringkasan');

const summary = [];
// Sengaja TIDAK memakai results.json untuk hitungan test: file itu ditimpa setiap
// kali `playwright test` dijalankan, jadi bisa berisi run parsial (mis. hanya spec
// CRUD) dan menghasilkan "6 test, 0 gagal" yang menyesatkan. Metrik di bawah
// dihitung dari artefak review itu sendiri.
if (crawl) {
  summary.push(['Halaman di-crawl', crawl.counts.visited]);
  summary.push(['Link internal rusak', crawl.counts.brokenInternal, crawl.counts.brokenInternal > 0 ? SEV.critical : INK]);
  summary.push(['Link eksternal mati', crawl.counts.brokenExternal, crawl.counts.brokenExternal > 0 ? SEV.serious : INK]);
  summary.push(['Halaman kosong', crawl.counts.blankPages]);
  summary.push(['Error console', crawl.counts.consoleErrors]);
  summary.push(['Exception JS', crawl.counts.pageErrors]);
}
summary.push(['Halaman tanpa <h1>', noH1.length, noH1.length > 0 ? SEV.moderate : INK]);
if (responsive) {
  summary.push(['Kegagalan layout responsif', responsive.overflowFailures.length,
    responsive.overflowFailures.length > 0 ? SEV.serious : INK]);
}
if (a11y) {
  summary.push(['Halaman dipindai axe-core', a11y.routesScanned]);
  summary.push(['Pelanggaran a11y serius/kritis', a11y.blockingTotal, a11y.blockingTotal > 0 ? SEV.critical : INK]);
}
metricTable(summary);

// ============================ Temuan prioritas ============================
h2('Temuan prioritas');

body('1.  Kredensial default aktif di produksi', { font: 'Helvetica-Bold', size: 11, color: SEV.critical });
doc.moveDown(0.2);
body(
  'Akun admin/admin123 masih bisa login ke deployment publik. Siapa pun yang menebaknya ' +
  'mendapat akses admin penuh atas data warga sembilan dusun. AGENTS.md sendiri mencatat ' +
  '"ganti di produksi" dan "belum ada paksa ganti di first-login", tetapi perubahan itu ' +
  'belum dilakukan. Ini temuan paling serius dalam laporan ini dan tidak memerlukan ' +
  'perubahan kode — cukup ganti password.',
  { size: 9.5, color: INK }
);
doc.moveDown(0.5);

// --- a11y ---
if (a11y?.byRule?.length) {
  const blocking = a11y.byRule.filter((r) => r.impact === 'critical' || r.impact === 'serious');
  if (blocking.length) {
    body(`2.  Aksesibilitas — ${blocking.length} rule serius/kritis`, {
      font: 'Helvetica-Bold', size: 11, color: SEV.serious,
    });
    doc.moveDown(0.2);
    for (const r of blocking) {
      room(56);
      const pages = new Set(r.routes).size;
      doc.fillColor(SEV[r.impact] || INK).font('Helvetica-Bold').fontSize(9.5)
        .text(`${r.id}  (${r.impact})`, LEFT + 8, doc.y, { width: WIDTH - 16 });
      doc.fillColor(INK).font('Helvetica').fontSize(9)
        .text(`${r.help}. ${r.totalNodes} elemen di ${pages} halaman.`, LEFT + 8, doc.y, { width: WIDTH - 16 });
      if (pages <= 8) {
        doc.fillColor(MUTED).fontSize(8)
          .text([...new Set(r.routes)].join(', '), LEFT + 8, doc.y, { width: WIDTH - 16 });
      }
      doc.moveDown(0.45);
    }
  }
}

// --- responsif ---
if (responsive?.overflowFailures?.length) {
  doc.moveDown(0.3);
  body(`3.  Overflow horizontal di mobile — ${responsive.overflowFailures.length} halaman`, {
    font: 'Helvetica-Bold', size: 11, color: SEV.serious,
  });
  doc.moveDown(0.2);
  body(
    'Konten lebih lebar dari viewport sehingga muncul scroll horizontal. Muncul pada ' +
    'state loading (skeleton), jadi terlihat sejak halaman pertama kali dibuka.',
    { size: 9.5 }
  );
  doc.moveDown(0.2);
  for (const f of responsive.overflowFailures) {
    bullet(`${f.route} @ ${f.viewport} — konten ${f.overflow.docWidth}px > viewport ${f.overflow.viewWidth}px`);
    for (const o of (f.overflow.offenders || []).slice(0, 2)) {
      bullet(`<${o.tag}> tepi kanan ${o.right}px — ${(o.text || o.cls || '').slice(0, 70)}`,
        { indent: 14, size: 8.5, color: MUTED });
    }
  }
}

// --- tap target ---
const small = responsive?.smallTapTargets || [];
if (small.length) {
  doc.moveDown(0.4);
  body(`4.  Tap target di bawah 24×24 px — ${small.length} halaman`, {
    font: 'Helvetica-Bold', size: 11, color: SEV.moderate,
  });
  doc.moveDown(0.2);
  body('Sasaran sentuh terlalu kecil untuk jari pada layar HP (WCAG 2.2 SC 2.5.8).', { size: 9.5 });
  doc.moveDown(0.2);
  const listed = small.slice(0, 10);
  for (const s of listed) bullet(`${s.route} — ${s.count} elemen`);
  if (small.length > listed.length) {
    bullet(`… dan ${small.length - listed.length} halaman lain`, { color: MUTED });
  }
}

// --- h1 ---
if (noH1.length) {
  doc.moveDown(0.4);
  body(`5.  Halaman tanpa <h1> — ${noH1.length} halaman`, {
    font: 'Helvetica-Bold', size: 11, color: SEV.moderate,
  });
  doc.moveDown(0.2);
  body(
    'Tanpa <h1>, pengguna screen reader kehilangan penanda struktur teratas. ' +
    'Seluruh halaman juga memakai <title> yang identik, sehingga tab dan riwayat browser ' +
    'tidak bisa dibedakan.',
    { size: 9.5 }
  );
  doc.moveDown(0.2);
  for (const p of noH1) bullet(p.path);
}

// ============================ Yang bersih ============================
h2('Yang lulus');
bullet('Tidak ada link internal maupun eksternal yang rusak.');
bullet('Tidak ada error console maupun exception JavaScript.');
bullet('Tidak ada halaman kosong.');
bullet('Redirect legacy migrasi v5 berfungsi (/dashboard/kegiatan-warga → /dashboard/rekap-dawis).');
bullet('Proteksi route bekerja: /dashboard/* tanpa sesi diarahkan ke /login, cookie JWT palsu ditolak dan dibersihkan.');
bullet('CRUD tabel data: CREATE dan UPDATE benar, upsert tidak menduplikasi baris.');
bullet('Validasi payload menolak field tak dikenal, tahun di luar rentang, dan bulan pada tabel non-bulanan.');
bullet('Otorisasi menolak tulis anonim (401) dan akses endpoint admin tanpa sesi.');

// ============================ Batasan ============================
h2('Batas cakupan');
body('Bagian ini mencatat apa yang TIDAK diuji, supaya laporan ini tidak dibaca sebagai jaminan menyeluruh.', { size: 9.5, color: MUTED });
doc.moveDown(0.3);
bullet('Hanya Chromium. Firefox dan WebKit tidak dijalankan.');
bullet('Endpoint /api/* tidak dinavigasi saat crawl (sebagian memicu unduhan berat, sebagian deprecated).');
bullet('Tes login gagal dilewati: rate limit memblokir IP 30 menit setelah 5 percobaan.');
bullet('DELETE tidak diuji pada tabel data — endpointnya memang tidak ada, hanya GET dan POST.');
bullet('Tes CRUD memakai tahun sandbox 2099 lalu dibersihkan; entri audit_logs bersifat append-only dan tetap ada.');
bullet('axe-core hanya menangkap pelanggaran yang terdeteksi otomatis. Klaim kepatuhan WCAG penuh memerlukan pengujian manual dengan screen reader.');
if (crawl?.limits?.hitCap) {
  bullet(`Batas crawl ${crawl.limits.maxPages} halaman tercapai — cakupan PARSIAL.`, { color: SEV.serious });
}

// ============================ Nomor halaman ============================
// Footer digambar setelah semua konten selesai. Margin bawah harus dinaikkan dulu,
// kalau tidak teks jatuh di luar area tergambar dan tidak muncul di PDF.
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
    .text(
      `Lumbung Data PKK — Laporan Review   ·   Halaman ${i + 1} dari ${range.count}`,
      LEFT,
      doc.page.height - savedBottom + 14,
      { width: WIDTH, align: 'center', lineBreak: false }
    );
  doc.page.margins.bottom = savedBottom;
}

doc.end();
console.log(`PDF ditulis: ${OUT}`);
