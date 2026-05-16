/**
 * @file PKK Assistant chat route — Google Gemini (reverted dari Claude migration).
 *
 * Model default: gemini-flash-latest (override via GEMINI_MODEL env).
 * SDK: @google/generative-ai (function calling + JSON mode).
 *
 * Endpoints:
 *   POST /api/chat              (body: { message, history, tahun })
 *   POST /api/chat (multipart)  (file upload: Excel interpretation)
 */
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';
import { getAuthUser, ROLE_PERMISSIONS } from '@/lib/auth';
import { parseYear, toBoundedInteger } from '@/lib/requestValidation';
import { writeLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MAX_CHAT_MESSAGE_LENGTH = 2000;
const MAX_CHAT_HISTORY_ITEMS = 12;
const MAX_EXCEL_SHEETS_FOR_AI = 10;

// Whitelist of tables that can be mutated via AI
const VALID_TABLES = ['data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4', 'data_kegiatan_warga', 'data_bumil'];

// Whitelist of valid column names per table (for server-side validation)
const VALID_COLUMNS = {
  data_umum: ['jml_dusun','jml_pkk_rw','jml_pkk_rt','jml_dasa_wisma','jml_krt','jml_kk','jml_jiwa_l','jml_jiwa_p','jml_kader_tp_pkk_l','jml_kader_tp_pkk_p','jml_kader_umum_l','jml_kader_umum_p','jml_kader_khusus_l','jml_kader_khusus_p'],
  data_pokja1: ['kader_pkbn','kader_pkdrt','kader_pola_asuh','pkbn_jml_klp_simulasi','pkbn_jml_anggota','pkdrt_jml_klp_simulasi','pkdrt_jml_anggota','pola_asuh_jml_klp','pola_asuh_jml_anggota','lansia_jml_klp','lansia_jml_anggota','gr_kerja_bakti','gr_rukun_kematian','gr_keagamaan','gr_jimpitan','gr_arisan'],
  data_pokja2: ['paket_a_klp','paket_a_wrg','paket_b_klp','paket_b_wrg','paket_c_klp','paket_c_wrg','taman_bacaan','usaha_mikro','up2k_pemula_klp','up2k_pemula_psrt','toko_pkk','koperasi_belum_bh_kop','koperasi_berbadan_hukum_kop','koperasi_berbadan_hukum_angg'],
  data_pokja3: ['kader_pangan','kader_sandang','kader_tata_laksana_rt','pangan_beras','pemanfaatan_peternakan','pemanfaatan_perikanan','pemanfaatan_warung_hidup','pemanfaatan_lumbung_hidup','pemanfaatan_toga','industri_pangan','industri_sandang','industri_jasa','rumah_sehat','rumah_kurang_sehat'],
  data_pokja4: ['kader_posyandu','kader_gizi','kader_kesling','kader_kb','posyandu_jumlah','posyandu_terintegrasi','lansia_jml_klp','lansia_jml_anggota','rumah_jamban','rumah_spal','air_pdam','air_sumur','jml_pus','jml_wus','akseptor_kb_l','akseptor_kb_p','kk_tabungan'],
  data_kegiatan_warga: ['jml_dusun','jml_rw','jml_rt','jml_dawis','jml_krt','jml_kk','jml_anggota_l','jml_anggota_p','balita_l','balita_p','pus','wus','ibu_hamil','ibu_menyusui','lansia','rumah_sehat','rumah_kurang_sehat','punya_tempat_sampah','punya_spal','stiker_p4k','air_pdam','air_sumur','air_sungai','air_dll','jamban','makan_beras','makan_non_beras','ikut_up2k','ikut_pekarangan','ikut_industri','ikut_kesling','jkn_bpjs'],
  data_bumil: ['ibu_hamil','ibu_melahirkan','ibu_nifas','ibu_meninggal','bayi_lahir_l','bayi_lahir_p','akte_ada','akte_tidak','bayi_meninggal_l','bayi_meninggal_p'],
};

const ROLE_LABELS = {
  admin: 'Administrator (akses penuh semua data)',
  pokja1: 'Pokja I — Penghayatan & Pengamalan Pancasila, Gotong Royong',
  pokja2: 'Pokja II — Pendidikan & Keterampilan, Koperasi',
  pokja3: 'Pokja III — Pangan, Sandang, Tata Laksana RT',
  pokja4: 'Pokja IV — Kesehatan, Kelestarian Lingkungan',
  sekretaris: 'Sekretaris — Data Umum & Data Bumil',
  user: 'User Biasa (hanya bisa melihat data)',
};

// Fetch context data from database for the AI (tahun aktif ±1).
async function getDbContext(role, tahun) {
  const currentYear = Number(tahun) || new Date().getFullYear();
  const contextYears = [currentYear - 1, currentYear, currentYear + 1];

  const { data: desa } = await supabase.from('desa').select('id, nama, nomor_urut').eq('is_active', 1).order('nomor_urut');

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
    (data || []).forEach(r => availableYears.add(r.tahun));
  }

  return { desa: desa || [], summaries, availableYears: [...availableYears].sort((a, b) => b - a) };
}

