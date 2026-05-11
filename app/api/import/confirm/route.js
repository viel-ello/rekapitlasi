/**
 * @file Confirm Excel Import API
 * POST /api/import/confirm - saves only rows that were previewed as insert/update.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import { ROLE_TABLE_MAP } from '@/lib/excel/sheetMap';
import { importToSupabase } from '@/lib/excel/importToSupabase';
import { buildImportDiff, sheetsFromDiff } from '@/lib/excel/previewDiff';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { parsedData, tahun } = await request.json();
    const targetYear = Number(tahun);

    if (!Array.isArray(parsedData) || !targetYear) {
      return NextResponse.json({ error: 'Data import dan tahun harus diisi' }, { status: 400 });
    }

    if (!Number.isInteger(targetYear) || targetYear < 2020 || targetYear > 2030) {
      return NextResponse.json({ error: 'Tahun tidak valid (2020-2030)' }, { status: 400 });
    }

    const { diff, desaList } = await buildImportDiff(parsedData, targetYear, user);
    const sheetsToImport = sheetsFromDiff(diff);

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
    const results = await importToSupabase(sheetsToImport, targetYear, allowedTables, desaList);
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
