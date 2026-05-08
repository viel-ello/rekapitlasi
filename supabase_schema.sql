-- Skema Database PostgreSQL untuk Supabase
-- Silakan jalankan script ini di menu "SQL Editor" pada dashboard Supabase Anda.

-- Tabel Desa
CREATE TABLE IF NOT EXISTS desa (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  nomor_urut INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Tabel Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nama_lengkap TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','pokja1','pokja2','pokja3','pokja4','sekretaris','user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Data Umum PKK (Lampiran 4-20b)
CREATE TABLE IF NOT EXISTS data_umum (
  id SERIAL PRIMARY KEY,
  desa_id INTEGER NOT NULL REFERENCES desa(id),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(desa_id, tahun)
);

-- Tabel Data Pokja I (Lampiran 4-21)
CREATE TABLE IF NOT EXISTS data_pokja1 (
  id SERIAL PRIMARY KEY,
  desa_id INTEGER NOT NULL REFERENCES desa(id),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(desa_id, tahun)
);

-- Tabel Data Pokja II
CREATE TABLE IF NOT EXISTS data_pokja2 (
  id SERIAL PRIMARY KEY,
  desa_id INTEGER NOT NULL REFERENCES desa(id),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(desa_id, tahun)
);

-- Tabel Data Pokja III (Lampiran 4-23)
CREATE TABLE IF NOT EXISTS data_pokja3 (
  id SERIAL PRIMARY KEY,
  desa_id INTEGER NOT NULL REFERENCES desa(id),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(desa_id, tahun)
);

-- Tabel Data Pokja IV (Lampiran 4-24)
CREATE TABLE IF NOT EXISTS data_pokja4 (
  id SERIAL PRIMARY KEY,
  desa_id INTEGER NOT NULL REFERENCES desa(id),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(desa_id, tahun)
);

-- Tabel Data Kegiatan Warga (Lampiran 4-17b)
CREATE TABLE IF NOT EXISTS data_kegiatan_warga (
  id SERIAL PRIMARY KEY,
  desa_id INTEGER NOT NULL REFERENCES desa(id),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(desa_id, tahun)
);

-- Tabel Data Bumil (Lampiran 4-19b)
CREATE TABLE IF NOT EXISTS data_bumil (
  id SERIAL PRIMARY KEY,
  desa_id INTEGER NOT NULL REFERENCES desa(id),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(desa_id, tahun, bulan)
);

-- Tabel Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'update',
  table_name TEXT NOT NULL,
  desa_nama TEXT,
  detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INSERT DATA DESA DEFAULT
INSERT INTO desa (nama, nomor_urut, is_active) VALUES 
('Setrorejo', 1, 1),
('Kedungombo', 2, 1),
('Boto', 3, 1),
('Sendangrejo', 4, 1),
('Talunombo', 5, 1),
('Baturetno', 6, 1),
('Saradan', 7, 1),
('Temon', 8, 1),
('Belikurip', 9, 1),
('Watuagung', 10, 1),
('Balepanjang', 11, 1),
('Gambirnom', 12, 1),
('Glesung Rejo', 13, 1)
ON CONFLICT DO NOTHING;

-- INSERT ADMIN DEFAULT (password: admin123)
INSERT INTO users (username, password_hash, nama_lengkap, role) VALUES 
('admin', '$2a$10$wT0ESt0yX1W5b4vA2v9oO.l2Jd0RkZg3c3tV.g2f1s0y.l2Jd0RkZ', 'Administrator', 'admin')
ON CONFLICT DO NOTHING;
- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   S C R I P T   U P D A T E :   F I T U R   K O L O M   D I N A M I S   ( J S O N B )  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   S i l a k a n   j a l a n k a n   s c r i p t   i n i   d i   m e n u   " S Q L   E d i t o r "   p a d a   d a s h b o a r d   S u p a b a s e   A n d a .  
  
 - -   1 .   B u a t   t a b e l   u n t u k   m e n y i m p a n   d e f i n i s i   k o l o m   d i n a m i s  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   t a b l e _ s c h e m a s   (  
     i d   S E R I A L   P R I M A R Y   K E Y ,  
     t a b l e _ n a m e   T E X T   N O T   N U L L ,   - -   c o n t o h :   ' d a t a _ p o k j a 1 '  
     c o l u m n _ k e y   T E X T   N O T   N U L L ,   - -   c o n t o h :   ' k e t e r a n g a n _ t a m b a h a n '  
     c o l u m n _ l a b e l   T E X T   N O T   N U L L ,   - -   c o n t o h :   ' K e t e r a n g a n   T a m b a h a n '  
     c o l u m n _ t y p e   T E X T   N O T   N U L L   D E F A U L T   ' t e x t ' ,   - -   ' t e x t '   a t a u   ' n u m b e r '  
     c r e a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   N O W ( ) ,  
     U N I Q U E ( t a b l e _ n a m e ,   c o l u m n _ k e y )  
 ) ;  
  
 - -   2 .   T a m b a h k a n   f i e l d   c u s t o m _ c o l u m n s   k e   s e m u a   t a b e l   d a t a   o p e r a s i o n a l  
 - -   K i t a   m e n g g u n a k a n   t i p e   J S O N B   d e n g a n   n i l a i   d e f a u l t   ' { } '   ( o b j e k   k o s o n g )  
  
 A L T E R   T A B L E   d a t a _ u m u m   A D D   C O L U M N   I F   N O T   E X I S T S   c u s t o m _ c o l u m n s   J S O N B   D E F A U L T   ' { } ' : : j s o n b ;  
 A L T E R   T A B L E   d a t a _ p o k j a 1   A D D   C O L U M N   I F   N O T   E X I S T S   c u s t o m _ c o l u m n s   J S O N B   D E F A U L T   ' { } ' : : j s o n b ;  
 A L T E R   T A B L E   d a t a _ p o k j a 2   A D D   C O L U M N   I F   N O T   E X I S T S   c u s t o m _ c o l u m n s   J S O N B   D E F A U L T   ' { } ' : : j s o n b ;  
 A L T E R   T A B L E   d a t a _ p o k j a 3   A D D   C O L U M N   I F   N O T   E X I S T S   c u s t o m _ c o l u m n s   J S O N B   D E F A U L T   ' { } ' : : j s o n b ;  
 A L T E R   T A B L E   d a t a _ p o k j a 4   A D D   C O L U M N   I F   N O T   E X I S T S   c u s t o m _ c o l u m n s   J S O N B   D E F A U L T   ' { } ' : : j s o n b ;  
 A L T E R   T A B L E   d a t a _ k e g i a t a n _ w a r g a   A D D   C O L U M N   I F   N O T   E X I S T S   c u s t o m _ c o l u m n s   J S O N B   D E F A U L T   ' { } ' : : j s o n b ;  
 A L T E R   T A B L E   d a t a _ b u m i l   A D D   C O L U M N   I F   N O T   E X I S T S   c u s t o m _ c o l u m n s   J S O N B   D E F A U L T   ' { } ' : : j s o n b ;  
 