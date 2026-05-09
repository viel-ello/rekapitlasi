/**
 * @file Import Confirm API — Executes the actual database import
 * POST /api/chat/import-confirm
 * Auth-protected. Re-resolves desaId on server. No AI involvement.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import { importToSupabase } from '@/lib/excel/importToSupabase';
import { ROLE_TABLE_MAP } from '@/lib/excel/sheetMap';

export async function POST(request) {
  try {
    // 1. Auth check — MANDATORY
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Sesi login telah berakhir' }, { status: 401 });
    }

    const { parsedData, tahun } = await request.json();

    // 2. Validate tahun (server-side, don't trust client)
    const tahunNum = Number(tahun);
    if (!Number.isInteger(tahunNum) || tahunNum < 2020 || tahunNum > 2030) {
      return NextResponse.json({ error: 'Tahun tidak valid (harus antara 2020-2030)' }, { status: 400 });
    }

    // 3. Validate parsedData exists
    if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diimport' }, { status: 400 });
    }

    // 4. Fetch desaList for server-side re-resolution
    const { data: desaList, error: desaError } = await supabase
      .from('desa').select('id, nama, nomor_urut')
      .eq('is_active', 1).order('nomor_urut');
    if (desaError) throw desaError;

    // 5. Determine allowed tables from authenticated role
    const allowedTables = ROLE_TABLE_MAP[authUser.role] || [];

    // 6. Execute batch upsert (service function, re-resolves desaId)
    const results = await importToSupabase(parsedData, tahunNum, allowedTables, desaList || []);

    // 7. Template summary (NO Gemini call — purely deterministic)
    const totalSuccess = results.reduce((s, r) => s + (r.success || 0), 0);
    const totalFailed = results.reduce((s, r) => s + (r.failed || 0), 0);
    const importedSheets = results.filter(r => !r.skipped && r.success > 0);
    const skippedSheets = results.filter(r => r.skipped);
    const unmatchedAll = [...new Set(results.flatMap(r => r.unmatched || []))];

    let summary = `✅ **Import selesai untuk tahun ${tahunNum}.**\n\n`;

    if (importedSheets.length > 0) {
      summary += `📊 **${totalSuccess} baris** berhasil diimpor dari **${importedSheets.length} sheet**:\n`;
      importedSheets.forEach(s => {
        summary += `  • ${s.sheet}: ${s.success} desa ✅\n`;
      });
    }

    if (totalFailed > 0) {
      summary += `\n❌ **${totalFailed} baris gagal:**\n`;
      results.filter(r => r.failed > 0 && r.error).forEach(s => {
        summary += `  • ${s.sheet}: ${s.error}\n`;
      });
    }

    if (skippedSheets.length > 0) {
      summary += `\n🚫 **Sheet dilewati** (akses ditolak untuk role "${authUser.role}"):\n`;
      skippedSheets.forEach(s => {
        summary += `  • ${s.sheet}\n`;
      });
    }

    if (unmatchedAll.length > 0) {
      summary += `\n⚠️ **Nama desa tidak cocok:** ${unmatchedAll.join(', ')}\n`;
    }

    // 8. Audit log
    if (totalSuccess > 0) {
      writeLog({
        userId: authUser.userId, username: authUser.username,
        action: 'import', tableName: 'multiple',
        detail: `Import Excel via chatbot: ${totalSuccess} sukses, ${totalFailed} gagal, tahun ${tahunNum}`,
      });
    }

    return NextResponse.json({ type: 'import_result', summary, results });

  } catch (error) {
    console.error('Import confirm error:', error);
    return NextResponse.json({
      error: 'Gagal melakukan import: ' + error.message,
    }, { status: 500 });
  }
}
