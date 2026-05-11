/**
 * @file Template Excel Download API
 * GET /api/export/template?table=data_umum
 * Generates a blank .xlsx template with headers + desa names prefilled
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { requireAuth } from '@/lib/auth';
import { SHEET_MAP } from '@/lib/excel/sheetMap';

export const dynamic = 'force-dynamic';

// Column definitions per table (same as export)
const TABLE_COLUMNS = {
  data_umum: [
    { key: 'jml_dusun', label: 'Dusun' }, { key: 'jml_pkk_rw', label: 'PKK RW' }, { key: 'jml_pkk_rt', label: 'PKK RT' },
    { key: 'jml_dasa_wisma', label: 'Dasa Wisma' }, { key: 'jml_krt', label: 'KRT' }, { key: 'jml_kk', label: 'KK' },
    { key: 'jml_jiwa_l', label: 'Jiwa (L)' }, { key: 'jml_jiwa_p', label: 'Jiwa (P)' },
    { key: 'jml_kader_tp_pkk_l', label: 'Kdr TPP (L)' }, { key: 'jml_kader_tp_pkk_p', label: 'Kdr TPP (P)' },
    { key: 'jml_kader_umum_l', label: 'Kdr Umum (L)' }, { key: 'jml_kader_umum_p', label: 'Kdr Umum (P)' },
    { key: 'jml_kader_khusus_l', label: 'Kdr Khusus (L)' }, { key: 'jml_kader_khusus_p', label: 'Kdr Khusus (P)' },
  ],
  data_pokja1: [
    { key: 'kader_pkbn', label: 'Kdr PKBN' }, { key: 'kader_pkdrt', label: 'Kdr PKDRT' }, { key: 'kader_pola_asuh', label: 'Kdr PA' },
    { key: 'pkbn_jml_klp_simulasi', label: 'PKBN Klp' }, { key: 'pkbn_jml_anggota', label: 'PKBN Angg' },
    { key: 'pkdrt_jml_klp_simulasi', label: 'PKDRT Klp' }, { key: 'pkdrt_jml_anggota', label: 'PKDRT Angg' },
    { key: 'pola_asuh_jml_klp', label: 'PA Klp' }, { key: 'pola_asuh_jml_anggota', label: 'PA Angg' },
    { key: 'lansia_jml_klp', label: 'Lansia Klp' }, { key: 'lansia_jml_anggota', label: 'Lansia Angg' },
    { key: 'gr_kerja_bakti', label: 'K.Bakti' }, { key: 'gr_rukun_kematian', label: 'R.Kematian' },
    { key: 'gr_keagamaan', label: 'Keagamaan' }, { key: 'gr_jimpitan', label: 'Jimpitan' }, { key: 'gr_arisan', label: 'Arisan' },
  ],
  data_pokja2: [
    { key: 'paket_a_klp', label: 'Pkt A Klp' }, { key: 'paket_a_wrg', label: 'Pkt A Wrg' },
    { key: 'paket_b_klp', label: 'Pkt B Klp' }, { key: 'paket_b_wrg', label: 'Pkt B Wrg' },
    { key: 'paket_c_klp', label: 'Pkt C Klp' }, { key: 'paket_c_wrg', label: 'Pkt C Wrg' },
    { key: 'taman_bacaan', label: 'T.Bacaan' }, { key: 'usaha_mikro', label: 'U.Mikro' },
    { key: 'up2k_pemula_klp', label: 'UP2K Pmla' }, { key: 'up2k_pemula_psrt', label: 'UP2K Psrt' },
    { key: 'toko_pkk', label: 'Toko PKK' }, { key: 'koperasi_belum_bh_kop', label: 'Kop Non-BH' },
    { key: 'koperasi_berbadan_hukum_kop', label: 'Kop BH' }, { key: 'koperasi_berbadan_hukum_angg', label: 'Angg BH' },
  ],
  data_pokja3: [
    { key: 'kader_pangan', label: 'Kdr Pangan' }, { key: 'kader_sandang', label: 'Kdr Sandang' }, { key: 'kader_tata_laksana_rt', label: 'Kdr TataRT' },
    { key: 'pangan_beras', label: 'Beras' }, { key: 'pemanfaatan_peternakan', label: 'Ternak' },
    { key: 'pemanfaatan_perikanan', label: 'Ikan' }, { key: 'pemanfaatan_warung_hidup', label: 'W.Hidup' },
    { key: 'pemanfaatan_lumbung_hidup', label: 'L.Hidup' }, { key: 'pemanfaatan_toga', label: 'TOGA' },
    { key: 'industri_pangan', label: 'Ind.Pangan' }, { key: 'industri_sandang', label: 'Ind.Sandang' }, { key: 'industri_jasa', label: 'Ind.Jasa' },
    { key: 'rumah_sehat', label: 'Rmh Sehat' }, { key: 'rumah_kurang_sehat', label: 'Rmh Kr.Sehat' },
  ],
  data_pokja4: [
    { key: 'kader_posyandu', label: 'Kdr Posyandu' }, { key: 'kader_gizi', label: 'Kdr Gizi' },
    { key: 'kader_kesling', label: 'Kdr Kesling' }, { key: 'kader_kb', label: 'Kdr KB' },
    { key: 'posyandu_jumlah', label: 'Posyandu' }, { key: 'posyandu_terintegrasi', label: 'Integrasi' },
    { key: 'lansia_jml_klp', label: 'Lansia Klp' }, { key: 'lansia_jml_anggota', label: 'Lansia Angg' },
    { key: 'rumah_jamban', label: 'Jamban' }, { key: 'rumah_spal', label: 'SPAL' },
    { key: 'air_pdam', label: 'PDAM' }, { key: 'air_sumur', label: 'Sumur' },
    { key: 'jml_pus', label: 'PUS' }, { key: 'jml_wus', label: 'WUS' },
    { key: 'akseptor_kb_l', label: 'KB(L)' }, { key: 'akseptor_kb_p', label: 'KB(P)' }, { key: 'kk_tabungan', label: 'Tabungan' },
  ],
  data_bumil: [
    { key: 'ibu_hamil', label: 'Hamil' }, { key: 'ibu_melahirkan', label: 'Melahirkan' }, { key: 'ibu_nifas', label: 'Nifas' },
    { key: 'ibu_meninggal', label: 'Ibu Meninggal' }, { key: 'bayi_lahir_l', label: 'Bayi(L)' }, { key: 'bayi_lahir_p', label: 'Bayi(P)' },
    { key: 'akte_ada', label: 'Akte Ada' }, { key: 'akte_tidak', label: 'Akte Tidak' },
    { key: 'bayi_meninggal_l', label: 'By.Mng(L)' }, { key: 'bayi_meninggal_p', label: 'By.Mng(P)' },
  ],
  data_kegiatan_warga: [
    { key: 'jml_dusun', label: 'Dusun' }, { key: 'jml_rw', label: 'RW' }, { key: 'jml_rt', label: 'RT' },
    { key: 'jml_dawis', label: 'Dawis' }, { key: 'jml_krt', label: 'KRT' }, { key: 'jml_kk', label: 'KK' },
    { key: 'jml_anggota_l', label: 'Angg(L)' }, { key: 'jml_anggota_p', label: 'Angg(P)' },
    { key: 'balita_l', label: 'Balita(L)' }, { key: 'balita_p', label: 'Balita(P)' },
    { key: 'pus', label: 'PUS' }, { key: 'wus', label: 'WUS' }, { key: 'ibu_hamil', label: 'Ibu Hamil' },
    { key: 'ibu_menyusui', label: 'Ibu Menyusui' }, { key: 'lansia', label: 'Lansia' },
    { key: 'rumah_sehat', label: 'Rumah Sehat' }, { key: 'rumah_kurang_sehat', label: 'Rumah Kr.Sehat' },
    { key: 'punya_tempat_sampah', label: 'Tempat Sampah' }, { key: 'punya_spal', label: 'SPAL' },
    { key: 'stiker_p4k', label: 'Stiker P4K' }, { key: 'air_pdam', label: 'PDAM' },
    { key: 'air_sumur', label: 'Sumur' }, { key: 'air_sungai', label: 'Sungai' }, { key: 'air_dll', label: 'Air Lain' },
    { key: 'jamban', label: 'Jamban' }, { key: 'makan_beras', label: 'Beras' }, { key: 'makan_non_beras', label: 'Non Beras' },
    { key: 'ikut_up2k', label: 'UP2K' }, { key: 'ikut_pekarangan', label: 'Pekarangan' },
    { key: 'ikut_industri', label: 'Industri' }, { key: 'ikut_kesling', label: 'Kesling' }, { key: 'jkn_bpjs', label: 'JKN/BPJS' },
  ],
};

const TABLE_LABELS = {
  data_umum: 'Data Umum PKK',
  data_pokja1: 'POKJA I — Pancasila & Gotong Royong',
  data_pokja2: 'POKJA II — Pendidikan & Koperasi',
  data_pokja3: 'POKJA III — Pangan & Sandang',
  data_pokja4: 'POKJA IV — Kesehatan & Lingkungan',
  data_bumil: 'Rekapitulasi Bumil',
  data_kegiatan_warga: 'Catatan Data dan Kegiatan Warga',
};

// Find the SHEET_MAP key that maps to a given table name
function sheetNameForTable(tableName) {
  for (const [sheetName, def] of Object.entries(SHEET_MAP)) {
    if (def.table === tableName) return sheetName;
  }
  return tableName.toUpperCase().replace('DATA_', '');
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');

    if (!tableName || !TABLE_COLUMNS[tableName]) {
      return NextResponse.json({ error: 'Parameter table tidak valid. Pilih: ' + Object.keys(TABLE_COLUMNS).join(', ') }, { status: 400 });
    }

    const rawCols = TABLE_COLUMNS[tableName];

    // Fetch desa list
    const { data: desaList } = await supabase.from('desa').select('nama, nomor_urut').eq('is_active', 1).order('nomor_urut');

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
    wb.creator = 'Sistem Rekapitulasi PKK';
    wb.created = new Date();

    const sheetName = sheetNameForTable(tableName);
    const ws = wb.addWorksheet(sheetName);

    // Title rows
    const totalCols = 2 + cols.length + (dynCols || []).length;
    const titleRow = ws.addRow([`TEMPLATE — ${TABLE_LABELS[tableName] || tableName}`]);
    ws.mergeCells(1, 1, 1, totalCols);
    titleRow.getCell(1).font = { bold: true, size: 14, name: 'Arial' };
    titleRow.getCell(1).alignment = { horizontal: 'center' };

    const instrRow = ws.addRow(['Isi data pada kolom yang tersedia. Jangan mengubah header atau nama desa.']);
    ws.mergeCells(2, 1, 2, totalCols);
    instrRow.getCell(1).font = { italic: true, size: 10, name: 'Arial', color: { argb: 'FF999999' } };
    instrRow.getCell(1).alignment = { horizontal: 'center' };

    ws.addRow([]);

    // Header row
    const headers = ['No', 'Nama Desa', ...cols.map(c => c.label), ...(dynCols || []).map(c => c.column_label)];
    const hdrRow = ws.addRow(headers);
    const HF = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D7377' } };
    const BD = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    hdrRow.eachCell(c => {
      c.fill = HF;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = BD;
    });

    // Column widths
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 20;
    for (let i = 3; i <= totalCols; i++) ws.getColumn(i).width = 14;

    // Desa rows (empty data)
    (desaList || []).forEach((d, i) => {
      const row = ws.addRow([i + 1, d.nama, ...new Array(cols.length + (dynCols || []).length).fill('')]);
      row.eachCell(c => {
        c.font = { size: 10, name: 'Arial' };
        c.border = BD;
      });
      // Lock desa name cell
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
