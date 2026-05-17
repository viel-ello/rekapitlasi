/**
 * @file Template Excel Download API
 * GET /api/export/template?table=data_umum
 * Generates a blank .xlsx template dengan headers + nama dusun prefilled.
 *
 * Migration v5: kolom & label diambil dari `lib/dataPages.js` (canonical),
 * tabel `data_kegiatan_warga` di-alias ke `data_rekap_dawis`.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { requireAuth, normalizeTableName } from '@/lib/auth';
import { SHEET_MAP } from '@/lib/excel/sheetMap';
import { DATA_PAGES } from '@/lib/dataPages';

export const dynamic = 'force-dynamic';

// Build column metadata dari DATA_PAGES (single source of truth)
const TABLE_COLUMNS = (() => {
  const map = {};
  for (const page of Object.values(DATA_PAGES)) {
    map[page.tableName] = page.columns.map((c) => ({ key: c.key, label: c.label }));
  }
  // Backward-compat alias
  if (map.data_rekap_dawis) {
    map.data_kegiatan_warga = map.data_rekap_dawis;
  }
  return map;
})();

const TABLE_LABELS = {
  data_umum: 'Data Umum PKK',
  data_pokja1: 'POKJA I — Pancasila & Gotong Royong',
  data_pokja2: 'POKJA II — Pendidikan & Koperasi',
  data_pokja3: 'POKJA III — Pangan & Sandang',
  data_pokja4: 'POKJA IV — Kesehatan & Lingkungan',
  data_bumil: 'Rekapitulasi Bumil',
  data_rekap_dawis: 'Rekapitulasi Dawis',
  data_kegiatan_warga: 'Rekapitulasi Dawis',
};

// Find SHEET_MAP key for a given table name
function sheetNameForTable(tableName) {
  const canonical = normalizeTableName(tableName);
  for (const [sheetName, def] of Object.entries(SHEET_MAP)) {
    if (def.table === canonical && sheetName !== 'KEGIATAN WARGA') return sheetName;
  }
  return canonical.toUpperCase().replace('DATA_', '').replace('_', ' ');
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tableNameRaw = searchParams.get('table');
    const tableName = normalizeTableName(tableNameRaw || '');

    if (!tableName || !TABLE_COLUMNS[tableName]) {
      return NextResponse.json(
        { error: 'Parameter table tidak valid. Pilih: ' + Object.keys(TABLE_COLUMNS).filter((t) => t !== 'data_kegiatan_warga').join(', ') },
        { status: 400 }
      );
    }

    const rawCols = TABLE_COLUMNS[tableName];
    const unitLabel = 'Nama Dusun';

    // Fetch dusun list (sebelumnya desa)
    const { data: dusunList } = await supabase
      .from('dusun')
      .select('nama, nomor_urut')
      .eq('is_active', 1)
      .order('nomor_urut');

    // Fetch dynamic columns
    const { data: dynCols } = await supabase.from('table_schemas').select('*').eq('table_name', tableName);

    // Fetch overrides (rename/hide)
    const { data: overrides } = await supabase.from('table_column_overrides').select('*').eq('table_name', tableName);
    const overrideMap = {};
    (overrides || []).forEach((o) => { overrideMap[o.column_key] = o; });

    const cols = rawCols
      .filter((c) => !overrideMap[c.key]?.is_hidden)
      .map((c) => ({
        key: c.key,
        label: overrideMap[c.key]?.label_override?.trim() || c.label,
      }));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistem Rekapitulasi PKK Desa Belikurip';
    wb.created = new Date();

    const sheetName = sheetNameForTable(tableName);
    const ws = wb.addWorksheet(sheetName);

    const totalCols = 2 + cols.length + (dynCols || []).length;
    const titleRow = ws.addRow([`TEMPLATE — ${TABLE_LABELS[tableName] || tableName}`]);
    ws.mergeCells(1, 1, 1, totalCols);
    titleRow.getCell(1).font = { bold: true, size: 14, name: 'Arial' };
    titleRow.getCell(1).alignment = { horizontal: 'center' };

    const subtitleRow = ws.addRow(['TP PKK Desa Belikurip · Kecamatan Baturetno · Kabupaten Wonogiri']);
    ws.mergeCells(2, 1, 2, totalCols);
    subtitleRow.getCell(1).font = { italic: true, size: 10, name: 'Arial', color: { argb: 'FF555555' } };
    subtitleRow.getCell(1).alignment = { horizontal: 'center' };

    const instrRow = ws.addRow([`Isi data pada kolom yang tersedia. Jangan mengubah header atau ${unitLabel.toLowerCase()}.`]);
    ws.mergeCells(3, 1, 3, totalCols);
    instrRow.getCell(1).font = { italic: true, size: 10, name: 'Arial', color: { argb: 'FF999999' } };
    instrRow.getCell(1).alignment = { horizontal: 'center' };

    ws.addRow([]);

    // Header row
    const headers = ['No', unitLabel, ...cols.map((c) => c.label), ...(dynCols || []).map((c) => c.column_label)];
    const hdrRow = ws.addRow(headers);
    const HF = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D7377' } };
    const BD = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    hdrRow.eachCell((c) => {
      c.fill = HF;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = BD;
    });

    // Column widths
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 20;
    for (let i = 3; i <= totalCols; i++) ws.getColumn(i).width = 14;

    // Dusun rows (empty data)
    (dusunList || []).forEach((d, i) => {
      const row = ws.addRow([i + 1, d.nama, ...new Array(cols.length + (dynCols || []).length).fill('')]);
      row.eachCell((c) => {
        c.font = { size: 10, name: 'Arial' };
        c.border = BD;
      });
      row.getCell(2).font = { size: 10, name: 'Arial', bold: true };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `Template_${sheetName.replace(/\s+/g, '_')}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Template export error:', error);
    return NextResponse.json({ error: 'Gagal membuat template' }, { status: 500 });
  }
}
