/**
 * @file Import Preview API
 * POST /api/import/preview
 * Compares parsed Excel data against database to generate a diff preview
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { buildImportDiff } from '@/lib/excel/previewDiff';
import { parseYear, validateImportPayload } from '@/lib/requestValidation';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const body = await request.json();
    const { parsedData, tahun } = body;

    if (!parsedData || !tahun) {
      return NextResponse.json({ error: 'Data dan tahun harus diisi' }, { status: 400 });
    }

    const year = parseYear(tahun);
    if (year.error) {
      return NextResponse.json({ error: year.error }, { status: 400 });
    }

    const importPayload = validateImportPayload(parsedData);
    if (importPayload.error) {
      return NextResponse.json({ error: importPayload.error }, { status: 400 });
    }

    const { diff } = await buildImportDiff(parsedData, year.value, user);

    return NextResponse.json({ diff });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: 'Gagal membuat preview: ' + error.message }, { status: 500 });
  }
}