function buildSystemPrompt(userRole, userName, allowedTables) {
  const roleLabel = ROLE_LABELS[userRole] || 'Tidak diketahui';
  const canEdit = allowedTables.length > 0;
  const editableTables = allowedTables.map(t => {
    const labels = {
      data_umum: 'Data Umum',
      data_pokja1: 'Data Pokja I',
      data_pokja2: 'Data Pokja II',
      data_pokja3: 'Data Pokja III',
      data_pokja4: 'Data Pokja IV',
      data_bumil: 'Data Bumil',
    };
    return labels[t] || t;
  }).join(', ');

  return `Kamu adalah asisten AI bernama "PKK Assistant" untuk Sistem Rekapitulasi Data PKK Kecamatan Baturetno, Kabupaten Wonogiri, Jawa Tengah.

═══════════════════════════════════════════
IDENTITAS USER YANG SEDANG CHAT:
- Nama: ${userName}
- Role: ${userRole} (${roleLabel})
- Tabel yang BOLEH diedit: ${canEdit ? editableTables : 'TIDAK ADA (hanya bisa melihat)'}
═══════════════════════════════════════════

BATASAN — WAJIB DIPATUHI:
1. Kamu BOLEH menjawab pertanyaan yang berkaitan dengan:
   - Data PKK (Pokja I-IV, Data Umum, Data Bumil)
   - Administrasi desa di Kecamatan Baturetno
   - Cara menggunakan aplikasi Rekapitulasi PKK ini
   - Analisis, statistik, dan perbandingan data antar desa
   - Perhitungan dasar (penjumlahan, rata-rata, persentase, dll) — DIPERBOLEHKAN karena mendukung pekerjaan

2. Kamu HARUS MENOLAK dengan sopan jika user bertanya tentang:
   - Topik yang JELAS tidak berkaitan dengan PKK/desa/pekerjaan (resep, coding, puisi, cuaca, berita, gosip, dll)
   - Permintaan untuk membuat konten kreatif yang tidak terkait PKK
   - Pertanyaan pribadi atau di luar konteks pekerjaan
   Contoh penolakan: "Maaf, saya hanya bisa membantu hal-hal yang berkaitan dengan data PKK dan administrasi desa. Silakan tanyakan tentang data rekapitulasi! 😊"

3. ATURAN AKSES DATA — SANGAT PENTING:
   - User ini berperan sebagai: ${userRole}
   ${canEdit ? `- User ini HANYA BOLEH meminta edit/input data di: ${editableTables}` : '- User ini TIDAK BOLEH meminta edit data apapun'}
   - Jika user meminta edit data di luar haknya, TOLAK dengan jelas: "Maaf, dengan role ${userRole} Anda hanya bisa mengedit ${canEdit ? editableTables : 'tidak ada tabel'}. Hubungi admin untuk mengubah hak akses."
   - Semua user (termasuk role 'user') BOLEH MELIHAT dan BERTANYA tentang semua data

4. FITUR IMPORT EXCEL:
   - Jika user bertanya apakah kamu bisa memproses/membaca file Excel, JAWAB BAHWA KAMU BISA!
   - Arahkan user untuk mengklik **ikon penjepit kertas (attachment)** di sebelah kiri kotak ketikan chat untuk unggah file Excel (.xlsx).
   - Setelah diunggah, kamu akan otomatis memproses data dan memberi preview sebelum disimpan.

5. Selalu jawab dalam Bahasa Indonesia
6. Berikan jawaban ringkas tapi informatif
7. Format angka dengan pemisah ribuan Indonesia (titik)
8. Jangan pernah mengarang data
9. Saat menjawab pertanyaan statistik/analisis data, SELALU sertakan di akhir jawaban: "📊 Sumber: [nama_tabel] tahun [tahun]" agar user bisa memverifikasi.

KONTEKS DATABASE:
- data_umum: Data umum PKK (jumlah jiwa, KK, kader TP PKK, dasa wisma, dusun)
- data_pokja1: Penghayatan Pancasila & Gotong Royong (kader PKBN, PKDRT, pola asuh, lansia, kerja bakti, keagamaan, jimpitan, arisan)
- data_pokja2: Pendidikan & Koperasi (paket A/B/C, UP2K, toko PKK, koperasi)
- data_pokja3: Pangan & Sandang (beras, peternakan, perikanan, TOGA, industri RT, rumah sehat)
- data_pokja4: Kesehatan & Lingkungan (posyandu, KB, lansia, jamban, SPAL, sumber air)
- data_bumil: Rekapitulasi ibu hamil, melahirkan, nifas, bayi
`;
}

