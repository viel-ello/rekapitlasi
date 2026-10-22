import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, VerticalAlign, PageOrientation } from 'docx';
import { requireAuth } from '@/lib/auth';
import { writeLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/* ─── Helpers ─── */
const BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
};

function headerCell(text, opts = {}) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text), size: 20, font: 'Times New Roman', bold: true, color: '000000' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
    })],
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: BORDERS,
    columnSpan: opts.colSpan || 1,
    rowSpan: opts.rowSpan || 1,
  });
}

function dataCell(text, opts = {}) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text), size: 20, font: 'Times New Roman', bold: opts.bold || false, color: '000000' })],
      alignment: opts.align || AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
    })],
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: BORDERS,
    columnSpan: opts.colSpan || 1,
    rowSpan: opts.rowSpan || 1,
  });
}

function numCell(text) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text), size: 20, font: 'Times New Roman', bold: false, color: '000000' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
    })],
    verticalAlign: VerticalAlign.CENTER,
    borders: BORDERS,
  });
}

/* ─── SECTION DEFINITIONS ─── */

export const DATA_UMUM_DEF = {
  name: 'DATA UMUM',
  mainTitle: 'DATA UMUM TP PKK',
  table: 'data_umum',
  headerRow1: [
    { label: 'No', rowSpan: 3 },
    { label: 'NAMA DUSUN', rowSpan: 3 },
    { label: 'JUMLAH KELOMPOK', colSpan: 3 },
    { label: 'JUMLAH', colSpan: 2 },
    { label: 'JUMLAH JIWA', colSpan: 2 },
    { label: 'JUMLAH KADER', colSpan: 6 },
    { label: 'JUMLAH TENAGA SEKARANG', colSpan: 4 },
    { label: 'KET', rowSpan: 3 },
  ],
  headerRow2: [
    { label: 'PKK RW', rowSpan: 2 },
    { label: 'PKK RT', rowSpan: 2 },
    { label: 'DAWIS', rowSpan: 2 },
    { label: 'KK', rowSpan: 2 },
    { label: 'KRT', rowSpan: 2 },
    { label: 'L', rowSpan: 2 },
    { label: 'P', rowSpan: 2 },
    { label: 'ANG TP PKK', colSpan: 2 },
    { label: 'UMUM', colSpan: 2 },
    { label: 'KHUSUS', colSpan: 2 },
    { label: 'HONORER', colSpan: 2 },
    { label: 'BANTUAN', colSpan: 2 },
  ],
  headerRow3: [
    { label: 'L' }, { label: 'P' },
    { label: 'L' }, { label: 'P' },
    { label: 'L' }, { label: 'P' },
    { label: 'L' }, { label: 'P' },
    { label: 'L' }, { label: 'P' },
  ],
  flatKeys: [
    'jml_pkk_rw', 'jml_pkk_rt', 'jml_dasa_wisma',
    'jml_kk', 'jml_krt',
    'jml_jiwa_l', 'jml_jiwa_p',
    'jml_kader_tp_pkk_l', 'jml_kader_tp_pkk_p',
    'jml_kader_umum_l', 'jml_kader_umum_p',
    'jml_kader_khusus_l', 'jml_kader_khusus_p',
    'jml_tenaga_honorer_l', 'jml_tenaga_honorer_p',
    'jml_tenaga_bantuan_l', 'jml_tenaga_bantuan_p',
  ],
  hasKet: true,
  totalCols: 20,
};

