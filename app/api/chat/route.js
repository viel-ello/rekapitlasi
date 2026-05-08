import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Role → allowed tables mapping
const ROLE_TABLE_MAP = {
  admin: ['data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4', 'data_bumil'],
  pokja1: ['data_pokja1'],
  pokja2: ['data_pokja2'],
  pokja3: ['data_pokja3'],
  pokja4: ['data_pokja4'],
  sekretaris: ['data_umum', 'data_bumil'],
  user: [],
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

// Fetch context data from database for the AI
async function getDbContext(tahun, role) {
  const { data: desa } = await supabase.from('desa').select('id, nama, nomor_urut').eq('is_active', 1).order('nomor_urut');

  const allowedTables = ROLE_TABLE_MAP[role] || [];
  const allTables = ['data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4'];
  const summaries = {};

  for (const t of allTables) {
    const { data } = await supabase.from(t).select('*').eq('tahun', tahun);
    summaries[t] = data || [];
  }

  return { desa: desa || [], summaries, tahun, allowedTables };
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
   - Perhitungan dasar: penjumlahan, pengurangan, perkalian, pembagian, rata-rata, persentase, dan operasi statistik lainnya (ini DIPERBOLEHKAN karena mendukung pekerjaan pengguna)

2. Kamu HARUS MENOLAK dengan sopan jika user bertanya tentang:
   - Topik yang JELAS tidak berkaitan dengan PKK/desa/pekerjaan (misalnya: resep masakan, coding, puisi, cuaca, berita, hiburan, gosip, dll)
   - Permintaan untuk membuat konten kreatif yang tidak terkait PKK
   - Pertanyaan pribadi atau di luar konteks pekerjaan
   Contoh penolakan: "Maaf, saya hanya bisa membantu hal-hal yang berkaitan dengan data PKK dan administrasi desa. Silakan tanyakan tentang data rekapitulasi! 😊"

3. ATURAN AKSES DATA — INI SANGAT PENTING:
   - User ini berperan sebagai: ${userRole}
   ${canEdit ? `- User ini HANYA BOLEH meminta edit/input data di: ${editableTables}` : '- User ini TIDAK BOLEH meminta edit data apapun'}
   - Jika user meminta edit data di luar haknya, TOLAK dan jelaskan: "Maaf, dengan role ${userRole} Anda hanya bisa mengedit ${canEdit ? editableTables : 'tidak ada tabel'}. Hubungi admin untuk mengubah hak akses."
   - Semua user (termasuk role 'user') BOLEH MELIHAT dan BERTANYA tentang semua data

4. Selalu jawab dalam Bahasa Indonesia
5. Berikan jawaban yang ringkas tapi informatif
6. Format angka dengan pemisah ribuan Indonesia (titik)
7. Jangan pernah membuat/mengarang data palsu

KONTEKS DATABASE:
- data_umum: Data umum PKK (jumlah jiwa, KK, kader TP PKK, dasa wisma, dusun, dll)
- data_pokja1: Penghayatan Pancasila & Gotong Royong (kader PKBN, PKDRT, pola asuh, simulasi, lansia, kerja bakti, keagamaan, jimpitan, arisan)
- data_pokja2: Pendidikan & Koperasi (paket A/B/C, UP2K, toko PKK, koperasi)
- data_pokja3: Pangan & Sandang (beras, peternakan, perikanan, TOGA, industri RT, rumah sehat)
- data_pokja4: Kesehatan & Lingkungan (posyandu, KB, lansia, jamban, SPAL, sumber air)
- data_bumil: Rekapitulasi ibu hamil, melahirkan, nifas, bayi
`;
}

export async function POST(request) {
  try {
    const { message, history, tahun, user } = await request.json();

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'PASTE_API_KEY_ANDA_DISINI') {
      return NextResponse.json({
        reply: '⚠️ API Key Gemini belum dikonfigurasi. Silakan isi GEMINI_API_KEY di file .env.local lalu restart server.'
      });
    }

    // Extract user info
    const userRole = user?.role || 'user';
    const userName = user?.nama_lengkap || user?.username || 'Pengguna';
    const allowedTables = ROLE_TABLE_MAP[userRole] || [];

    // Get database context
    const currentYear = tahun || new Date().getFullYear();
    const ctx = await getDbContext(currentYear, userRole);

    const contextMessage = `
DATA SAAT INI (Tahun ${ctx.tahun}):
Daftar Desa: ${ctx.desa.map(d => `${d.nama} (ID:${d.id})`).join(', ')}

${Object.entries(ctx.summaries).map(([table, rows]) => {
  if (rows.length === 0) return `${table}: Belum ada data`;
  return `${table} (${rows.length} baris): ${JSON.stringify(rows.map(r => {
    const desaObj = ctx.desa.find(d => d.id === r.desa_id);
    const { id, desa_id, tahun: t, updated_at, custom_columns, ...fields } = r;
    return { desa: desaObj?.nama || r.desa_id, ...fields };
  }).slice(0, 5))}${rows.length > 5 ? '... dan seterusnya' : ''}`;
}).join('\n\n')}
`;

    const systemPrompt = buildSystemPrompt(userRole, userName, allowedTables);

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: systemPrompt + '\n\n' + contextMessage,
    });

    // Build chat history
    const chatHistory = (history || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI Chat error:', error);
    
    // Check if it's a quota error
    if (error.status === 429 || (error.message && error.message.includes('Quota exceeded'))) {
      return NextResponse.json({
        reply: '⚠️ **Gagal memproses:** API Key Anda telah mencapai batas kuota (Quota Exceeded). Silakan gunakan API Key dari akun Google lain atau pastikan project Anda memiliki akses Free Tier.'
      }, { status: 200 });
    }

    return NextResponse.json({
      reply: '❌ Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.'
    }, { status: 200 });
  }
}
