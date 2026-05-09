/**
 * @file Import Excel API (Panel Admin)
 * POST /api/import/excel — Upload an exported Excel file to auto-fill database
 * Refactored to use shared lib/excel/* functions
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import { parseExcel } from '@/lib/excel/parseExcel';
import { importToSupabase } from '@/lib/excel/importToSupabase';
import { ROLE_TABLE_MAP } from '@/lib/excel/sheetMap';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sesi login telah berakhir' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const tahun = Number(formData.get('tahun') || new Date().getFullYear());

    if (!file) {
      return NextResponse.json({ error: 'File Excel harus diunggah' }, { status: 400 });
    }

    // Validate tahun
    if (!Number.isInteger(tahun) || tahun < 2020 || tahun > 2030) {
      return NextResponse.json({ error: 'Tahun tidak valid (2020-2030)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes (.xlsx = PK zip format)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
      return NextResponse.json({ error: 'File bukan format Excel yang valid' }, { status: 400 });
    }

    // Fetch desa list
    const { data: desaList, error: desaError } = await supabase
      .from('desa').select('id, nama, nomor_urut')
      .eq('is_active', 1).order('nomor_urut');
    if (desaError) throw desaError;

    // Parse Excel (pure function)
    const parsed = await parseExcel(buffer, desaList || []);

    // Import to Supabase (service function)
    const allowedTables = ROLE_TABLE_MAP[user.role] || [];
    const results = await importToSupabase(parsed.sheets, tahun, allowedTables, desaList || []);

    const totalSuccess = results.reduce((s, r) => s + (r.success || 0), 0);
    const totalFailed = results.reduce((s, r) => s + (r.failed || 0), 0);

    // Audit log
    for (const r of results) {
      if (!r.skipped && r.success > 0) {
        writeLog({
          userId: user.userId, username: user.username,
          action: 'import', tableName: r.table,
          detail: `Import Excel sheet "${r.sheet}" tahun ${tahun}: ${r.success} baris`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${totalSuccess} baris data berhasil diimpor${totalFailed > 0 ? `, ${totalFailed} gagal` : ''}`,
      imported: totalSuccess,
      results,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Gagal mengimpor Excel: ' + error.message }, { status: 500 });
  }
}
