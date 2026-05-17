import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, VerticalAlign, PageOrientation } from 'docx';
import { requireAuth } from '@/lib/auth';

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

function numCell(text, opts = {}) {
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

/* ─── POKJA DEFINITIONS with multi-row header groups ─── */
// Each pokja defines:
//   title: Pokja subtitle in header
//   table: DB table name
//   groups: array of header groups for multi-row headers
//     { label, colSpan, subGroups?: [...], columns?: [{key, label}] }
//   flatCols: flat list of {key, label} in order

const POKJA_DEFS = [
  {
    name: 'POKJA I',
    table: 'data_pokja1',
    // Row 1 groups
    headerRow1: [
      { label: 'No', rowSpan: 3 },
      { label: 'NAMA DUSUN', rowSpan: 3 },
      { label: 'JUMLAH KADER', colSpan: 3 },
      { label: 'PENGHAYATAN DAN PENGAMALAN PANCASILA', colSpan: 8 },
      { label: 'GOTONG ROYONG', colSpan: 5 },
      { label: 'KET', rowSpan: 3 },
    ],
    // Row 2 sub-groups
    headerRow2: [
      // under JUMLAH KADER:
      { label: 'PKBN', rowSpan: 2 },
      { label: 'PKDRT', rowSpan: 2 },
      { label: 'POLA ASUH', rowSpan: 2 },
      // under PENGHAYATAN DAN PENGAMALAN PANCASILA:
      { label: 'PKBN', colSpan: 2 },
      { label: 'PKDRT', colSpan: 2 },
      { label: 'POLA ASUH', colSpan: 2 },
      { label: 'LANSIA', colSpan: 2 },
      // under GOTONG ROYONG:
      { label: 'JUMLAH KELOMPOK', colSpan: 5 },
    ],
    // Row 3 bottom-level cols
    headerRow3: [
      // PKBN sub
      { label: 'JML.KLP SIMULASI' },
      { label: 'JML ANG' },
      // PKDRT sub
      { label: 'JML.KLP SIMULASI' },
      { label: 'JML ANG' },
      // POLA ASUH sub
      { label: 'JML KLP SIMULASI' },
      { label: 'JML ANG' },
      // LANSIA sub
      { label: 'JML KLP SIMULASI' },
      { label: 'JML ANG' },
      // GOTONG ROYONG -> JUMLAH KELOMPOK sub
      { label: 'KERJA BAKTI' },
      { label: 'RUKUN KEMATIAN' },
      { label: 'KEAGAMAAN' },
      { label: 'JIMPITAN' },
      { label: 'ARISAN' },
    ],
    // Flat column keys matching order left to right (excluding No, Nama, Ket)
    flatKeys: [
      'kader_pkbn', 'kader_pkdrt', 'kader_pola_asuh',
      'pkbn_jml_klp_simulasi', 'pkbn_jml_anggota',
      'pkdrt_jml_klp_simulasi', 'pkdrt_jml_anggota',
      'pola_asuh_jml_klp', 'pola_asuh_jml_anggota',
      'lansia_jml_klp', 'lansia_jml_anggota',
      'gr_kerja_bakti', 'gr_rukun_kematian',
      'gr_keagamaan', 'gr_jimpitan', 'gr_arisan',
    ],
    totalCols: 19, // No + Nama + 16 data cols + Ket
  },
  {
    name: 'POKJA II',
    table: 'data_pokja2',
    headerRow1: [
      { label: 'No', rowSpan: 3 },
      { label: 'NAMA DUSUN', rowSpan: 3 },
      { label: 'JUMLAH KADER', colSpan: 2, rowSpan: 2 },
      { label: 'PENDIDIKAN & KETERAMPILAN', colSpan: 10 },
      { label: 'PENGEMBANGAN KEHIDUPAN BERKOPERASI', colSpan: 13 },
      { label: 'KET', rowSpan: 3 },
    ],
    headerRow2: [
      { label: 'PAKET A', colSpan: 2 },
      { label: 'PAKET B', colSpan: 2 },
      { label: 'PAKET C', colSpan: 2 },
      { label: 'TAMAN BACAAN', rowSpan: 2 },
      { label: 'KLP PEMBACA', rowSpan: 2 },
      { label: 'RUMAH DILAN', rowSpan: 2 },
      { label: 'KAMPUNG MANDIRI', rowSpan: 2 },
      { label: 'USAHA MIKRO', rowSpan: 2 },
      { label: 'UP2K PEMULA', colSpan: 2 },
      { label: 'UP2K MADYA', colSpan: 2 },
      { label: 'UP2K UTAMA', colSpan: 2 },
      { label: 'UP2K MANDIRI', colSpan: 2 },
      { label: 'TOKO PKK', rowSpan: 2 },
      { label: 'KOP NON-BH', colSpan: 2 },
      { label: 'KOP BH', colSpan: 2 },
    ],
    headerRow3: [
      { label: 'KOPERASI' },
      { label: 'KETRAMPILAN' },
      { label: 'KLP' }, { label: 'WRG' },
      { label: 'KLP' }, { label: 'WRG' },
      { label: 'KLP' }, { label: 'WRG' },
      { label: 'KLP' }, { label: 'PSRT' },
      { label: 'KLP' }, { label: 'PSRT' },
      { label: 'KLP' }, { label: 'PSRT' },
      { label: 'KLP' }, { label: 'PSRT' },
      { label: 'KOP' }, { label: 'ANGG' },
      { label: 'KOP' }, { label: 'ANGG' },
    ],
    flatKeys: [
      'kader_khusus_koperasi', 'kader_khusus_keterampilan',
      'paket_a_klp', 'paket_a_wrg',
      'paket_b_klp', 'paket_b_wrg',
      'paket_c_klp', 'paket_c_wrg',
      'taman_bacaan', 'klp_pembaca', 'rumah_dilan', 'kampung_mandiri',
      'usaha_mikro',
      'up2k_pemula_klp', 'up2k_pemula_psrt',
      'up2k_madya_klp', 'up2k_madya_psrt',
      'up2k_utama_klp', 'up2k_utama_psrt',
      'up2k_mandiri_klp', 'up2k_mandiri_psrt',
      'toko_pkk',
      'koperasi_belum_bh_kop', 'koperasi_belum_bh_angg',
      'koperasi_berbadan_hukum_kop', 'koperasi_berbadan_hukum_angg',
    ],
    totalCols: 29,
  },
  {
    name: 'POKJA III',
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
    totalCols: 19,
  },
  {
    name: 'POKJA IV',
    table: 'data_pokja4',
    headerRow1: [
      { label: 'No', rowSpan: 3 },
      { label: 'NAMA DUSUN', rowSpan: 3 },
      { label: 'JUMLAH KADER', colSpan: 6, rowSpan: 2 },
      { label: 'POSYANDU', colSpan: 2, rowSpan: 2 },
      { label: 'LANSIA', colSpan: 3 },
      { label: 'RUMAH', colSpan: 4, rowSpan: 2 },
      { label: 'SUMBER AIR', colSpan: 3, rowSpan: 2 },
      { label: 'KB', colSpan: 4 },
      { label: 'KET', rowSpan: 3 },
    ],
    headerRow2: [
      { label: 'JML KLP', rowSpan: 2 },
      { label: 'JML ANGG', rowSpan: 2 },
      { label: 'KARTU BEROBAT', rowSpan: 2 },
      { label: 'PUS', rowSpan: 2 },
      { label: 'WUS', rowSpan: 2 },
      { label: 'AKSEPTOR', colSpan: 2 },
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
    ],
    totalCols: 25,
  },
];

/* ─── Build a Pokja section ─── */
async function buildPokjaSection(pokja, tahun) {
  const { data: dusunRows } = await supabase
    .from('dusun')
    .select('id, nama, nomor_urut')
    .eq('is_active', 1)
    .order('nomor_urut', { ascending: true });
  const { data: tableData } = await supabase.from(pokja.table).select('*').eq('tahun', tahun);
  const dusunList = dusunRows || [];
  const allData = tableData || [];

  const children = [];
  const colCount = 2 + pokja.flatKeys.length + 1; // No + Nama + data cols + Ket

  // Title
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'DATA KEGIATAN PKK', bold: true, size: 24, font: 'Times New Roman' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: 'TP PKK DESA BELIKURIP · KECAMATAN BATURETNO', bold: true, size: 24, font: 'Times New Roman' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: `TAHUN : ${tahun}`, bold: true, size: 24, font: 'Times New Roman' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: pokja.name, bold: true, size: 24, font: 'Times New Roman' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  );

  // Build header rows
  const row1Cells = pokja.headerRow1.map(h => headerCell(h.label, { colSpan: h.colSpan || 1, rowSpan: h.rowSpan || 1 }));
  const row2Cells = pokja.headerRow2.map(h => headerCell(h.label, { colSpan: h.colSpan || 1, rowSpan: h.rowSpan || 1 }));
  const row3Cells = pokja.headerRow3.map(h => headerCell(h.label, { colSpan: h.colSpan || 1, rowSpan: h.rowSpan || 1 }));

  // Column number row
  const numRowCells = [];
  for (let i = 1; i <= colCount; i++) {
    numRowCells.push(numCell(String(i)));
  }

  // Data rows
  const dataRows = [];
  const totals = new Array(pokja.flatKeys.length).fill(0);

  dusunList.forEach((d, idx) => {
    const rows = allData.filter((r) => (r.dusun_id ?? r.desa_id) === d.id);
    const aggregated = {};
    pokja.flatKeys.forEach((k) => {
      aggregated[k] = rows.reduce((sum, r) => sum + (Number(r[k]) || 0), 0);
    });

    const cells = [
      dataCell(String(idx + 1), { width: 500 }),
      dataCell(d.nama, { align: AlignmentType.LEFT, width: 2500 }),
    ];

    pokja.flatKeys.forEach((k, ki) => {
      const val = aggregated[k] || 0;
      totals[ki] += val;
      cells.push(dataCell(String(val)));
    });

    cells.push(dataCell('')); // KET
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
  totalCells.push(dataCell(''));

  const table = new Table({
    rows: [
      new TableRow({ children: row1Cells, tableHeader: true }),
      new TableRow({ children: row2Cells, tableHeader: true }),
      new TableRow({ children: row3Cells, tableHeader: true }),
      new TableRow({ children: numRowCells }),
      ...dataRows,
      new TableRow({ children: totalCells }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  children.push(table);
  return children;
}

/* ─── Main Export ─── */
export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();

    const sections = [];

    for (const pokja of POKJA_DEFS) {
      const content = await buildPokjaSection(pokja, tahun);
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
      creator: 'Sistem Rekapitulasi PKK',
      title: `Data Kegiatan PKK ${tahun}`,
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, { status: 200, headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Data_Kegiatan_PKK_${tahun}.docx"`,
    }});
  } catch (error) {
    console.error('Word export error:', error);
    return NextResponse.json({ error: 'Gagal mengekspor Word: ' + error.message }, { status: 500 });
  }
}
