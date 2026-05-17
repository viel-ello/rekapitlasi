/**
 * @file PKK Assistant chat route — Google Gemini.
 *
 * Migration v5: scope unit data → dusun (Desa Belikurip). Role kader-dusun
 * (`dusun_*`) hanya boleh request update tabel `data_rekap_dawis` di dusun mereka.
 *
 * Model default: gemini-flash-latest (override via GEMINI_MODEL env).
 *
 * Endpoints:
 *   POST /api/chat              (body: { message, history, tahun })
 *   POST /api/chat (multipart)  (file upload: Excel interpretation)
 */
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';
import { getAuthUser, ROLE_PERMISSIONS, ROLE_SCOPE, normalizeTableName } from '@/lib/auth';
import { parseYear, toBoundedInteger } from '@/lib/requestValidation';
import { writeLog } from '@/lib/audit';
import { DUSUN_LIST } from '@/lib/dusun';
import { BRAND } from '@/lib/branding';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MAX_CHAT_MESSAGE_LENGTH = 2000;
const MAX_CHAT_HISTORY_ITEMS = 12;
const MAX_EXCEL_SHEETS_FOR_AI = 10;

// Whitelist tabel yang boleh dimutasi via AI. `data_kegiatan_warga` alias
// dipertahankan untuk transition; akan di-normalize ke `data_rekap_dawis`.
const VALID_TABLES = [
  'data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4',
  'data_rekap_dawis', 'data_kegiatan_warga', 'data_bumil',
];

const VALID_COLUMNS = {
  data_umum: ['jml_dusun', 'jml_pkk_rw', 'jml_pkk_rt', 'jml_dasa_wisma', 'jml_krt', 'jml_kk', 'jml_jiwa_l', 'jml_jiwa_p', 'jml_kader_tp_pkk_l', 'jml_kader_tp_pkk_p', 'jml_kader_umum_l', 'jml_kader_umum_p', 'jml_kader_khusus_l', 'jml_kader_khusus_p', 'jml_tenaga_honorer_l', 'jml_tenaga_honorer_p', 'jml_tenaga_bantuan_l', 'jml_tenaga_bantuan_p', 'keterangan'],
  data_pokja1: ['kader_pkbn', 'kader_pkdrt', 'kader_pola_asuh', 'pkbn_jml_klp_simulasi', 'pkbn_jml_anggota', 'pkdrt_jml_klp_simulasi', 'pkdrt_jml_anggota', 'pola_asuh_jml_klp', 'pola_asuh_jml_anggota', 'lansia_jml_klp', 'lansia_jml_anggota', 'gr_kerja_bakti', 'gr_rukun_kematian', 'gr_keagamaan', 'gr_jimpitan', 'gr_arisan', 'keterangan'],
  data_pokja2: ['jml_warga_3_buta', 'paket_a_klp', 'paket_a_wrg', 'paket_b_klp', 'paket_b_wrg', 'paket_c_klp', 'paket_c_wrg', 'kf_klp', 'kf_wrg', 'paud_sejenis', 'taman_bacaan', 'klp_pembaca', 'bkb_klp', 'bkb_jml_ibu_peserta', 'bkb_ape_set_a', 'bkb_ape_set_b', 'kader_tutor_kf', 'kader_tutor_paud', 'kader_bkb', 'kader_khusus_koperasi', 'kader_khusus_keterampilan', 'yg_dilatih_lp3pkk', 'yg_dilatih_tp3pkk', 'yg_dilatih_damaspkk', 'up2k_pemula_klp', 'up2k_pemula_psrt', 'up2k_madya_klp', 'up2k_madya_psrt', 'up2k_utama_klp', 'up2k_utama_psrt', 'up2k_mandiri_klp', 'up2k_mandiri_psrt', 'koperasi_berbadan_hukum_kop', 'koperasi_berbadan_hukum_angg', 'keterangan'],
  data_pokja3: ['kader_pangan', 'kader_sandang', 'kader_tata_laksana_rt', 'pangan_beras', 'pangan_non_beras', 'pemanfaatan_peternakan', 'pemanfaatan_perikanan', 'pemanfaatan_warung_hidup', 'pemanfaatan_lumbung_hidup', 'pemanfaatan_toga', 'pemanfaatan_tanaman_keras', 'industri_pangan', 'industri_sandang', 'industri_jasa', 'rumah_sehat', 'rumah_kurang_sehat', 'keterangan'],
  data_pokja4: ['kader_posyandu', 'kader_gizi', 'kader_kesling', 'kader_penyuluh_narkoba', 'kader_phbs', 'kader_kb', 'posyandu_jumlah', 'posyandu_terintegrasi', 'lansia_jml_klp', 'lansia_jml_anggota', 'lansia_jml_kartu_berobat', 'rumah_jamban', 'rumah_spal', 'rumah_tempat_sampah', 'rumah_mck', 'air_pdam', 'air_sumur', 'air_lain', 'jml_pus', 'jml_wus', 'akseptor_kb_l', 'akseptor_kb_p', 'kk_tabungan', 'keterangan'],
  data_rekap_dawis: ['jml_rw', 'jml_rt', 'jml_dawis', 'jml_krt', 'jml_kk', 'jml_anggota_l', 'jml_anggota_p', 'balita_l', 'balita_p', 'pus', 'wus', 'ibu_hamil', 'ibu_menyusui', 'lansia', 'tiga_buta', 'berkebutuhan_khusus', 'rumah_sehat', 'rumah_kurang_sehat', 'punya_tempat_sampah', 'punya_spal', 'jamban', 'stiker_p4k', 'air_pdam', 'air_sumur', 'air_sungai', 'air_dll', 'makan_beras', 'makan_non_beras', 'ikut_up2k', 'ikut_pekarangan', 'ikut_kesling', 'jkn_bpjs'],
  data_bumil: ['jml_rt', 'jml_rw', 'jml_dasa_wisma', 'ibu_hamil', 'ibu_melahirkan', 'ibu_nifas', 'ibu_meninggal', 'bayi_lahir_l', 'bayi_lahir_p', 'akte_l', 'akte_p', 'akte_ada', 'akte_tidak', 'bayi_meninggal_l', 'bayi_meninggal_p', 'balita_meninggal_l', 'balita_meninggal_p', 'keterangan'],
};
// Backward-compat alias: data_kegiatan_warga ≡ data_rekap_dawis kolom set
VALID_COLUMNS.data_kegiatan_warga = VALID_COLUMNS.data_rekap_dawis;

