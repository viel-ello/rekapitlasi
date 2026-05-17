/**
 * @file Confirm Excel Import API
 * POST /api/import/confirm — saves only rows yang di-preview sebagai insert/update.
 *
 * Migration v5: parameter `selectedDusunIds` canonical, `selectedDesaIds` alias.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import { ROLE_TABLE_MAP } from '@/lib/excel/sheetMap';
import { importToSupabase } from '@/lib/excel/importToSupabase';
import { buildImportDiff, sheetsFromDiff } from '@/lib/excel/previewDiff';
import { parseYear, validateImportPayload } from '@/lib/requestValidation';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const body = await request.json();
    const { parsedData, tahun } = body;
    const selectedRaw = body.selectedDusunIds ?? body.selectedDesaIds;

    if (!Array.isArray(parsedData) || !tahun) {
      return NextResponse.json({ error: 'Data import dan tahun harus diisi' }, { status: 400 });
    }

    const year = parseYear(tahun);
    if (year.error) {
      return NextResponse.json({ error: year.error }, { status: 400 });
    }
    const targetYear = year.value;

    const importPayload = validateImportPayload(parsedData);
    if (importPayload.error) {
      return NextResponse.json({ error: importPayload.error }, { status: 400 });
    }

    const { diff, dusunList } = await buildImportDiff(parsedData, targetYear, user);

    // Validasi & sanitize selection: { [tableName]: number[] }
    let selection = null;
    if (selectedRaw && typeof selectedRaw === 'object' && !Array.isArray(selectedRaw)) {
      selection = {};
      for (const [t, ids] of Object.entries(selectedRaw)) {
        if (typeof t !== 'string') continue;
        if (!Array.isArray(ids)) continue;
        const cleaned = ids.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
        if (cleaned.length > 0) selection[t] = cleaned;
      }
      if (Object.keys(selection).length === 0) selection = null;
    }

    const sheetsToImport = sheetsFromDiff(diff, selection);

    if (sheetsToImport.length === 0) {
      const failed = diff.reduce((sum, sheet) => sum + (sheet.counts?.error || 0), 0);
      return NextResponse.json({
        success: failed === 0,
        message: failed > 0
          ? `Tidak ada data yang disimpan. Masih ada ${failed} baris gagal di preview.`
          : 'Tidak ada perubahan baru untuk disimpan.',
        imported: 0,
        results: [],
        diff,
      }, { status: failed > 0 ? 400 : 200 });
    }

    const allowedTables = ROLE_TABLE_MAP[user.role] || [];
    const results = await importToSupabase(sheetsToImport, targetYear, allowedTables, dusunList);
    const totalSuccess = results.reduce((sum, result) => sum + (result.success || 0), 0);
    const totalFailed = results.reduce((sum, result) => sum + (result.failed || 0), 0);

    for (const result of results) {
      if (!result.skipped && result.success > 0) {
        await writeLog({
          userId: user.userId,
          username: user.username,
          action: 'import',
          tableName: result.table,
          detail: `Import Excel sheet "${result.sheet}" tahun ${targetYear}: ${result.success} baris`,
        });
      }
    }

    return NextResponse.json({
      success: totalFailed === 0,
      message: `${totalSuccess} baris data berhasil disimpan${totalFailed > 0 ? `, ${totalFailed} gagal` : ''}.`,
      imported: totalSuccess,
      results,
      diff,
    }, { status: totalFailed > 0 ? 207 : 200 });
  } catch (error) {
    console.error('Import confirm error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan hasil import: ' + error.message }, { status: 500 });
  }
}
