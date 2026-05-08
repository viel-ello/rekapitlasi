/**
 * @file Database connection singleton with auto-migration
 * SQLite database for PKK Kecamatan data management
 * 
 * Supports Vercel deployment by using /tmp for writable database
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine database path based on environment
function getDbPath() {
  // Custom path from env (e.g., for tests)
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  // Vercel / serverless: use /tmp (only writable location)
  if (process.env.VERCEL) {
    const tmpDb = '/tmp/pkk_rekapitulasi.db';
    const sourceDb = path.join(process.cwd(), 'pkk_rekapitulasi.db');
    
    // Copy source database to /tmp if it doesn't exist yet (cold start)
    if (!fs.existsSync(tmpDb) && fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, tmpDb);
      console.log('📦 Copied database to /tmp for Vercel');
    }
    
    return tmpDb;
  }

  // Local development: use project root
  return path.join(process.cwd(), 'pkk_rekapitulasi.db');
}

const dbPath = getDbPath();
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
// AUTO-MIGRATION: Create all tables if they don't exist
// ============================================================

db.exec(`
  -- Tabel Desa
  CREATE TABLE IF NOT EXISTS desa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL UNIQUE,
    nomor_urut INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  -- Tabel Users
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nama_lengkap TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','pokja1','pokja2','pokja3','pokja4','sekretaris','user')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Tabel Data Umum PKK (Lampiran 4-20b)
  CREATE TABLE IF NOT EXISTS data_umum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desa_id INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    jml_dusun INTEGER DEFAULT 0,
    jml_pkk_rw INTEGER DEFAULT 0,
    jml_pkk_rt INTEGER DEFAULT 0,
    jml_dasa_wisma INTEGER DEFAULT 0,
    jml_krt INTEGER DEFAULT 0,
    jml_kk INTEGER DEFAULT 0,
    jml_jiwa_l INTEGER DEFAULT 0,
    jml_jiwa_p INTEGER DEFAULT 0,
    jml_kader_tp_pkk_l INTEGER DEFAULT 0,
    jml_kader_tp_pkk_p INTEGER DEFAULT 0,
    jml_kader_umum_l INTEGER DEFAULT 0,
    jml_kader_umum_p INTEGER DEFAULT 0,
    jml_kader_khusus_l INTEGER DEFAULT 0,
    jml_kader_khusus_p INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(desa_id, tahun),
    FOREIGN KEY (desa_id) REFERENCES desa(id)
  );

  -- Tabel Data Pokja I (Lampiran 4-21)
  CREATE TABLE IF NOT EXISTS data_pokja1 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desa_id INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    kader_pkbn INTEGER DEFAULT 0,
    kader_pkdrt INTEGER DEFAULT 0,
    kader_pola_asuh INTEGER DEFAULT 0,
    pkbn_jml_klp_simulasi INTEGER DEFAULT 0,
    pkbn_jml_anggota INTEGER DEFAULT 0,
    pkdrt_jml_klp_simulasi INTEGER DEFAULT 0,
    pkdrt_jml_anggota INTEGER DEFAULT 0,
    pola_asuh_jml_klp INTEGER DEFAULT 0,
    pola_asuh_jml_anggota INTEGER DEFAULT 0,
    lansia_jml_klp INTEGER DEFAULT 0,
    lansia_jml_anggota INTEGER DEFAULT 0,
    gr_kerja_bakti INTEGER DEFAULT 0,
    gr_rukun_kematian INTEGER DEFAULT 0,
    gr_keagamaan INTEGER DEFAULT 0,
    gr_jimpitan INTEGER DEFAULT 0,
    gr_arisan INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(desa_id, tahun),
    FOREIGN KEY (desa_id) REFERENCES desa(id)
  );

  -- Tabel Data Pokja II
  CREATE TABLE IF NOT EXISTS data_pokja2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desa_id INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    paket_a_klp INTEGER DEFAULT 0,
    paket_a_wrg INTEGER DEFAULT 0,
    paket_b_klp INTEGER DEFAULT 0,
    paket_b_wrg INTEGER DEFAULT 0,
    paket_c_klp INTEGER DEFAULT 0,
    paket_c_wrg INTEGER DEFAULT 0,
    taman_bacaan INTEGER DEFAULT 0,
    klp_pembaca INTEGER DEFAULT 0,
    rumah_dilan INTEGER DEFAULT 0,
    kampung_mandiri INTEGER DEFAULT 0,
    kader_khusus_koperasi INTEGER DEFAULT 0,
    kader_khusus_keterampilan INTEGER DEFAULT 0,
    usaha_mikro INTEGER DEFAULT 0,
    up2k_pemula_klp INTEGER DEFAULT 0,
    up2k_pemula_psrt INTEGER DEFAULT 0,
    up2k_madya_klp INTEGER DEFAULT 0,
    up2k_madya_psrt INTEGER DEFAULT 0,
    up2k_utama_klp INTEGER DEFAULT 0,
    up2k_utama_psrt INTEGER DEFAULT 0,
    up2k_mandiri_klp INTEGER DEFAULT 0,
    up2k_mandiri_psrt INTEGER DEFAULT 0,
    toko_pkk INTEGER DEFAULT 0,
    koperasi_belum_bh_kop INTEGER DEFAULT 0,
    koperasi_belum_bh_angg INTEGER DEFAULT 0,
    koperasi_berbadan_hukum_kop INTEGER DEFAULT 0,
    koperasi_berbadan_hukum_angg INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(desa_id, tahun),
    FOREIGN KEY (desa_id) REFERENCES desa(id)
  );

  -- Tabel Data Pokja III (Lampiran 4-23)
  CREATE TABLE IF NOT EXISTS data_pokja3 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desa_id INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    kader_pangan INTEGER DEFAULT 0,
    kader_sandang INTEGER DEFAULT 0,
    kader_tata_laksana_rt INTEGER DEFAULT 0,
    pangan_beras INTEGER DEFAULT 0,
    pangan_non_beras INTEGER DEFAULT 0,
    pemanfaatan_peternakan INTEGER DEFAULT 0,
    pemanfaatan_perikanan INTEGER DEFAULT 0,
    pemanfaatan_warung_hidup INTEGER DEFAULT 0,
    pemanfaatan_lumbung_hidup INTEGER DEFAULT 0,
    pemanfaatan_toga INTEGER DEFAULT 0,
    pemanfaatan_tanaman_keras INTEGER DEFAULT 0,
    industri_pangan INTEGER DEFAULT 0,
    industri_sandang INTEGER DEFAULT 0,
    industri_jasa INTEGER DEFAULT 0,
    rumah_sehat INTEGER DEFAULT 0,
    rumah_kurang_sehat INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(desa_id, tahun),
    FOREIGN KEY (desa_id) REFERENCES desa(id)
  );

  -- Tabel Data Pokja IV (Lampiran 4-24)
  CREATE TABLE IF NOT EXISTS data_pokja4 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desa_id INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    kader_posyandu INTEGER DEFAULT 0,
    kader_gizi INTEGER DEFAULT 0,
    kader_kesling INTEGER DEFAULT 0,
    kader_penyuluh_narkoba INTEGER DEFAULT 0,
    kader_phbs INTEGER DEFAULT 0,
    kader_kb INTEGER DEFAULT 0,
    posyandu_jumlah INTEGER DEFAULT 0,
    posyandu_terintegrasi INTEGER DEFAULT 0,
    lansia_jml_klp INTEGER DEFAULT 0,
    lansia_jml_anggota INTEGER DEFAULT 0,
    lansia_jml_kartu_berobat INTEGER DEFAULT 0,
    rumah_jamban INTEGER DEFAULT 0,
    rumah_spal INTEGER DEFAULT 0,
    rumah_tempat_sampah INTEGER DEFAULT 0,
    rumah_mck INTEGER DEFAULT 0,
    air_pdam INTEGER DEFAULT 0,
    air_sumur INTEGER DEFAULT 0,
    air_lain INTEGER DEFAULT 0,
    jml_pus INTEGER DEFAULT 0,
    jml_wus INTEGER DEFAULT 0,
    akseptor_kb_l INTEGER DEFAULT 0,
    akseptor_kb_p INTEGER DEFAULT 0,
    kk_tabungan INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(desa_id, tahun),
    FOREIGN KEY (desa_id) REFERENCES desa(id)
  );

  -- Tabel Data Kegiatan Warga (Lampiran 4-17b)
  CREATE TABLE IF NOT EXISTS data_kegiatan_warga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desa_id INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    jml_dusun INTEGER DEFAULT 0,
    jml_rw INTEGER DEFAULT 0,
    jml_rt INTEGER DEFAULT 0,
    jml_dawis INTEGER DEFAULT 0,
    jml_krt INTEGER DEFAULT 0,
    jml_kk INTEGER DEFAULT 0,
    jml_anggota_l INTEGER DEFAULT 0,
    jml_anggota_p INTEGER DEFAULT 0,
    balita_l INTEGER DEFAULT 0,
    balita_p INTEGER DEFAULT 0,
    pus INTEGER DEFAULT 0,
    wus INTEGER DEFAULT 0,
    ibu_hamil INTEGER DEFAULT 0,
    ibu_menyusui INTEGER DEFAULT 0,
    lansia INTEGER DEFAULT 0,
    tiga_buta_l INTEGER DEFAULT 0,
    tiga_buta_p INTEGER DEFAULT 0,
    rumah_sehat INTEGER DEFAULT 0,
    rumah_kurang_sehat INTEGER DEFAULT 0,
    punya_tempat_sampah INTEGER DEFAULT 0,
    punya_spal INTEGER DEFAULT 0,
    stiker_p4k INTEGER DEFAULT 0,
    air_pdam INTEGER DEFAULT 0,
    air_sumur INTEGER DEFAULT 0,
    air_sungai INTEGER DEFAULT 0,
    air_dll INTEGER DEFAULT 0,
    jamban INTEGER DEFAULT 0,
    makan_beras INTEGER DEFAULT 0,
    makan_non_beras INTEGER DEFAULT 0,
    ikut_up2k INTEGER DEFAULT 0,
    ikut_pekarangan INTEGER DEFAULT 0,
    ikut_industri INTEGER DEFAULT 0,
    ikut_kesling INTEGER DEFAULT 0,
    jkn_bpjs INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(desa_id, tahun),
    FOREIGN KEY (desa_id) REFERENCES desa(id)
  );

  -- Tabel Data Bumil (Lampiran 4-19b)
  CREATE TABLE IF NOT EXISTS data_bumil (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desa_id INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    bulan INTEGER NOT NULL CHECK(bulan BETWEEN 1 AND 12),
    jml_dusun INTEGER DEFAULT 0,
    jml_rw INTEGER DEFAULT 0,
    jml_rt INTEGER DEFAULT 0,
    jml_dasa_wisma INTEGER DEFAULT 0,
    ibu_hamil INTEGER DEFAULT 0,
    ibu_melahirkan INTEGER DEFAULT 0,
    ibu_nifas INTEGER DEFAULT 0,
    ibu_meninggal INTEGER DEFAULT 0,
    bayi_lahir_l INTEGER DEFAULT 0,
    bayi_lahir_p INTEGER DEFAULT 0,
    akte_ada INTEGER DEFAULT 0,
    akte_tidak INTEGER DEFAULT 0,
    bayi_meninggal_l INTEGER DEFAULT 0,
    bayi_meninggal_p INTEGER DEFAULT 0,
    balita_meninggal_l INTEGER DEFAULT 0,
    balita_meninggal_p INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(desa_id, tahun, bulan),
    FOREIGN KEY (desa_id) REFERENCES desa(id)
  );

  -- Tabel Audit Logs (Changes Log)
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'update',
    table_name TEXT NOT NULL,
    desa_nama TEXT,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ============================================================
// AUTO-SEED: Create default data if tables are empty
// ============================================================
const desaCount = db.prepare('SELECT COUNT(*) as c FROM desa').get().c;
if (desaCount === 0) {
  const { seedAll } = require('./seed');
  seedAll(db);
  console.log('✅ Database seeded with 13 desa + admin user');
}

module.exports = db;
