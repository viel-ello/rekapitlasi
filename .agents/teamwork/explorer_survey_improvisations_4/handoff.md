# LAPORAN INVESTIGASI & CETAK BIRU FITUR UNGGULAN (R5)
## High-Impact Features Specialist Explorer — `explorer_survey_improvisations_4`

**Tanggal**: 2026-10-22  
**Target Milestone**: R5 — Penggabungan Fitur Improvisasi (Smart Data Quality Auditor, Liquid Glass Completeness Heatmap 9 Dusun × 12 Bulan, dan Portal Publik 2.0)  
**Status Investigasi**: Selesai (Read-Only Analysis & Architectural Blueprint)  
**Integritas Baseline**: 31 Test Suites Lulus (268 tests passing)

---

## 1. Observation

### 1.1 Kondisi Eksisting Validasi Kualitas Data (`lib/dataQuality.js` & `lib/validation.js`)
Pemeriksaan langsung pada `lib/dataQuality.js` (baris 59–91) dan `lib/validation.js` (baris 18–47) mengungkapkan:
1. **Lingkup Validasi Saat Ini Hanya Single-Row & Single-Cell**:
   - `evaluateRecordCompleteness(row, keys, previousRow)` hanya memeriksa apakah kolom dalam satu baris terisi (`hasAnyFilledValue`), apakah angka bernilai negatif (`num < 0`), atau apakah terjadi lonjakan nilai tahun-ke-tahun > 3x (`num > prevNum * 3`).
   - Tidak ada fungsi pembanding relasional antar kolom pada tabel yang sama (misal `jml_jiwa` vs `jml_kk`).
   - **Sama sekali belum ada validasi konsistensi logis lintas-tabel (cross-table consistency)**.
2. **Katalog Tabel Operasional (`lib/dataQuality.js:21-31`)**:
   - Tabel aktif yang dipantau meliputi: `data_umum`, `data_pokja1`, `data_pokja2`, `data_pokja3`, `data_pokja4`, `data_rekap_dawis`, dan `data_bumil`.
   - Dari 7 tabel tersebut, tabel bulanan aktif adalah: `data_umum` (bulanan sejak v12), `data_rekap_dawis` (bulanan sejak v10), dan `data_bumil` (bulanan). Pokja I–IV bersifat tahunan.

### 1.2 Kondisi Skema Kolom Terkait Aturan Konsistensi
1. **Aturan (a) Balita Pokja IV vs Rekap Dawis**:
   - Berdasarkan `lib/dataPages.js` (baris 368–369) dan `lib/excel/sheetMap.js` (baris 18), `data_rekap_dawis` memiliki kolom `balita_l` dan `balita_p`.
   - Namun, pada `data_pokja4` (`lib/dataPages.js:290-315`), kolom yang tercatat adalah: `kader_posyandu`, `kader_gizi`, `kader_kesling`, `kader_penyuluh_narkoba`, `kader_phbs`, `kader_kb`, `posyandu_jumlah`, `posyandu_terintegrasi`, `lansia_jml_klp`, `lansia_jml_anggota`, `lansia_jml_kartu_berobat`, sanitasi jamban/SPAL/air, dan KB/PUS.
   - Kolom `jml_balita` tidak ada secara bawaan di skema SQL standar `data_pokja4`. Kolom balita lainnya yang tercatat adalah `balita_meninggal_l` dan `balita_meninggal_p` di `data_bumil` (baris 460–461).
   - *Implikasi*: Pemeriksa balita harus mendukung `pokja4.jml_balita` jika diisi lewat `custom_columns` JSONB atau kolom dinamis, sekaligus memverifikasi relasi logis:
     * `dawis.balita_l + dawis.balita_p` vs `bumil.balita_meninggal_l + bumil.balita_meninggal_p` (kematian balita tidak boleh melebihi populasi balita).
     * `pokja4.posyandu_jumlah > 0` vs total balita Dawis = 0 (anomali posyandu tanpa balita).
2. **Aturan (b) KK vs Jiwa di Data Umum**:
   - `data_umum` (`lib/dataPages.js:25-45`) memiliki kolom `jml_kk`, `jml_jiwa_l`, dan `jml_jiwa_p`.
   - Saat ini tidak ada penjaga logika yang menolak atau memberi peringatan jika `jml_jiwa_l + jml_jiwa_p < jml_kk`. Padahal, secara demografis 1 KK minimal berisi 1 jiwa. Jika 100 KK dilaporkan hanya memiliki 50 jiwa, ini merupakan anomali data kritis.
   - Selain itu, `data_rekap_dawis` juga mencatat `jml_kk` (baris 365). Tidak ada sinkronisasi verifikasi apakah `data_umum.jml_kk === data_rekap_dawis.jml_kk`.