// Database schema description for AI interpretation of Excel import
const DB_SCHEMA = `
Tabel yang tersedia dan kolomnya (semua kolom bertipe INTEGER):

1. data_umum: jml_dusun, jml_pkk_rw, jml_pkk_rt, jml_dasa_wisma, jml_krt, jml_kk, jml_jiwa_l, jml_jiwa_p, jml_kader_tp_pkk_l, jml_kader_tp_pkk_p, jml_kader_umum_l, jml_kader_umum_p, jml_kader_khusus_l, jml_kader_khusus_p

2. data_pokja1: kader_pkbn, kader_pkdrt, kader_pola_asuh, pkbn_jml_klp_simulasi, pkbn_jml_anggota, pkdrt_jml_klp_simulasi, pkdrt_jml_anggota, pola_asuh_jml_klp, pola_asuh_jml_anggota, lansia_jml_klp, lansia_jml_anggota, gr_kerja_bakti, gr_rukun_kematian, gr_keagamaan, gr_jimpitan, gr_arisan

3. data_pokja2: paket_a_klp, paket_a_wrg, paket_b_klp, paket_b_wrg, paket_c_klp, paket_c_wrg, taman_bacaan, usaha_mikro, up2k_pemula_klp, up2k_pemula_psrt, toko_pkk, koperasi_belum_bh_kop, koperasi_berbadan_hukum_kop, koperasi_berbadan_hukum_angg

4. data_pokja3: kader_pangan, kader_sandang, kader_tata_laksana_rt, pangan_beras, pemanfaatan_peternakan, pemanfaatan_perikanan, pemanfaatan_warung_hidup, pemanfaatan_lumbung_hidup, pemanfaatan_toga, industri_pangan, industri_sandang, industri_jasa, rumah_sehat, rumah_kurang_sehat

5. data_pokja4: kader_posyandu, kader_gizi, kader_kesling, kader_kb, posyandu_jumlah, posyandu_terintegrasi, lansia_jml_klp, lansia_jml_anggota, rumah_jamban, rumah_spal, air_pdam, air_sumur, jml_pus, jml_wus, akseptor_kb_l, akseptor_kb_p, kk_tabungan

6. data_bumil: ibu_hamil, ibu_melahirkan, ibu_nifas, ibu_meninggal, bayi_lahir_l, bayi_lahir_p, akte_ada, akte_tidak, bayi_meninggal_l, bayi_meninggal_p

Daftar desa yang valid (gunakan nama persis ini): Setorejo, Kedungombo, Boto, Sendangrejo, Talunombo, Baturetno, Saradan, Temon, Belikurip, Watuagung, Balepanjang, Gambirnom, Glesung Rejo
`;