export const POKJA_DEFS = [
  {
    name: 'POKJA I',
    mainTitle: 'DATA KEGIATAN PKK',
    table: 'data_pokja1',
    headerRow1: [
      { label: 'No', rowSpan: 3 },
      { label: 'NAMA DUSUN', rowSpan: 3 },
      { label: 'JUMLAH KADER', colSpan: 3 },
      { label: 'PENGHAYATAN DAN PENGAMALAN PANCASILA', colSpan: 8 },
      { label: 'GOTONG ROYONG', colSpan: 5 },
      { label: 'KET', rowSpan: 3 },
    ],
    headerRow2: [
      { label: 'PKBN', rowSpan: 2 },
      { label: 'PKDRT', rowSpan: 2 },
      { label: 'POLA ASUH', rowSpan: 2 },
      { label: 'PKBN', colSpan: 2 },
      { label: 'PKDRT', colSpan: 2 },
      { label: 'POLA ASUH', colSpan: 2 },
      { label: 'LANSIA', colSpan: 2 },
      { label: 'JUMLAH KELOMPOK', colSpan: 5 },
    ],
    headerRow3: [
      { label: 'JML.KLP SIMULASI' },
      { label: 'JML ANG' },
      { label: 'JML.KLP SIMULASI' },
      { label: 'JML ANG' },
      { label: 'JML KLP SIMULASI' },
      { label: 'JML ANG' },
      { label: 'JML KLP SIMULASI' },
      { label: 'JML ANG' },
      { label: 'KERJA BAKTI' },
      { label: 'RUKUN KEMATIAN' },
      { label: 'KEAGAMAAN' },
      { label: 'JIMPITAN' },
      { label: 'ARISAN' },
    ],
    flatKeys: [
      'kader_pkbn', 'kader_pkdrt', 'kader_pola_asuh',
      'pkbn_jml_klp_simulasi', 'pkbn_jml_anggota',
      'pkdrt_jml_klp_simulasi', 'pkdrt_jml_anggota',
      'pola_asuh_jml_klp', 'pola_asuh_jml_anggota',
      'lansia_jml_klp', 'lansia_jml_anggota',
      'gr_kerja_bakti', 'gr_rukun_kematian',
      'gr_keagamaan', 'gr_jimpitan', 'gr_arisan',
    ],
    hasKet: true,
    totalCols: 19,
  },
  {
    name: 'POKJA II',
    mainTitle: 'DATA KEGIATAN PKK',
    table: 'data_pokja2',
    headerRow1: [
      { label: 'No', rowSpan: 3 },
      { label: 'NAMA DUSUN', rowSpan: 3 },
      { label: 'PENDIDIKAN DAN KETRAMPILAN', colSpan: 23 },
      { label: 'PENGEMBANGAN KEHIDUPAN BERKOPERASI', colSpan: 10 },
      { label: 'KET', rowSpan: 3 },
    ],
    headerRow2: [
      { label: '3 BUTA', rowSpan: 2 },
      { label: 'PAKET A', colSpan: 2 },
      { label: 'PAKET B', colSpan: 2 },
      { label: 'PAKET C', colSpan: 2 },
      { label: 'KF', colSpan: 2 },
      { label: 'PAUD SEJENIS', rowSpan: 2 },
      { label: 'TAMAN BACAAN', rowSpan: 2 },
      { label: 'BKB', colSpan: 4 },
      { label: 'KADER KHUSUS', colSpan: 5 },
      { label: 'PELATIHAN', colSpan: 3 },
      { label: 'UP2K PEMULA', colSpan: 2 },
      { label: 'UP2K MADYA', colSpan: 2 },
      { label: 'UP2K UTAMA', colSpan: 2 },
      { label: 'UP2K MANDIRI', colSpan: 2 },
      { label: 'KOP BERBADAN HUKUM', colSpan: 2 },
    ],
    headerRow3: [
      { label: 'KLP' }, { label: 'WRG' },
      { label: 'KLP' }, { label: 'WRG' },
      { label: 'KLP' }, { label: 'WRG' },
      { label: 'KLP' }, { label: 'WRG' },
      { label: 'KLP' }, { label: 'IBU' }, { label: 'APE A' }, { label: 'APE B' },
      { label: 'TUTOR KF' }, { label: 'TUTOR PAUD' }, { label: 'BKB' }, { label: 'KOP' }, { label: 'KTRMPL' },
      { label: 'LP3PKK' }, { label: 'TP3PKK' }, { label: 'DAMAS' },
      { label: 'KLP' }, { label: 'PSRT' },
      { label: 'KLP' }, { label: 'PSRT' },
      { label: 'KLP' }, { label: 'PSRT' },
      { label: 'KLP' }, { label: 'PSRT' },
      { label: 'KOP' }, { label: 'ANGG' },
    ],
    flatKeys: [
      'jml_warga_3_buta',
      'paket_a_klp', 'paket_a_wrg',
      'paket_b_klp', 'paket_b_wrg',
      'paket_c_klp', 'paket_c_wrg',
      'kf_klp', 'kf_wrg',
      'paud_sejenis',
      'taman_bacaan',
      'bkb_klp', 'bkb_jml_ibu_peserta', 'bkb_ape_set_a', 'bkb_ape_set_b',
      'kader_tutor_kf', 'kader_tutor_paud', 'kader_bkb',
      'kader_khusus_koperasi', 'kader_khusus_keterampilan',
      'yg_dilatih_lp3pkk', 'yg_dilatih_tp3pkk', 'yg_dilatih_damaspkk',
      'up2k_pemula_klp', 'up2k_pemula_psrt',
      'up2k_madya_klp', 'up2k_madya_psrt',
      'up2k_utama_klp', 'up2k_utama_psrt',
      'up2k_mandiri_klp', 'up2k_mandiri_psrt',
      'koperasi_berbadan_hukum_kop', 'koperasi_berbadan_hukum_angg',
    ],
    hasKet: true,
    totalCols: 36,
  },
  {
    name: 'POKJA III',
    mainTitle: 'DATA KEGIATAN PKK',
    table: 'data_pokja3',
    headerRow1: [
      { label: 'No', rowSpan: 3 },
      { label: 'NAMA DUSUN', rowSpan: 3 },
      { label: 'JUMLAH KADER', colSpan: 3, rowSpan: 2 },
      { label: 'PANGAN', colSpan: 2, rowSpan: 2 },
      { label: 'PEMANFAATAN PEKARANGAN', colSpan: 6 },
      { label: 'INDUSTRI RUMAH TANGGA', colSpan: 3, rowSpan: 2 },
      { label: 'RUMAH', colSpan: 2, rowSpan: 2 },
      { label: 'KET', rowSpan: 3 },
    ],
    headerRow2: [
      { label: 'PETERNAKAN', rowSpan: 2 },
      { label: 'PERIKANAN', rowSpan: 2 },
      { label: 'WARUNG HIDUP', rowSpan: 2 },
      { label: 'LUMBUNG HIDUP', rowSpan: 2 },
      { label: 'TOGA', rowSpan: 2 },
      { label: 'TAN. KERAS', rowSpan: 2 },
    ],
    headerRow3: [
      { label: 'PANGAN' }, { label: 'SANDANG' }, { label: 'TATA RT' },
      { label: 'BERAS' }, { label: 'NON BERAS' },
      { label: 'PANGAN' }, { label: 'SANDANG' }, { label: 'JASA' },
      { label: 'SEHAT' }, { label: 'KRG SEHAT' },
    ],
    flatKeys: [
      'kader_pangan', 'kader_sandang', 'kader_tata_laksana_rt',
      'pangan_beras', 'pangan_non_beras',
      'pemanfaatan_peternakan', 'pemanfaatan_perikanan',
      'pemanfaatan_warung_hidup', 'pemanfaatan_lumbung_hidup',
      'pemanfaatan_toga', 'pemanfaatan_tanaman_keras',
      'industri_pangan', 'industri_sandang', 'industri_jasa',
      'rumah_sehat', 'rumah_kurang_sehat',
    ],
    hasKet: true,
    totalCols: 19,
  },
  {
    name: 'POKJA IV',
    mainTitle: 'DATA KEGIATAN PKK',
    table: 'data_pokja4',
    headerRow1: [
      { label: 'No', rowSpan: 3 },
      { label: 'NAMA DUSUN', rowSpan: 3 },
      { label: 'JUMLAH KADER', colSpan: 6, rowSpan: 2 },
      { label: 'POSYANDU', colSpan: 2, rowSpan: 2 },
      { label: 'LANSIA', colSpan: 3 },
      { label: 'RUMAH', colSpan: 4, rowSpan: 2 },
      { label: 'SUMBER AIR', colSpan: 3, rowSpan: 2 },
      { label: 'PERENCANAAN SEHAT', colSpan: 5 },
      { label: 'KET', rowSpan: 3 },
    ],
    headerRow2: [
      { label: 'JML KLP', rowSpan: 2 },
      { label: 'JML ANGG', rowSpan: 2 },
      { label: 'KARTU BEROBAT', rowSpan: 2 },
      { label: 'PUS', rowSpan: 2 },
      { label: 'WUS', rowSpan: 2 },
      { label: 'AKSEPTOR', colSpan: 2 },
      { label: 'KK TABUNGAN', rowSpan: 2 },
    ],
    headerRow3: [
      { label: 'POSYANDU' }, { label: 'GIZI' }, { label: 'KESLING' },
      { label: 'NARKOBA' }, { label: 'PHBS' }, { label: 'KB' },
      { label: 'JUMLAH' }, { label: 'INTEGRASI' },
      { label: 'JAMBAN' }, { label: 'SPAL' }, { label: 'TMP SAMPAH' }, { label: 'MCK' },
      { label: 'PDAM' }, { label: 'SUMUR' }, { label: 'LAIN' },
      { label: 'L' }, { label: 'P' },
    ],
    flatKeys: [
      'kader_posyandu', 'kader_gizi', 'kader_kesling',
      'kader_penyuluh_narkoba', 'kader_phbs', 'kader_kb',
      'posyandu_jumlah', 'posyandu_terintegrasi',
      'lansia_jml_klp', 'lansia_jml_anggota', 'lansia_jml_kartu_berobat',
      'rumah_jamban', 'rumah_spal', 'rumah_tempat_sampah', 'rumah_mck',
      'air_pdam', 'air_sumur', 'air_lain',
      'jml_pus', 'jml_wus',
      'akseptor_kb_l', 'akseptor_kb_p',
      'kk_tabungan',
    ],
    hasKet: true,
    totalCols: 26,
  },
];