const ROLE_LABELS = {
  admin: 'Administrator (akses penuh semua data)',
  pokja1: 'Pokja I — Penghayatan & Pengamalan Pancasila, Gotong Royong',
  pokja2: 'Pokja II — Pendidikan & Keterampilan, Koperasi',
  pokja3: 'Pokja III — Pangan, Sandang, Tata Laksana RT',
  pokja4: 'Pokja IV — Kesehatan, Kelestarian Lingkungan',
  sekretaris: 'Sekretaris — Data Umum, Rekap Dawis & Bumil',
  user: 'User Biasa (hanya bisa melihat data)',
  dusun_soko: 'Kader Dusun Soko (Rekap Dawis dusun Soko saja)',
  dusun_melikan: 'Kader Dusun Melikan (Rekap Dawis dusun Melikan saja)',
  dusun_jamprit_wetan: 'Kader Dusun Jamprit Wetan (Rekap Dawis dusun Jamprit Wetan saja)',
  dusun_jamprit_kulon: 'Kader Dusun Jamprit Kulon (Rekap Dawis dusun Jamprit Kulon saja)',
  dusun_belikurip: 'Kader Dusun Belikurip (Rekap Dawis dusun Belikurip saja)',
  dusun_pagersari: 'Kader Dusun Pagersari (Rekap Dawis dusun Pagersari saja)',
  dusun_klerong: 'Kader Dusun Klerong (Rekap Dawis dusun Klerong saja)',
  dusun_tanjung: 'Kader Dusun Tanjung (Rekap Dawis dusun Tanjung saja)',
  dusun_banyuripan: 'Kader Dusun Banyuripan (Rekap Dawis dusun Banyuripan saja)',
};