3. **Aturan (c) Bumil Risti vs Pendampingan di Data Bumil**:
   - `data_bumil` (`lib/dataPages.js:442-464`) mencatat `ibu_hamil`, `ibu_melahirkan`, `ibu_nifas`, `ibu_meninggal`, `bayi_lahir_*`, `akte_*`, dan `balita_meninggal_*`.
   - Di lapangan, pelaporan "Bumil Risti" (risiko tinggi) dan "Pendampingan" sering dicatat di kolom `keterangan` atau disimpan pada kolom JSONB `custom_columns` (`table_schemas`).
   - Selain itu, `data_rekap_dawis` memiliki kolom `ibu_hamil`. Saat ini tidak ada audit apakah angka `ibu_hamil` di Data Bumil sinkron dengan `ibu_hamil` di Rekap Dawis.

### 1.3 Kondisi Dashboard Operasional (`app/dashboard/page.js`)
1. Baris 362–364 memanggil `<TodoTodayPanel completeness={rekap?.completeness} />`.
2. Baris 514–581 menampilkan tabel sederhana "Matrix Kelengkapan Data" yang hanya menampilkan 1 bulan yang sedang dipilih (parameter `bulan`), bukan sebaran 12 bulan sepanjang tahun berjalan.
3. Tidak ada visualisasi heatmap 9 Dusun × 12 Bulan yang memperlihatkan tren kepatuhan pelaporan bulanan kader.

### 1.4 Kondisi Portal Publik (`app/publik/page.js`)
1. Halaman publik saat ini mengonsumsi `/api/public/summary?tahun=...&bulan=...` (`lib/publicRepository.js`).
2. Menampilkan 4 KPI agregat desa, narasi ringkas statis, 1 horizontal bar chart KK per dusun, 8 indikator agregat, tabel daftar dusun dengan link ke `/publik/dusun/[id]`, dan definisi istilah.
3. **Kekurangan**:
   - Belum memiliki infografis interaktif pencapaian per dusun ("Kilas 9 Dusun").
   - Belum memiliki fitur komparasi berdampingan (*Dusun Benchmark Matrix*) untuk membandingkan 2–3 dusun.
   - Belum ada kartu laporan ringkas (*Shareable Report Card*) yang diformat estetik dan siap dibagikan ke WhatsApp warga/kader.

### 1.5 Kepatuhan Aturan Pengecualian (Excluded Features Guard)
Repositori diperiksa secara saksama terhadap 6 fitur terlarang:
- Tidak ada penambahan rate limiter AI pada `/api/chat`.
- Tidak ada modul peta geospasial choropleth (peta visual 3D yang ada di `components/MapWonogiri3D.jsx` tetap tidak diubah/tidak diutak-atik).
- Tidak ada modul blast/pengingat WhatsApp otomatis dari server (hanya tombol share sisi klien `whatsapp://send` / `api.whatsapp.com` pada infografis publik).
- Tidak ada modul sistem peringatan dini (early warning).
- Tidak ada generator narasi laporan tahunan AI.
- Tidak ada penambahan blok tanda tangan resmi pada berkas ekspor.

---

## 2. Logic Chain