export const REKAP_DAWIS_DEF = {
  name: 'REKAPITULASI DASA WISMA',
  mainTitle: 'CATATAN DATA DAN KEGIATAN WARGA',
  table: 'data_rekap_dawis',
  headerRow1: [
    { label: 'No', rowSpan: 3 },
    { label: 'NAMA DUSUN', rowSpan: 3 },
    { label: 'JML RW', rowSpan: 3 },
    { label: 'JML RT', rowSpan: 3 },
    { label: 'JML DAWIS', rowSpan: 3 },
    { label: 'JML KRT', rowSpan: 3 },
    { label: 'JML KK', rowSpan: 3 },
    { label: 'JUMLAH ANGGOTA KELUARGA', colSpan: 11 },
    { label: 'JUMLAH RUMAH', colSpan: 6 },
    { label: 'SUMBER AIR KELUARGA', colSpan: 4 },
    { label: 'MAKANAN', colSpan: 2 },
    { label: 'WARGA MENGIKUTI', colSpan: 3 },
    { label: 'KET (JKN/BPJS)', rowSpan: 3 },
  ],
  headerRow2: [
    { label: 'TOTAL', colSpan: 2 },
    { label: 'BALITA', colSpan: 2 },
    { label: 'PUS', rowSpan: 2 },
    { label: 'WUS', rowSpan: 2 },
    { label: 'HAMIL', rowSpan: 2 },
    { label: 'MENYUSUI', rowSpan: 2 },
    { label: 'LANSIA', rowSpan: 2 },
    { label: '3 BUTA', rowSpan: 2 },
    { label: 'KHUSUS', rowSpan: 2 },
    { label: 'SEHAT', rowSpan: 2 },
    { label: 'TIDAK SEHAT', rowSpan: 2 },
    { label: 'SAMPAH', rowSpan: 2 },
    { label: 'SPAL', rowSpan: 2 },
    { label: 'JAMBAN', rowSpan: 2 },
    { label: 'STIKER P4K', rowSpan: 2 },
    { label: 'PDAM', rowSpan: 2 },
    { label: 'SUMUR', rowSpan: 2 },
    { label: 'SUNGAI', rowSpan: 2 },
    { label: 'LAIN', rowSpan: 2 },
    { label: 'BERAS', rowSpan: 2 },
    { label: 'NON BERAS', rowSpan: 2 },
    { label: 'UP2K', rowSpan: 2 },
    { label: 'PEKARANGAN', rowSpan: 2 },
    { label: 'KESLING', rowSpan: 2 },
  ],
  headerRow3: [
    { label: 'L' }, { label: 'P' },
    { label: 'L' }, { label: 'P' },
  ],
  flatKeys: [
    'jml_rw', 'jml_rt', 'jml_dawis', 'jml_krt', 'jml_kk',
    'jml_anggota_l', 'jml_anggota_p',
    'balita_l', 'balita_p',
    'pus', 'wus', 'ibu_hamil', 'ibu_menyusui', 'lansia', 'tiga_buta', 'berkebutuhan_khusus',
    'rumah_sehat', 'rumah_kurang_sehat', 'punya_tempat_sampah', 'punya_spal', 'jamban', 'stiker_p4k',
    'air_pdam', 'air_sumur', 'air_sungai', 'air_dll',
    'makan_beras', 'makan_non_beras',
    'ikut_up2k', 'ikut_pekarangan', 'ikut_kesling',
    'jkn_bpjs',
  ],
  hasKet: false,
  totalCols: 34,
};