const TABLE_LABELS = {
  data_umum: 'Data Umum',
  data_pokja1: 'Data Pokja I',
  data_pokja2: 'Data Pokja II',
  data_pokja3: 'Data Pokja III',
  data_pokja4: 'Data Pokja IV',
  data_rekap_dawis: 'Rekapitulasi Dawis',
  data_kegiatan_warga: 'Rekapitulasi Dawis',
  data_bumil: 'Data Bumil',
};

// Fetch context data dari database untuk AI (tahun aktif ±1).
async function getDbContext(role, tahun) {
  const currentYear = Number(tahun) || new Date().getFullYear();
  const contextYears = [currentYear - 1, currentYear, currentYear + 1];

  const { data: dusun } = await supabase
    .from('dusun')
    .select('id, nama, nomor_urut')
    .eq('is_active', 1)
    .order('nomor_urut');

  const allTables = ['data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4'];
  const summaries = {};
  const availableYears = new Set();

  for (const t of allTables) {
    const { data } = await supabase
      .from(t)
      .select('*')
      .in('tahun', contextYears)
      .order('tahun', { ascending: false });
    summaries[t] = data || [];
    (data || []).forEach((r) => availableYears.add(r.tahun));
  }

  return { dusun: dusun || [], summaries, availableYears: [...availableYears].sort((a, b) => b - a) };
}

function buildSystemPrompt(userRole, userName, allowedTables, userDusunName) {
  const roleLabel = ROLE_LABELS[userRole] || 'Tidak diketahui';
  const canEdit = allowedTables.length > 0;
  const editableTables = allowedTables
    .filter((t) => t !== 'data_kegiatan_warga') // hide alias dari user-facing copy
    .map((t) => TABLE_LABELS[t] || t)
    .join(', ');

  const isKaderDusun = ROLE_SCOPE[userRole] === 'own_dusun';
  const dusunScope = isKaderDusun && userDusunName
    ? `\n- Anda hanya boleh edit DATA DUSUN: ${userDusunName} (tidak boleh edit dusun lain).`
    : '';

  return `Kamu adalah asisten AI bernama "PKK Assistant" untuk Sistem Rekapitulasi Data PKK ${BRAND.organization}, ${BRAND.region}, ${BRAND.regency}.

═══════════════════════════════════════════
IDENTITAS USER YANG SEDANG CHAT:
- Nama: ${userName}
- Role: ${userRole} (${roleLabel})
- Tabel yang BOLEH diedit: ${canEdit ? editableTables : 'TIDAK ADA (hanya bisa melihat)'}${dusunScope}
═══════════════════════════════════════════

CAKUPAN DATA:
- Aplikasi ini untuk Desa Belikurip dengan ${BRAND.unitCount} dusun:
  ${DUSUN_LIST.map((d, i) => `${i + 1}. ${d}`).join(', ')}
- Unit data terkecil = dusun (sebelumnya: desa, sudah dimigrasi).

BATASAN — WAJIB DIPATUHI:
1. Kamu BOLEH menjawab pertanyaan tentang:
   - Data PKK (Pokja I-IV, Data Umum, Rekapitulasi Dawis, Data Bumil)
   - Administrasi desa Belikurip
   - Cara menggunakan aplikasi Rekapitulasi PKK ini
   - Analisis, statistik, dan perbandingan data antar dusun
   - Perhitungan dasar (penjumlahan, rata-rata, persentase)

2. Kamu HARUS MENOLAK dengan sopan jika user bertanya topik di luar PKK/desa/pekerjaan.
   Contoh penolakan: "Maaf, saya hanya bisa membantu hal-hal yang berkaitan dengan data PKK Desa Belikurip. Silakan tanyakan tentang data rekapitulasi! 😊"

3. ATURAN AKSES DATA — SANGAT PENTING:
   - User ini berperan sebagai: ${userRole}
   ${canEdit ? `- User ini HANYA BOLEH meminta edit/input data di: ${editableTables}` : '- User ini TIDAK BOLEH meminta edit data apapun'}
   ${isKaderDusun ? `- DAN HANYA untuk dusun ${userDusunName}.` : ''}
   - Jika user meminta edit di luar haknya, TOLAK dengan jelas.
   - Semua user (termasuk role 'user') BOLEH MELIHAT dan BERTANYA tentang semua data.

4. FITUR IMPORT EXCEL:
   - Kamu BISA memproses file Excel (.xlsx). Arahkan user untuk klik **ikon penjepit kertas** di chat.

5. Selalu jawab dalam Bahasa Indonesia
6. Berikan jawaban ringkas tapi informatif
7. Format angka dengan pemisah ribuan Indonesia (titik)
8. Jangan pernah mengarang data
9. Saat menjawab statistik/analisis, sertakan: "📊 Sumber: [nama_tabel] tahun [tahun]"

KONTEKS DATABASE:
- data_umum: Data umum PKK (jumlah jiwa, KK, kader TP PKK, dasa wisma, dusun)
- data_pokja1: Penghayatan Pancasila & Gotong Royong (kader PKBN, PKDRT, pola asuh, lansia, kerja bakti, keagamaan, jimpitan, arisan)
- data_pokja2: Pendidikan & Koperasi (paket A/B/C, KF, BKB, UP2K, koperasi)
- data_pokja3: Pangan & Sandang (beras, peternakan, perikanan, TOGA, industri RT, rumah sehat)
- data_pokja4: Kesehatan & Lingkungan (posyandu, KB, lansia, jamban, SPAL, sumber air)
- data_rekap_dawis: Rekapitulasi Dawis (catatan data & kegiatan warga per dawis dusun)
- data_bumil: Rekapitulasi ibu hamil, melahirkan, nifas, bayi
`;
}