```
[Kebutuhan R5: Kualitas Data, Heatmap, & Portal Publik 2.0]
   │
   ├─► 1. Auditor Kualitas Data Lintas-Tabel
   │      │
   │      ├─► Observasi: Data PKK tersebar di 7 tabel operasional yang diisi oleh pokja & kader berbeda.
   │      ├─► Masalah: Inkonsistensi data (misal: Balita Dawis != Pokja IV, Jiwa < KK, Bumil Risti != Pendampingan).
   │      ├─► Solusi: Modul pure-function `auditCrossTableConsistency()` di `lib/dataQuality.js` + 
   │      │          Komponen UI `DataQualityAuditor.jsx` bergaya VisionOS Translucent Liquid Glass di Dashboard.
   │      └─► Aksi Cepat: Deep-link navigasi langsung ke halaman edit tabel sumber dengan query params.
   │
   ├─► 2. Liquid Glass Completeness Heatmap (9 Dusun × 12 Bulan)
   │      │
   │      ├─► Observasi: Tabel matriks saat ini hanya menampilkan 1 bulan tunggal; kader sulit melihat bulan mana yang tertinggal.
   │      ├─► Solusi: Komponen visual matriks 9 Dusun × 12 Bulan dengan 3 status warna semantik:
   │      │          • Lengkap (Emerald, #10b981)
   │      │          • Sebagian (Amber, #f59e0b)
   │      │          • Kosong (Slate/Rose, #ef4444)
   │      └─► UX: Framer Motion staggered entrance, tooltip interaktif rincian tabel per bulan, klik untuk lompat ke periode.
   │
   └─► 3. Portal Publik 2.0
          │
          ├─► Observasi: Warga dan stakeholder membutuhkan akses informasi capaian dusun yang transparan dan mudah dibagikan.
          ├─► Komponen 1: `KilasDusunInfographic.jsx` (kartu capaian visual 9 dusun, mobile responsive).
          ├─► Komponen 2: `DusunBenchmarkMatrix.jsx` (komparasi side-by-side 2–3 dusun terpilih).
          └─► Komponen 3: `ShareableReportCard.jsx` (kartu estetik dengan tombol 1-klik "Salin Teks WhatsApp" & "Bagikan").
```

---

## 3. Desain Arsitektur & Spesifikasi Detail Komponen

### 3.1 Sub-Sistem 1: Cross-Table Data Quality Auditor

#### A. Spesifikasi Aturan Logika di `lib/dataQuality.js`
Tambahkan modul pemeriksa lintas-tabel murni (pure function, bebas efek samping, mudah diuji via unit test):