export const BUMIL_DEF = {
  name: 'REKAPITULASI DATA BUMIL',
  mainTitle: 'REKAPITULASI DATA IBU HAMIL, MELAHIRKAN, NIFAS & BALITA',
  table: 'data_bumil',
  headerRow1: [
    { label: 'No', rowSpan: 3 },
    { label: 'NAMA DUSUN', rowSpan: 3 },
    { label: 'JUMLAH', colSpan: 3 },
    { label: 'JUMLAH IBU', colSpan: 4 },
    { label: 'JUMLAH BAYI', colSpan: 6 },
    { label: 'JML BALITA MENINGGAL', colSpan: 2 },
    { label: 'KET', rowSpan: 3 },
  ],
  headerRow2: [
    { label: 'RT', rowSpan: 2 },
    { label: 'RW', rowSpan: 2 },
    { label: 'DAWIS', rowSpan: 2 },
    { label: 'HAMIL', rowSpan: 2 },
    { label: 'MELAHIRKAN', rowSpan: 2 },
    { label: 'NIFAS', rowSpan: 2 },
    { label: 'MENINGGAL', rowSpan: 2 },
    { label: 'LAHIR', colSpan: 2 },
    { label: 'AKTE', colSpan: 2 },
    { label: 'MENINGGAL', colSpan: 2 },
    { label: 'L', rowSpan: 2 },
    { label: 'P', rowSpan: 2 },
  ],
  headerRow3: [
    { label: 'L' }, { label: 'P' },
    { label: 'L' }, { label: 'P' },
    { label: 'L' }, { label: 'P' },
  ],
  flatKeys: [
    'jml_rt', 'jml_rw', 'jml_dasa_wisma',
    'ibu_hamil', 'ibu_melahirkan', 'ibu_nifas', 'ibu_meninggal',
    'bayi_lahir_l', 'bayi_lahir_p',
    'akte_l', 'akte_p',
    'bayi_meninggal_l', 'bayi_meninggal_p',
    'balita_meninggal_l', 'balita_meninggal_p',
  ],
  hasKet: true,
  totalCols: 18,
};

