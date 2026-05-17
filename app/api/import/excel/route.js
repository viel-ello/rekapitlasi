/**
 * @file Import Excel API (Panel Admin)
 * POST /api/import/excel - upload an Excel file and return preview/diff only.
 * Database writes happen only in /api/import/confirm after user confirmation.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { parseExcel } from '@/lib/excel/parseExcel';
import { buildImportDiff } from '@/lib/excel/previewDiff';
import { parseYear } from '@/lib/requestValidation';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const formData = await request.formData();
    const file = formData.get('file');
    const tahunResult = parseYear(formData.get('tahun') || new Date().getFullYear());

    if (!file) {
      return NextResponse.json({ error: 'File Excel harus diunggah' }, { status: 400 });
    }

    if (tahunResult.error) {
      return NextResponse.json({ error: tahunResult.error }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'File terlalu besar (maksimal 5MB)' }, { status: 400 });
    }

    const fileName = typeof file.name === 'string' ? file.name.toLowerCase() : '';
    if (!fileName.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Hanya file Excel .xlsx yang didukung' }, { status: 400 });
    }
    const tahun = tahunResult.value;

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
      return NextResponse.json({ error: 'File bukan format Excel yang valid' }, { status: 400 });
    }

    const { data: dusunList, error: dusunError } = await supabase
      .from('dusun')
      .select('id, nama, nomor_urut')
      .eq('is_active', 1)
      .order('nomor_urut');

    if (dusunError) throw dusunError;

    const parsed = await parseExcel(buffer, dusunList || []);
    const { diff } = await buildImportDiff(parsed.sheets, tahun, user);

    return NextResponse.json({
      type: 'import_preview',
      fileName: file.name,
      parsedData: parsed.sheets,
      diff,
      parseErrors: parsed.errors || [],
      message: 'Preview import berhasil dibuat. Data belum disimpan.',
    });
  } catch (error) {
    console.error('Import preview error:', error);
    return NextResponse.json({ error: 'Gagal membuat preview import: ' + error.message }, { status: 500 });
  }
}