const DB_SCHEMA = `
Tabel yang tersedia di database (semua kolom numerik bertipe INTEGER):

1. data_umum: jml_dusun, jml_pkk_rw, jml_pkk_rt, jml_dasa_wisma, jml_krt, jml_kk, jml_jiwa_l, jml_jiwa_p, jml_kader_tp_pkk_l, jml_kader_tp_pkk_p, jml_kader_umum_l, jml_kader_umum_p, jml_kader_khusus_l, jml_kader_khusus_p, jml_tenaga_honorer_l, jml_tenaga_honorer_p, jml_tenaga_bantuan_l, jml_tenaga_bantuan_p, keterangan

2. data_pokja1: kader_pkbn, kader_pkdrt, kader_pola_asuh, pkbn_jml_klp_simulasi, pkbn_jml_anggota, pkdrt_jml_klp_simulasi, pkdrt_jml_anggota, pola_asuh_jml_klp, pola_asuh_jml_anggota, lansia_jml_klp, lansia_jml_anggota, gr_kerja_bakti, gr_rukun_kematian, gr_keagamaan, gr_jimpitan, gr_arisan

3. data_pokja2: jml_warga_3_buta, paket_a_klp, paket_a_wrg, paket_b_klp, paket_b_wrg, paket_c_klp, paket_c_wrg, kf_klp, kf_wrg, paud_sejenis, taman_bacaan, klp_pembaca, bkb_klp, bkb_jml_ibu_peserta, bkb_ape_set_a, bkb_ape_set_b, kader_tutor_kf, kader_tutor_paud, kader_bkb, kader_khusus_koperasi, kader_khusus_keterampilan, yg_dilatih_lp3pkk, yg_dilatih_tp3pkk, yg_dilatih_damaspkk, up2k_pemula_klp, up2k_pemula_psrt, up2k_madya_klp, up2k_madya_psrt, up2k_utama_klp, up2k_utama_psrt, up2k_mandiri_klp, up2k_mandiri_psrt, koperasi_berbadan_hukum_kop, koperasi_berbadan_hukum_angg

4. data_pokja3: kader_pangan, kader_sandang, kader_tata_laksana_rt, pangan_beras, pangan_non_beras, pemanfaatan_peternakan, pemanfaatan_perikanan, pemanfaatan_warung_hidup, pemanfaatan_lumbung_hidup, pemanfaatan_toga, pemanfaatan_tanaman_keras, industri_pangan, industri_sandang, industri_jasa, rumah_sehat, rumah_kurang_sehat

5. data_pokja4: kader_posyandu, kader_gizi, kader_kesling, kader_penyuluh_narkoba, kader_phbs, kader_kb, posyandu_jumlah, posyandu_terintegrasi, lansia_jml_klp, lansia_jml_anggota, lansia_jml_kartu_berobat, rumah_jamban, rumah_spal, rumah_tempat_sampah, rumah_mck, air_pdam, air_sumur, air_lain, jml_pus, jml_wus, akseptor_kb_l, akseptor_kb_p, kk_tabungan

6. data_rekap_dawis: jml_rw, jml_rt, jml_dawis, jml_krt, jml_kk, jml_anggota_l, jml_anggota_p, balita_l, balita_p, pus, wus, ibu_hamil, ibu_menyusui, lansia, tiga_buta, berkebutuhan_khusus, rumah_sehat, rumah_kurang_sehat, punya_tempat_sampah, punya_spal, jamban, stiker_p4k, air_pdam, air_sumur, air_sungai, air_dll, makan_beras, makan_non_beras, ikut_up2k, ikut_pekarangan, ikut_kesling, jkn_bpjs

7. data_bumil: jml_rt, jml_rw, jml_dasa_wisma, ibu_hamil, ibu_melahirkan, ibu_nifas, ibu_meninggal, bayi_lahir_l, bayi_lahir_p, akte_l, akte_p, bayi_meninggal_l, bayi_meninggal_p, balita_meninggal_l, balita_meninggal_p

Daftar dusun yang valid (gunakan nama persis): ${DUSUN_LIST.join(', ')}
`;