export const ALL_EXPORT_SECTIONS = [
  DATA_UMUM_DEF,
  ...POKJA_DEFS,
  REKAP_DAWIS_DEF,
  BUMIL_DEF,
];

const SNAPSHOT_TABLES = new Set(['data_umum', 'data_rekap_dawis']);
const TABLES_WITH_MONTH = new Set(['data_bumil', 'data_rekap_dawis', 'data_umum']);

/* ─── Build a section ─── */
async function buildTableSection(secDef, tahun, dusunList = [], bulan = null) {
  const isMonthly = TABLES_WITH_MONTH.has(secDef.table);
  const isSnapshot = SNAPSHOT_TABLES.has(secDef.table);

  let q = supabase.from(secDef.table).select('*').eq('tahun', tahun);
  if (isMonthly && bulan != null) q = q.eq('bulan', bulan);
  const { data: tableData } = await q;
  const allData = tableData || [];

  const children = [];
  const hasKet = secDef.hasKet !== false;
  const colCount = 2 + secDef.flatKeys.length + (hasKet ? 1 : 0);

  // Title
  const monthTitle = bulan != null ? ` · BULAN : ${String(bulan).padStart(2, '0')}` : '';
  children.push(
    new Paragraph({ children: [new TextRun({ text: secDef.mainTitle || 'DATA KEGIATAN PKK', bold: true, size: 24, font: 'Times New Roman' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: 'TP PKK DESA BELIKURIP · KECAMATAN BATURETNO', bold: true, size: 24, font: 'Times New Roman' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: `TAHUN : ${tahun}${monthTitle}`, bold: true, size: 24, font: 'Times New Roman' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: secDef.name, bold: true, size: 24, font: 'Times New Roman' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  );

  // Build header rows
  const row1Cells = secDef.headerRow1.map(h => headerCell(h.label, { colSpan: h.colSpan || 1, rowSpan: h.rowSpan || 1 }));
  const row2Cells = secDef.headerRow2.map(h => headerCell(h.label, { colSpan: h.colSpan || 1, rowSpan: h.rowSpan || 1 }));
  const row3Cells = (secDef.headerRow3 || []).map(h => headerCell(h.label, { colSpan: h.colSpan || 1, rowSpan: h.rowSpan || 1 }));

  // Column number row
  const numRowCells = [];
  for (let i = 1; i <= colCount; i++) {
    numRowCells.push(numCell(String(i)));
  }

  // Data rows
  const dataRows = [];
  const totals = new Array(secDef.flatKeys.length).fill(0);

  // Fallback data for Bumil (RT, RW, Dawis from rekap dawis)
  let dawisData = [];
  if (secDef.table === 'data_bumil') {
    let dq = supabase.from('data_rekap_dawis').select('*').eq('tahun', tahun);
    if (bulan != null) dq = dq.eq('bulan', bulan);
    const { data: dData } = await dq;
    dawisData = dData || [];
  }

  dusunList.forEach((d, idx) => {
    const rows = allData.filter((r) => (r.dusun_id ?? r.desa_id) === d.id);
    const dawisRows = dawisData.filter((r) => (r.dusun_id ?? r.desa_id) === d.id);

    // Latest available month row for snapshot tables when bulan is null (annual export)
    let targetRow = null;
    if (isMonthly && bulan == null && isSnapshot) {
      targetRow = rows.slice().sort((a, b) => (Number(b.bulan) || 0) - (Number(a.bulan) || 0))[0] || null;
    }

    // Latest dawis row for bumil fallback when bulan is null
    const latestDawisRow = dawisRows.slice().sort((a, b) => (Number(b.bulan) || 0) - (Number(a.bulan) || 0))[0] || null;

    const aggregated = {};
    secDef.flatKeys.forEach((k) => {
      if (targetRow) {
        aggregated[k] = Number(targetRow[k]) || 0;
      } else {
        let sum = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
        if (sum === 0 && secDef.table === 'data_bumil') {
          if (k === 'jml_rt') sum = latestDawisRow ? (Number(latestDawisRow.jml_rt) || 0) : 0;
          if (k === 'jml_rw') sum = latestDawisRow ? (Number(latestDawisRow.jml_rw) || 0) : 0;
          if (k === 'jml_dasa_wisma') sum = latestDawisRow ? (Number(latestDawisRow.jml_dawis) || 0) : 0;
        }
        aggregated[k] = sum;
      }
    });

    const cells = [
      dataCell(String(idx + 1), { width: 500 }),
      dataCell(d.nama, { align: AlignmentType.LEFT, width: 2500 }),
    ];

    secDef.flatKeys.forEach((k, ki) => {
      const val = aggregated[k] || 0;
      totals[ki] += val;
      cells.push(dataCell(String(val)));
    });

    if (hasKet) {
      const ketText = targetRow
        ? (targetRow.keterangan || '')
        : rows.map((r) => r.keterangan).filter(Boolean).join('; ');
      cells.push(dataCell(ketText)); // KET
    }

    dataRows.push(new TableRow({ children: cells }));
  });

  // JUMLAH row
  const totalCells = [
    dataCell(''),
    dataCell('JUMLAH', { bold: true }),
  ];
  totals.forEach(t => {
    totalCells.push(dataCell(String(t), { bold: true }));
  });
  if (hasKet) {
    totalCells.push(dataCell(''));
  }

  const headerTableRows = [
    new TableRow({ children: row1Cells, tableHeader: true }),
    new TableRow({ children: row2Cells, tableHeader: true }),
  ];
  if (row3Cells.length > 0) {
    headerTableRows.push(new TableRow({ children: row3Cells, tableHeader: true }));
  }

  const table = new Table({
    rows: [
      ...headerTableRows,
      new TableRow({ children: numRowCells }),
      ...dataRows,
      new TableRow({ children: totalCells }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  children.push(table);
  return children;
}

// Backward-compat alias
export const buildPokjaSection = buildTableSection;

/* ─── Main Export ─── */
export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();
    const bulan = searchParams.get('bulan') ? Number(searchParams.get('bulan')) : null;

    const { data: dusunRows } = await supabase
      .from('dusun')
      .select('id, nama, nomor_urut')
      .eq('is_active', 1)
      .order('nomor_urut', { ascending: true });
    const dusunList = dusunRows || [];

    const sections = [];

    for (const secDef of ALL_EXPORT_SECTIONS) {
      const content = await buildTableSection(secDef, tahun, dusunList, bulan);
      sections.push({
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: content,
      });
    }

    const doc = new Document({
      sections,
      creator: 'Lumbung Data PKK',
      title: `Data Kegiatan PKK ${tahun}`,
    });

    const buffer = await Packer.toBuffer(doc);

    await writeLog({
      userId: user.userId,
      username: user.username,
      action: 'export',
      tableName: 'semua',
      detail: `Export Word tahun ${tahun}${bulan != null ? ` bulan ${bulan}` : ''}`,
    });

    const stamp = `${tahun}${bulan != null ? `_Bulan_${String(bulan).padStart(2, '0')}` : ''}`;
    return new NextResponse(buffer, { status: 200, headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Data_Kegiatan_PKK_${stamp}.docx"`,
    }});
  } catch (error) {
    console.error('Word export error:', error);
    return NextResponse.json({ error: 'Gagal mengekspor Word: ' + error.message }, { status: 500 });
  }
}