```javascript
/**
 * @typedef {Object} CrossTableAuditIssue
 * @property {string} id - Pengenal unik issue (misal 'KK_JIWA_SOKO_2026_10')
 * @property {number} dusunId
 * @property {string} dusunNama
 * @property {'error'|'warning'|'info'} severity
 * @property {string} code - Kode aturan (misal 'KK_EXCEEDS_JIWA', 'BALITA_MISMATCH', etc.)
 * @property {string} title - Judul singkat
 * @property {string} description - Penjelasan rinci masalah
 * @property {string} sourceTable - Tabel sumber data bermasalah
 * @property {string} targetTable - Tabel pembanding
 * @property {string} editHref - URL langsung ke formulir edit
 * @property {Object} metrics - Nilai angka yang bertentangan
 */

export function auditCrossTableConsistency({
  dusunId,
  dusunNama,
  tahun,
  bulan = 12,
  dataUmum = {},
  pokja1 = {},
  pokja2 = {},
  pokja3 = {},
  pokja4 = {},
  dawis = {},
  bumil = {},
}) {
  const issues = [];
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ──────────────────────────────────────────────────────────
  // RULE 1: KK vs Jiwa di Data Umum & Konsistensi KK Lintas Tabel
  // ──────────────────────────────────────────────────────────
  const kkUmum = num(dataUmum.jml_kk);
  const jiwaL = num(dataUmum.jml_jiwa_l);
  const jiwaP = num(dataUmum.jml_jiwa_p);
  const totalJiwa = jiwaL + jiwaP;
  const krtUmum = num(dataUmum.jml_krt);
  const kkDawis = num(dawis.jml_kk);

  // 1a. Populasi Jiwa lebih kecil dari jumlah KK (Mustahil secara demografis)
  if (kkUmum > 0 && totalJiwa > 0 && totalJiwa < kkUmum) {
    issues.push({
      id: `KK_JIWA_ANOMALY_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'error',
      code: 'KK_EXCEEDS_JIWA',
      title: 'Jumlah Jiwa Lebih Kecil Dari KK',
      description: `Dusun ${dusunNama} mencatat ${kkUmum} KK tetapi hanya memiliki ${totalJiwa} jiwa (${jiwaL} L, ${jiwaP} P). Secara demografis, 1 KK minimal berisi 1 jiwa.`,
      sourceTable: 'data_umum',
      targetTable: 'data_umum',
      editHref: `/dashboard/data-umum/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { kk: kkUmum, jiwa: totalJiwa },
    });
  }

  // 1b. KK ada tapi Jiwa bernilai 0
  if (kkUmum > 0 && totalJiwa === 0) {
    issues.push({
      id: `KK_NO_JIWA_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'error',
      code: 'KK_WITHOUT_POPULATION',
      title: 'KK Tercatat Tanpa Jumlah Jiwa',
      description: `Terdapat ${kkUmum} KK di Dusun ${dusunNama}, tetapi kolom Jiwa (L) dan Jiwa (P) masih bernilai 0.`,
      sourceTable: 'data_umum',
      targetTable: 'data_umum',
      editHref: `/dashboard/data-umum/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { kk: kkUmum, jiwa: 0 },
    });
  }

  // 1c. Selisih KK Data Umum vs Rekap Dawis
  if (kkUmum > 0 && kkDawis > 0 && Math.abs(kkUmum - kkDawis) > 0) {
    const diff = Math.abs(kkUmum - kkDawis);
    issues.push({
      id: `KK_DAWIS_DIFF_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: diff > 5 ? 'warning' : 'info',
      code: 'CROSS_KK_DISCREPANCY',
      title: 'Selisih Jumlah KK (Data Umum vs Dawis)',
      description: `Jumlah KK di Data Umum (${kkUmum}) tidak sinkron dengan Rekapitulasi Dawis (${kkDawis}). Terdapat selisih ${diff} KK.`,
      sourceTable: 'data_umum',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/rekap-dawis/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { kkUmum, kkDawis, diff },
    });
  }

  // 1d. KRT melebihi KK
  if (krtUmum > 0 && kkUmum > 0 && krtUmum > kkUmum) {
    issues.push({
      id: `KRT_EXCEEDS_KK_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'KRT_EXCEEDS_KK',
      title: 'Kepala Rumah Tangga Melebihi KK',
      description: `Jumlah KRT (${krtUmum}) tercatat melebihi jumlah KK (${kkUmum}) di Dusun ${dusunNama}.`,
      sourceTable: 'data_umum',
      targetTable: 'data_umum',
      editHref: `/dashboard/data-umum/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { krt: krtUmum, kk: kkUmum },
    });
  }

  // ──────────────────────────────────────────────────────────
  // RULE 2: Balita Pokja IV vs Rekap Dawis & Kematian Balita
  // ──────────────────────────────────────────────────────────
  const balitaDawis = num(dawis.balita_l) + num(dawis.balita_p);
  const balitaMeninggal = num(bumil.balita_meninggal_l) + num(bumil.balita_meninggal_p);
  const posyanduJml = num(pokja4.posyandu_jumlah);
  const balitaPokja4 = num(pokja4.jml_balita ?? pokja4.custom_columns?.jml_balita);

  // 2a. Jika Pokja IV memiliki kolom jml_balita (misal via custom column)
  if ((pokja4.jml_balita != null || pokja4.custom_columns?.jml_balita != null) && balitaPokja4 !== balitaDawis) {
    issues.push({
      id: `BALITA_POKJA4_DAWIS_${dusunId}_${tahun}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'BALITA_COUNT_MISMATCH',
      title: 'Perbedaan Jumlah Balita (Pokja IV vs Dawis)',
      description: `Pokja IV mencatat ${balitaPokja4} balita, sedangkan Rekap Dawis mencatat ${balitaDawis} balita (${num(dawis.balita_l)} L, ${num(dawis.balita_p)} P).`,
      sourceTable: 'data_pokja4',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/pokja4/edit?dusun_id=${dusunId}&tahun=${tahun}`,
      metrics: { balitaPokja4, balitaDawis },
    });
  }

  // 2b. Posyandu Aktif di Pokja IV tapi Balita di Dawis 0
  if (posyanduJml > 0 && balitaDawis === 0 && (num(dawis.jml_kk) > 0 || num(dawis.jml_dawis) > 0)) {
    issues.push({
      id: `POSYANDU_NO_BALITA_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'POSYANDU_ACTIVE_NO_BALITA',
      title: 'Posyandu Aktif Tanpa Data Balita di Dawis',
      description: `Pokja IV mencatat ${posyanduJml} unit Posyandu aktif, namun Rekap Dawis mencatat 0 balita pada periode ini.`,
      sourceTable: 'data_pokja4',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/rekap-dawis/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { posyandu: posyanduJml, balitaDawis },
    });
  }

  // 2c. Kematian Balita Melebihi Populasi Balita
  if (balitaMeninggal > 0 && balitaDawis > 0 && balitaMeninggal > balitaDawis) {
    issues.push({
      id: `BALITA_DEATH_EXCEEDS_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'error',
      code: 'BALITA_DEATH_EXCEEDS_TOTAL',
      title: 'Kematian Balita Melebihi Total Balita',
      description: `Data Bumil mencatat ${balitaMeninggal} kematian balita, melebihi jumlah balita hidup yang tercatat di Dawis (${balitaDawis}).`,
      sourceTable: 'data_bumil',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { balitaMeninggal, balitaDawis },
    });
  }

  // ──────────────────────────────────────────────────────────
  // RULE 3: Ibu Hamil, Bumil Risti, & Pendampingan
  // ──────────────────────────────────────────────────────────
  const bumilTable = num(bumil.ibu_hamil);
  const bumilDawis = num(dawis.ibu_hamil);
  const bumilRisti = num(bumil.bumil_risti ?? bumil.custom_columns?.bumil_risti);
  const pendampingan = num(bumil.bumil_pendampingan ?? bumil.custom_columns?.bumil_pendampingan);
  const bayiLahir = num(bumil.bayi_lahir_l) + num(bumil.bayi_lahir_p);
  const akteLahir = num(bumil.akte_l) + num(bumil.akte_p);

  // 3a. Bumil Data vs Dawis Discrepancy
  if (bumilTable > 0 && bumilDawis > 0 && bumilTable !== bumilDawis) {
    issues.push({
      id: `BUMIL_DAWIS_DIFF_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'BUMIL_DISCREPANCY',
      title: 'Jumlah Ibu Hamil Berbeda (Bumil vs Dawis)',
      description: `Tabel Bumil mencatat ${bumilTable} ibu hamil, sedangkan Rekap Dawis mencatat ${bumilDawis} ibu hamil.`,
      sourceTable: 'data_bumil',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { bumilTable, bumilDawis },
    });
  }

  // 3b. Bumil Risti melebihi total Ibu Hamil
  if (bumilRisti > 0 && bumilTable > 0 && bumilRisti > bumilTable) {
    issues.push({
      id: `BUMIL_RISTI_EXCEEDS_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'error',
      code: 'RISTI_EXCEEDS_TOTAL',
      title: 'Bumil Risiko Tinggi Melebihi Total Ibu Hamil',
      description: `Ibu hamil risiko tinggi (${bumilRisti}) melebihi total ibu hamil yang tercatat (${bumilTable}).`,
      sourceTable: 'data_bumil',
      targetTable: 'data_bumil',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { bumilRisti, bumilTable },
    });
  }

  // 3c. Bumil Risti belum seluruhnya didampingi kader
  if (bumilRisti > 0 && pendampingan < bumilRisti) {
    issues.push({
      id: `BUMIL_PENDAMPINGAN_DEFICIT_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'RISTI_UNACCOMPANIED',
      title: 'Bumil Risti Belum Tuntas Didampingi',
      description: `Dari ${bumilRisti} ibu hamil risiko tinggi, baru ${pendampingan} yang mendapatkan pendampingan kader khusus.`,
      sourceTable: 'data_bumil',
      targetTable: 'data_bumil',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { bumilRisti, pendampingan, gap: bumilRisti - pendampingan },
    });
  }

  // 3d. Akta Kelahiran melebihi Bayi Lahir periode ini
  if (akteLahir > 0 && bayiLahir > 0 && akteLahir > bayiLahir) {
    issues.push({
      id: `AKTE_EXCEEDS_LAHIR_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'info',
      code: 'AKTE_EXCEEDS_BIRTH',
      title: 'Penerbitan Akta Melebihi Bayi Lahir Periode Ini',
      description: `Jumlah akta kelahiran (${akteLahir}) melebihi kelahiran bulan berjalan (${bayiLahir}). Kemungkinan mencakup akta susulan bulan lalu.`,
      sourceTable: 'data_bumil',
      targetTable: 'data_bumil',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { akteLahir, bayiLahir },
    });
  }

  return issues;
}
```

#### B. Desain Komponen `components/DataQualityAuditor.jsx`
- **Tampilan**: VisionOS Translucent Liquid Glass Card (`.glass-card`), frosted diffusion (`backdrop-filter: blur(40px) saturate(200%)`), specular highlight rim, rounded-3xl.
- **Header**: Icon perisai audit cerdas (`ShieldCheck` / `ExclamationTriangle`), badge hitungan issue (`Kritis: X, Peringatan: Y`), tombol toggle filter keparahan.
- **Kondisi Sempurna (0 issue)**:
  Tampilan emerald transparan dengan pesan: *"Seluruh data 9 dusun konsisten & sinkron lintas tabel. Tidak ditemukan anomali relasional."*
- **Kondisi Ada Issue**:
  Kartu notifikasi interaktif yang dapat difilter per dusun atau per level urgensi:
  * **Kritis / Error** (Merah transparan `bg-red-500/10 border-red-300/40 text-red-800 dark:text-red-300`)
  * **Peringatan / Warning** (Kuning amber `bg-amber-500/10 border-amber-300/40 text-amber-800 dark:text-amber-300`)
  * **Informasi / Info** (Biru zamrud `bg-blue-500/10 border-blue-300/40 text-blue-800 dark:text-blue-300`)
- **Aksi Cepat**: Tombol pegas (`whileTap={{ scale: 0.97 }}`) `"Perbaiki Data →"` yang langsung mengarahkan pengguna ke rute formulir edit terkait lengkap dengan parameter `dusun_id`, `tahun`, dan `bulan`.
- **Integrasi di `app/dashboard/page.js`**:
  Diletakkan tepat di bawah `<TodoTodayPanel />` dan di atas deretan kartu KPI operasional.

---

### 3.2 Sub-Sistem 2: Liquid Glass Completeness Heatmap (`components/CompletenessHeatmap.jsx`)

#### A. Kebutuhan Data Matriks 9 Dusun × 12 Bulan
- **Unit Baris**: 9 Dusun resmi (Soko, Melikan, Jamprit Wetan, Jamprit Kulon, Belikurip, Pagersari, Klerong, Tanjung, Banyuripan).
- **Unit Kolom**: 12 Bulan (Januari s.d. Desember).
- **Tabel Bulanan yang Dievaluasi**:
  1. `data_umum`
  2. `data_rekap_dawis`
  3. `data_bumil`
- **Kategori Status**:
  * **Lengkap (`lengkap`)**: Ketiga tabel bulanan terisi untuk dusun dan bulan tersebut tanpa error/warning validasi.  
    *Warna*: Emerald PKK (`bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.35)] text-white border-emerald-400/50`).
  * **Sebagian (`sebagian`)**: 1 atau 2 tabel terisi, ATAU ada status `perlu_dicek`.  
    *Warna*: Amber hangat (`bg-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.30)] text-white border-amber-400/50`).
  * **Kosong (`kosong`)**: Belum ada satupun tabel bulanan yang terisi pada bulan tersebut.  
    *Warna*: Translucent slate/rose (`bg-gray-200/50 dark:bg-gray-800/50 text-gray-400 border-white/20`).

#### B. Optimasi Endpoint & Payload Data
Untuk mencegah 12 roundtrip fetch terpisah, buat helper ringan di `/api/rekap/heatmap?tahun=YYYY` atau sertakan objek `heatmap` dalam respon `/api/rekap`:
```json
{
  "tahun": 2026,
  "heatmap": [
    {
      "dusunId": 1,
      "dusunNama": "Soko",
      "months": [
        { "bulan": 1, "status": "lengkap", "tables": { "data_umum": "lengkap", "data_rekap_dawis": "lengkap", "data_bumil": "lengkap" } },
        { "bulan": 2, "status": "sebagian", "tables": { "data_umum": "lengkap", "data_rekap_dawis": "belum_lengkap", "data_bumil": "lengkap" } },
        ...
        { "bulan": 12, "status": "kosong", "tables": { "data_umum": "belum_lengkap", "data_rekap_dawis": "belum_lengkap", "data_bumil": "belum_lengkap" } }
      ]
    }
  ]
}
```

#### C. Interaktivitas & Framer Motion Entrance
1. **Animasi Staggered**:
   Setiap sel bulan muncul bertahap dari kiri ke kanan dan atas ke bawah menggunakan variants:
   ```javascript
   const cellVariants = {
     hidden: { opacity: 0, scale: 0.75 },
     visible: (i) => ({
       opacity: 1,
       scale: 1,
       transition: { delay: i * 0.008, type: 'spring', stiffness: 400, damping: 28 },
     }),
   };
   ```
2. **Hover Physics & Rich Tooltip**:
   - Sel bereaksi taktil saat di-hover: `whileHover={{ scale: 1.25, zIndex: 30 }}`.
   - Tooltip translucent liquid glass menampilkan:
     * Nama Dusun & Nama Bulan
     * Status agregat (Lengkap / Sebagian / Kosong)
     * Checklist 3 tabel bulanan (Data Umum: ✓, Rekap Dawis: ✓, Bumil: ✕)
3. **Klik Sel (Period Quick-Jump)**:
   Mengklik sel bulan langsung mengatur state `bulan` di dashboard dan menggulir ke tabel terkait, atau mengarahkan ke halaman detail dusun `/dashboard/dusun/[id]?tahun=...&bulan=...`.

---

### 3.3 Sub-Sistem 3: Portal Publik 2.0 (`app/publik/page.js`)

#### A. Komponen 1: `components/public/KilasDusunInfographic.jsx`
- **Fungsi**: Kartu infografis visual pencapaian per dusun yang ramah ponsel.
- **Konten Per Kartu Dusun**:
  * Header: Nomor Urut & Nama Dusun dengan lencana kelengkapan (`Lengkap`, `Perlu Dicek`, `Belum Lengkap`).
  * Grid Metrik Kunci:
    - 👨‍👩‍👧‍👦 **Kependudukan**: Total KK & Total Jiwa (L/P)
    - 🏡 **Kelayakan Hunian**: Rasio Rumah Sehat (`rumah_sehat / jml_kk * 100%`) dengan progress bar melingkar
    - 🩺 **Kesehatan & Posyandu**: Jumlah Posyandu aktif & kepesertaan JKN/BPJS
    - 👥 **Pemberdayaan**: Kelompok Dasa Wisma & partisipasi UP2K
  * Lencana Pencapaian Otomatis:
    - *"Dusun Mandiri"* (jika rumah sehat > 85% dan kepesertaan BPJS > 80%)
    - *"Dusun Berdaya"* (jika Dasa Wisma aktif 100%)
  * Tombol Aksi: `"Lihat Detail Dusun →"` ke `/publik/dusun/[id]`.

#### B. Komponen 2: `components/public/DusunBenchmarkMatrix.jsx`
- **Fungsi**: Fitur perbandingan berdampingan (*Side-by-side Benchmark*) antara 2 hingga 3 dusun pilihan warga.
- **Mekanisme**:
  * Dropdown selector multi-pill di mana warga dapat memilih 2–3 dusun (default: Dusun Soko, Belikurip, Melikan).
  * Tabel komparasi responsif dengan bar persentase visual yang dinormalisasi terhadap nilai tertinggi antar dusun terpilih.
  * Indikator bintang hijau (`★ Unggul`) pada dusun yang memimpin metrik tertentu (misal: rasio rumah sehat tertinggi atau rasio akta kelahiran tercepat).
  * Metrik yang dibandingkan:
    1. Jumlah KK & Kepadatan Jiwa
    2. Rasio Dasa Wisma per KK
    3. Persentase Rumah Sehat
    4. Ketersediaan Sarana Posyandu Terintegrasi
    5. Cakupan Jaminan Kesehatan (JKN/BPJS)

#### C. Komponen 3: `components/public/ShareableReportCard.jsx`
- **Fungsi**: Kartu ringkasan estetik yang dirancang khusus untuk dibagikan secara instan ke grup WhatsApp RT/RW, warga, dan kader dusun.
- **Fitur Utama**:
  1. **Visual Card Template**:
     - Background: VisionOS Translucent Frosted Glass dengan sentuhan watermark lambang PKK dan identitas "TP PKK Desa Belikurip · Kecamatan Baturetno".
     - Ringkasan 4 metrik penting periode berjalan.
     - QR/Link verifikasi publik.
  2. **Tombol "Salin Teks WhatsApp" (1-Klik Copy)**:
     Menyalin teks berformat rapi dengan emoji yang siap dipaste ke WhatsApp:
     ```text
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     🏛️ *LUMBUNG DATA PKK DESA BELIKURIP*
     📍 *Kilas Capaian: Dusun Belikurip*
     🗓️ Periode: Oktober 2026
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     👨‍👩‍👧‍👦 Kependudukan: 342 KK | 1.120 Jiwa
     🏡 Rumah Sehat: 310 Rumah (90,6%)
     🩺 Posyandu: 2 Pos Aktif Terintegrasi
     🛡️ JKN/BPJS: 298 Warga Terlindungi
     👥 Dasa Wisma: 32 Kelompok Aktif
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ℹ️ Status Laporan: ✅ Lengkap & Terverifikasi
     🔗 Lihat data lengkap publik:
     https://belikurip.desa.id/publik/dusun/5?tahun=2026&bulan=10
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ```
  3. **Tombol "Bagikan ke WhatsApp"**:
     Membuka URL intent resmi `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}` secara langsung.
  4. **Kepatuhan Privasi Data**:
     Hanya mengonsumsi data agregat publik sesuai allowlist `PUBLIC_COLUMNS` (`lib/publicData.js`); tidak ada data nama perorangan, NIK, alamat rumah, atau data sensitif yang diekspos.

---

## 4. Caveats

1. **Skema Bawaan `data_pokja4`**:
   `data_pokja4` pada skema Supabase saat ini (`supabase_schema.sql` dan `supabase_schema_updates_v5.sql`) tidak memiliki kolom native `jml_balita`. Oleh karena itu, auditor cross-table memeriksa properti `row.jml_balita` (jika tersedia dari kolom kustom JSONB `custom_columns`), sekaligus memvalidasi korelasi posyandu vs Dawis dan balita Dawis vs kematian balita di Bumil.
2. **Ketersediaan Data Historis Bulanan**:
   Skema per-bulan (`bulan`) diterapkan bertahap (`data_rekap_dawis` sejak v10, `data_umum` sejak v12). Untuk tahun-tahun sebelum migrasi tersebut, data bulanan bernilai null atau difallback ke data tahunan (`annual_legacy`). Heatmap harus secara anggun menampilkan status khusus untuk tahun-tahun legacy tersebut.
3. **Penyelarasan Role Kader-Dusun**:
   Kader dusun yang masuk ke dashboard hanya memiliki hak edit pada dusun mereka sendiri (`ROLE_SCOPE === 'own_dusun'`). Tombol navigasi cepat pada `DataQualityAuditor.jsx` harus mendeteksi role pengguna; jika kader dusun melihat anomali dusun lain, tombol aksi berubah menjadi *"Hanya Lihat"* atau disabled untuk mencegah 403 Forbidden.

---

## 5. Conclusion

1. **Kelayakan Penuh**: Ketiga fitur unggulan R5 (Cross-Table Data Quality Auditor, Liquid Glass Completeness Heatmap 9 Dusun × 12 Bulan, dan Portal Publik 2.0) sangat layak diimplementasikan dan memberikan nilai tambah langsung yang masif bagi efektivitas operasional kader dusun serta transparansi warga Belikurip.
2. **Kepatuhan Desain Mutlak**: Seluruh rancangan mematuhi standar VisionOS Translucent Liquid Glass (`blur(40px) saturate(200%)`, specular rim highlight, opasitas 0.30–0.56, emerald palette), standar micro-interactions Framer Motion (spring physics, reduced motion compliance), serta standar keamanan role-based permission.
3. **Pengecualian Fitur 100% Bersih**: Tidak ada satupun dari 6 fitur yang dilarang yang disentuh atau dimasukkan ke dalam rancangan.

---

## 6. Verification Method

Untuk memverifikasi kebenaran analisis dan kesiapan kode ini:
1. **Jalankan Unit Test Suite**:
   ```powershell
   npm test
   ```
   *Ekspektasi*: Seluruh 31 test suites dan 268 test cases saat ini lulus 100% tanpa regresi.
2. **Verifikasi Skema & Allowlist Kolom**:
   Periksa berkas:
   - `lib/dataPages.js`
   - `lib/excel/sheetMap.js`
   - `lib/publicData.js`
   - `lib/dataQuality.js`
   *Ekspektasi*: Semua kolom yang dirujuk dalam aturan konsistensi (misal `balita_l`, `balita_p`, `jml_kk`, `jml_jiwa_l`, `jml_jiwa_p`, `ibu_hamil`, dll.) terdaftar secara valid.
3. **Verifikasi Build Next.js**:
   ```powershell
   npm run build
   ```
   *Ekspektasi*: Kompilasi produksi Next.js 16.2.5 (Turbopack) sukses bersih dengan 0 error.