// === FILE UPLOAD HANDLER (AI-powered interpretation) ===
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

  const excelContent = sheetsData.map(s => `=== Sheet: "${s.name}" ===\n${s.data}`).join('\n\n');

  const aiPrompt = `Kamu adalah parser data Excel. Tugasmu adalah memetakan data dari file Excel ke database schema yang diberikan.

${DB_SCHEMA}

INSTRUKSI:
1. Baca data Excel di bawah ini
2. Identifikasi header/kolom dan data per desa
3. Petakan setiap kolom ke kolom database yang paling cocok
4. Untuk setiap desa, keluarkan data yang bisa dipetakan

ATURAN KETAT:
- Hanya output JSON valid, tidak ada teks lain
- Nama desa HARUS cocok persis dengan daftar desa yang valid
- Jika nama desa tidak cocok, skip desa tersebut dan masukkan ke "unmatched"
- Nilai harus berupa angka (integer). Jika bukan angka, gunakan 0
- Jangan mengarang data. Jika kolom tidak bisa dipetakan, abaikan saja
- Jika tidak ada data yang bisa dipetakan sama sekali, kembalikan sheets: []

FORMAT OUTPUT (JSON):
{
  "sheets": [
    {
      "sheetName": "nama sheet asal",
      "table": "nama_tabel_database",
      "rows": [
        { "desaName": "Nama Desa", "fields": { "kolom_db": nilai_integer } }
      ],
      "unmatched": ["nama desa yang tidak cocok"],
      "columnMapping": { "Header Excel": "kolom_db" }
    }
  ],
  "summary": "Ringkasan singkat: X sheet, Y desa, Z kolom berhasil dipetakan",
  "warnings": ["peringatan jika ada"]
}

DATA EXCEL:
${excelContent}`;

  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
      },
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
        preview += `📋 **${s.sheetName}** → \`${s.table}\`: ${s.rows?.length || 0} desa`;
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
      preview += `\n⚠️ **Peringatan:**\n${parsed.warnings.map(w => `  • ${w}`).join('\n')}`;
    }

    return NextResponse.json({
      type: 'import_preview',
      preview,
      parsedData: parsed.sheets || [],
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

    const year = parseYear(tahun || new Date().getFullYear());
    if (year.error) {
      return NextResponse.json({ error: year.error }, { status: 400 });
    }
    const currentYear = year.value;
    const ctx = await getDbContext(userRole, currentYear);

    const contextMessage = `
DATA SELURUH TAHUN (hanya tahun ${currentYear - 1}-${currentYear + 1}):
Tahun yang tersedia: ${ctx.availableYears.join(', ')}
Daftar Desa: ${ctx.desa.map(d => `${d.nama} (ID:${d.id})`).join(', ')}

${Object.entries(ctx.summaries).map(([table, rows]) => {
  if (rows.length === 0) return `${table}: Belum ada data`;
  const byYear = {};
  rows.forEach(r => {
    if (!byYear[r.tahun]) byYear[r.tahun] = [];
    byYear[r.tahun].push(r);
  });
  return Object.entries(byYear).map(([yr, yRows]) => {
    return `${table} (Tahun ${yr}, ${yRows.length} desa): ${JSON.stringify(yRows.map(r => {
      const desaObj = ctx.desa.find(d => d.id === r.desa_id);
      const { id, desa_id, tahun: t, updated_at, custom_columns, ...fields } = r;
      return { desa: desaObj?.nama || r.desa_id, ...fields };
    }))}`;
  }).join('\n');
}).join('\n\n')}

Tahun yang sedang dipilih user di dashboard: ${currentYear}
`;

    const systemPrompt = buildSystemPrompt(userRole, userName, allowedTables);

    const updateDataDeclaration = {
      name: 'update_desa_data',
      description: 'Update data for a specific desa in a specific table for the current year. Only use this if the user has explicitly asked to update/input data AND has the right access.',
      parameters: {
        type: 'OBJECT',
        properties: {
          table_name: {
            type: 'STRING',
            description: 'Nama tabel (harus salah satu dari: data_umum, data_pokja1, data_pokja2, data_pokja3, data_pokja4, data_kegiatan_warga, data_bumil)',
          },
          desa_id: {
            type: 'INTEGER',
            description: 'ID desa yang akan di-update',
          },
          updates: {
            type: 'OBJECT',
            description: 'Key-value pairs kolom → nilai integer. Contoh: { jml_kk: 100 }',
          },
        },
        required: ['table_name', 'desa_id', 'updates'],
      },
    };

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      systemInstruction: systemPrompt + '\n\n' + contextMessage,
      tools: [{ functionDeclarations: [updateDataDeclaration] }],
    });

    const chatHistory = (Array.isArray(history) ? history : []).slice(-MAX_CHAT_HISTORY_ITEMS).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(h.content || '').slice(0, MAX_CHAT_MESSAGE_LENGTH) }],
    }));

    const chat = model.startChat({ history: chatHistory });
    let result = await chat.sendMessage(message.trim());

    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];

      if (call.name === 'update_desa_data') {
        const { table_name, desa_id, updates } = call.args;
        let apiResponse;

        if (!VALID_TABLES.includes(table_name)) {
          apiResponse = { error: `Tabel '${table_name}' tidak valid.` };
        } else if (!allowedTables.includes(table_name)) {
          apiResponse = { error: `Akses ditolak: Role '${userRole}' tidak diizinkan mengubah tabel '${table_name}'.` };
        } else {
          const validCols = VALID_COLUMNS[table_name] || [];
          if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            apiResponse = { error: 'Payload update tidak valid.' };
          } else if (Object.keys(updates).length === 0) {
            apiResponse = { error: 'Minimal satu kolom harus diupdate.' };
          } else {
            const invalidCols = Object.keys(updates).filter(k => !validCols.includes(k));
            if (invalidCols.length > 0) {
              apiResponse = { error: `Kolom tidak valid: ${invalidCols.join(', ')}. Kolom yang diizinkan: ${validCols.join(', ')}` };
            } else {
              const validDesaId = toBoundedInteger(desa_id, 'desa_id', { min: 1, max: 2147483647 });
              if (validDesaId.error) {
                apiResponse = { error: validDesaId.error };
              } else {
                const sanitizedUpdates = {};
                for (const [key, value] of Object.entries(updates)) {
                  const parsed = toBoundedInteger(value, key);
                  if (parsed.error) {
                    apiResponse = { error: parsed.error };
                    break;
                  }
                  sanitizedUpdates[key] = parsed.value;
                }

                if (!apiResponse) {
                  const { data: updatedRows, error } = await supabase
                    .from(table_name)
                    .update(sanitizedUpdates)
                    .eq('desa_id', validDesaId.value)
                    .eq('tahun', currentYear)
                    .select('id');

                  if (error) {
                    apiResponse = { error: `Gagal menyimpan ke database: ${error.message}` };
                  } else if (!updatedRows || updatedRows.length === 0) {
                    apiResponse = { error: `Data desa ${validDesaId.value} tahun ${currentYear} belum ada. Isi lewat halaman data atau import terlebih dahulu.` };
                  } else {
                    await writeLog({
                      userId: authUser.userId,
                      username: userName,
                      action: 'ai_update',
                      tableName: table_name,
                      detail: `AI update desa_id ${validDesaId.value} tahun ${currentYear}: ${Object.keys(sanitizedUpdates).join(', ')}`,
                    });
                    apiResponse = { success: true, message: `Data desa ${validDesaId.value} di tabel ${table_name} berhasil diperbarui.` };
                  }
                }
              }
            }
          }
        }

        result = await chat.sendMessage([{
          functionResponse: {
            name: 'update_desa_data',
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
        reply: '⚠️ **Gagal memproses:** API Key Anda telah mencapai batas kuota (Quota Exceeded). Silakan gunakan API Key dari akun Google lain atau pastikan project Anda memiliki akses Free Tier.',
      }, { status: 200 });
    }

    return NextResponse.json({
      reply: '❌ Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.',
    }, { status: 200 });
  }
}