// === FILE UPLOAD HANDLER ===
async function handleFileUpload(request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Sesi login telah berakhir. Silakan login kembali.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File terlalu besar (maksimal 5MB)' }, { status: 400 });
  }
  const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';
  if (!name.endsWith('.xlsx')) {
    return NextResponse.json({
      error: 'Hanya file Excel .xlsx yang didukung. File .xls lama dan .docx tidak bisa diproses.',
    }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
    return NextResponse.json({
      error: 'File bukan format Excel yang valid (.xlsx). Pastikan file tidak rusak.',
    }, { status: 400 });
  }

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return NextResponse.json({ error: 'File Excel rusak atau tidak bisa dibaca.' }, { status: 400 });
  }

  const sheetsData = [];
  wb.eachSheet((ws) => {
    if (sheetsData.length >= MAX_EXCEL_SHEETS_FOR_AI) return;
    const rows = [];
    let rowCount = 0;
    ws.eachRow({ includeEmpty: false }, (row) => {
      if (rowCount >= 100) return;
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push(cell.value !== null && cell.value !== undefined ? String(cell.value) : '');
      });
      rows.push(cells.join(' | '));
      rowCount++;
    });
    if (rows.length > 0) {
      sheetsData.push({ name: ws.name, data: rows.join('\n') });
    }
  });

  if (sheetsData.length === 0) {
    return NextResponse.json({ error: 'File Excel kosong, tidak ada data.' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'PASTE_API_KEY_ANDA_DISINI') {
    return NextResponse.json({ error: 'API Key Gemini belum dikonfigurasi.' }, { status: 400 });
  }

  const excelContent = sheetsData.map((s) => `=== Sheet: "${s.name}" ===\n${s.data}`).join('\n\n');

  const aiPrompt = `Kamu adalah parser data Excel untuk PKK Desa Belikurip. Tugasmu memetakan data Excel ke database schema.

${DB_SCHEMA}

INSTRUKSI:
1. Baca data Excel di bawah
2. Identifikasi header/kolom dan data per dusun
3. Petakan setiap kolom ke kolom database yang paling cocok
4. Untuk setiap dusun, keluarkan data yang bisa dipetakan

ATURAN KETAT:
- Hanya output JSON valid, tidak ada teks lain
- Nama dusun HARUS cocok persis dengan daftar dusun yang valid
- Jika nama dusun tidak cocok, skip dan masukkan ke "unmatched"
- Nilai numerik harus integer. Jika bukan angka, gunakan 0
- Jangan mengarang data
- Jika tidak ada data yang bisa dipetakan, kembalikan sheets: []

FORMAT OUTPUT (JSON):
{
  "sheets": [
    {
      "sheetName": "nama sheet asal",
      "table": "nama_tabel_database",
      "rows": [
        { "dusunName": "Nama Dusun", "fields": { "kolom_db": nilai_integer } }
      ],
      "unmatched": ["nama dusun yang tidak cocok"],
      "columnMapping": { "Header Excel": "kolom_db" }
    }
  ],
  "summary": "Ringkasan singkat: X sheet, Y dusun, Z kolom berhasil dipetakan",
  "warnings": ["peringatan jika ada"]
}

DATA EXCEL:
${excelContent}`;

  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(aiPrompt);
    const responseText = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return NextResponse.json({
        error: 'AI gagal menginterpretasi file Excel. Coba lagi atau gunakan format template standar.',
      }, { status: 400 });
    }

    let preview = '';
    if (parsed.summary) preview = `🤖 **AI Interpretation:** ${parsed.summary}\n\n`;

    if (parsed.sheets && parsed.sheets.length > 0) {
      for (const s of parsed.sheets) {
        preview += `📋 **${s.sheetName}** → \`${s.table}\`: ${s.rows?.length || 0} dusun`;
        if (s.columnMapping) {
          const mappedCols = Object.entries(s.columnMapping);
          preview += ` (${mappedCols.length} kolom dipetakan)`;
        }
        if (s.unmatched?.length > 0) {
          preview += `\n   ⚠️ Tidak cocok: ${s.unmatched.join(', ')}`;
        }
        preview += '\n';
      }
    } else {
      preview = '❌ AI tidak menemukan data yang bisa dipetakan ke database. Pastikan file berisi data PKK.';
    }

    if (parsed.warnings?.length > 0) {
      preview += `\n⚠️ **Peringatan:**\n${parsed.warnings.map((w) => `  • ${w}`).join('\n')}`;
    }

    // Backward-compat: ensure rows have desaName alias
    const normalizedSheets = (parsed.sheets || []).map((s) => ({
      ...s,
      table: normalizeTableName(s.table),
      rows: (s.rows || []).map((r) => ({
        ...r,
        desaName: r.desaName ?? r.dusunName,
        dusunName: r.dusunName ?? r.desaName,
      })),
    }));

    return NextResponse.json({
      type: 'import_preview',
      preview,
      parsedData: normalizedSheets,
      fileName: file.name,
    });
  } catch (error) {
    console.error('AI Excel parse error:', error);
    return NextResponse.json({
      error: 'Gagal menginterpretasi file Excel: ' + error.message,
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      return handleFileUpload(request);
    }

    const body = await request.json();
    const { message, history, tahun } = body;

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({
        error: 'Sesi login telah berakhir. Silakan login kembali.',
      }, { status: 401 });
    }

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Pesan wajib diisi' }, { status: 400 });
    }
    if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Pesan terlalu panjang. Maksimal ${MAX_CHAT_MESSAGE_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'PASTE_API_KEY_ANDA_DISINI') {
      return NextResponse.json({
        reply: '⚠️ API Key Gemini belum dikonfigurasi. Silakan isi GEMINI_API_KEY di file .env.local lalu restart server.',
      });
    }

    const userRole = authUser.role || 'user';
    const userName = authUser.username || 'Pengguna';
    const allowedTables = ROLE_PERMISSIONS[userRole] || [];
    const userDusunId = authUser.dusun_id ?? null;

    const year = parseYear(tahun || new Date().getFullYear());
    if (year.error) {
      return NextResponse.json({ error: year.error }, { status: 400 });
    }
    const currentYear = year.value;
    const ctx = await getDbContext(userRole, currentYear);

    // Resolve userDusunName untuk system prompt (kalau role kader-dusun)
    const userDusunName = userDusunId
      ? (ctx.dusun.find((d) => d.id === userDusunId)?.nama || null)
      : null;

    const contextMessage = `
DATA SELURUH TAHUN (hanya tahun ${currentYear - 1}-${currentYear + 1}):
Tahun yang tersedia: ${ctx.availableYears.join(', ')}
Daftar Dusun: ${ctx.dusun.map((d) => `${d.nama} (ID:${d.id})`).join(', ')}

${Object.entries(ctx.summaries).map(([table, rows]) => {
  if (rows.length === 0) return `${table}: Belum ada data`;
  const byYear = {};
  rows.forEach((r) => {
    if (!byYear[r.tahun]) byYear[r.tahun] = [];
    byYear[r.tahun].push(r);
  });
  return Object.entries(byYear).map(([yr, yRows]) => {
    return `${table} (Tahun ${yr}, ${yRows.length} dusun): ${JSON.stringify(yRows.map((r) => {
      const unitId = r.dusun_id ?? r.desa_id;
      const dusunObj = ctx.dusun.find((d) => d.id === unitId);
      // Strip internal fields
      const { id, dusun_id, desa_id, tahun: _t, updated_at, custom_columns, ...fields } = r; // eslint-disable-line no-unused-vars
      return { dusun: dusunObj?.nama || unitId, ...fields };
    }))}`;
  }).join('\n');
}).join('\n\n')}

Tahun yang sedang dipilih user di dashboard: ${currentYear}
`;

    const systemPrompt = buildSystemPrompt(userRole, userName, allowedTables, userDusunName);

    const updateDataDeclaration = {
      name: 'update_dusun_data',
      description: 'Update data untuk satu dusun di tabel tertentu pada tahun ini. Hanya pakai jika user secara eksplisit minta update/input data DAN punya hak akses.',
      parameters: {
        type: 'OBJECT',
        properties: {
          table_name: {
            type: 'STRING',
            description: 'Nama tabel: data_umum, data_pokja1, data_pokja2, data_pokja3, data_pokja4, data_rekap_dawis, data_bumil',
          },
          dusun_id: {
            type: 'INTEGER',
            description: 'ID dusun yang akan di-update (1..9 untuk Belikurip)',
          },
          updates: {
            type: 'OBJECT',
            description: 'Key-value pairs kolom → nilai integer. Contoh: { jml_kk: 100 }',
          },
        },
        required: ['table_name', 'dusun_id', 'updates'],
      },
    };

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      systemInstruction: systemPrompt + '\n\n' + contextMessage,
      tools: [{ functionDeclarations: [updateDataDeclaration] }],
    });

    const chatHistory = (Array.isArray(history) ? history : [])
      .slice(-MAX_CHAT_HISTORY_ITEMS)
      .map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(h.content || '').slice(0, MAX_CHAT_MESSAGE_LENGTH) }],
      }));

    const chat = model.startChat({ history: chatHistory });
    let result = await chat.sendMessage(message.trim());

    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      // Accept canonical or legacy alias
      if (call.name === 'update_dusun_data' || call.name === 'update_desa_data') {
        const { table_name: rawTable, updates } = call.args;
        // Accept dusun_id (canonical) atau desa_id (legacy)
        const rawUnitId = call.args.dusun_id ?? call.args.desa_id;
        const tableName = normalizeTableName(rawTable || '');
        let apiResponse;

        if (!VALID_TABLES.includes(rawTable) && !VALID_TABLES.includes(tableName)) {
          apiResponse = { error: `Tabel '${rawTable}' tidak valid.` };
        } else if (!allowedTables.includes(tableName) && !allowedTables.includes(rawTable)) {
          apiResponse = { error: `Akses ditolak: Role '${userRole}' tidak diizinkan mengubah tabel '${tableName}'.` };
        } else {
          const validCols = VALID_COLUMNS[tableName] || [];
          if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            apiResponse = { error: 'Payload update tidak valid.' };
          } else if (Object.keys(updates).length === 0) {
            apiResponse = { error: 'Minimal satu kolom harus diupdate.' };
          } else {
            const invalidCols = Object.keys(updates).filter((k) => !validCols.includes(k));
            if (invalidCols.length > 0) {
              apiResponse = { error: `Kolom tidak valid: ${invalidCols.join(', ')}. Kolom yang diizinkan: ${validCols.join(', ')}` };
            } else {
              const validUnitId = toBoundedInteger(rawUnitId, 'dusun_id', { min: 1, max: 2147483647 });
              if (validUnitId.error) {
                apiResponse = { error: validUnitId.error };
              } else {
                // Row-level enforcement untuk role kader-dusun
                let targetDusunId = validUnitId.value;
                if (ROLE_SCOPE[userRole] === 'own_dusun') {
                  if (userDusunId == null) {
                    apiResponse = { error: 'Akun kader-dusun belum di-assign dusun. Hubungi admin.' };
                  } else if (Number(userDusunId) !== Number(targetDusunId)) {
                    apiResponse = { error: `Anda hanya boleh edit data dusun ${userDusunName || userDusunId}, bukan dusun ID ${targetDusunId}.` };
                  }
                  targetDusunId = Number(userDusunId);
                }

                if (!apiResponse) {
                  const sanitizedUpdates = {};
                  for (const [key, value] of Object.entries(updates)) {
                    // keterangan adalah text — bypass numeric validation
                    if (key === 'keterangan') {
                      sanitizedUpdates[key] = String(value ?? '').slice(0, 1000);
                      continue;
                    }
                    const parsed = toBoundedInteger(value, key);
                    if (parsed.error) {
                      apiResponse = { error: parsed.error };
                      break;
                    }
                    sanitizedUpdates[key] = parsed.value;
                  }

                  if (!apiResponse) {
                    // Try update first using dusun_id, fallback to desa_id (legacy data row)
                    let { data: updatedRows, error } = await supabase
                      .from(tableName)
                      .update(sanitizedUpdates)
                      .eq('dusun_id', targetDusunId)
                      .eq('tahun', currentYear)
                      .select('id');

                    if (!error && (!updatedRows || updatedRows.length === 0)) {
                      const fallback = await supabase
                        .from(tableName)
                        .update(sanitizedUpdates)
                        .eq('desa_id', targetDusunId)
                        .eq('tahun', currentYear)
                        .select('id');
                      updatedRows = fallback.data;
                      error = fallback.error;
                    }

                    if (error) {
                      apiResponse = { error: `Gagal menyimpan ke database: ${error.message}` };
                    } else if (!updatedRows || updatedRows.length === 0) {
                      apiResponse = { error: `Data dusun ${targetDusunId} tahun ${currentYear} belum ada. Isi lewat halaman data atau import terlebih dahulu.` };
                    } else {
                      const dusunNama = ctx.dusun.find((d) => d.id === targetDusunId)?.nama || `dusun ${targetDusunId}`;
                      await writeLog({
                        userId: authUser.userId,
                        username: userName,
                        action: 'ai_update',
                        tableName,
                        dusunNama,
                        detail: `AI update dusun_id ${targetDusunId} tahun ${currentYear}: ${Object.keys(sanitizedUpdates).join(', ')}`,
                      });
                      apiResponse = { success: true, message: `Data ${dusunNama} di tabel ${tableName} berhasil diperbarui.` };
                    }
                  }
                }
              }
            }
          }
        }

        result = await chat.sendMessage([{
          functionResponse: {
            name: call.name,
            response: apiResponse,
          },
        }]);
      }
    }

    const reply = result.response.text();
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI Chat error:', error);

    if (error.status === 429 || (error.message && error.message.includes('Quota exceeded'))) {
      return NextResponse.json({
        reply: '⚠️ **Gagal memproses:** API Key Anda telah mencapai batas kuota. Silakan gunakan API Key lain atau pastikan project Anda memiliki Free Tier.',
      }, { status: 200 });
    }

    return NextResponse.json({
      reply: '❌ Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.',
    }, { status: 200 });
  }
}
