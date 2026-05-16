/**
 * @file Report builder — POST /api/reports/build
 * Body: {
 *   tables: ['data_umum', 'data_pokja1', ...],
 *   tahunFrom: number,
 *   tahunTo: number,
 *   bulan?: number          (untuk data_bumil)
 *   desaIds: number[]       (kosong = semua aktif)
 *   columns: { [tableName]: ['kolom_a', 'kolom_b'] }  (subset)
 *   format: 'excel' | 'word' | 'pdf'
 * }
 *
 * Output: file binary sesuai format.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { DATA_PAGES } from '@/lib/dataPages';

export const dynamic = 'force-dynamic';

const VALID_TABLES = Object.values(DATA_PAGES).reduce((acc, p) => {
  acc[p.tableName] = {
    title: p.title,
    columns: p.columns,
    hasMonth: Boolean(p.hasMonth),
  };
  return acc;
}, {});

function clampYear(n) {
  const v = Number(n);
  if (!Number.isInteger(v) || v < 2000 || v > 2100) return new Date().getFullYear();
  return v;
}

async function fetchOverrides() {
  const { data } = await supabase.from('table_column_overrides').select('table_name, column_key, label_override, is_hidden');
  const map = {};
  (data || []).forEach((o) => {
    if (!map[o.table_name]) map[o.table_name] = {};
    map[o.table_name][o.column_key] = o;
  });
  return map;
}

function applyOverride(col, override) {
  const labelOverride = override?.label_override?.trim();
  return {
    ...col,
    label: labelOverride || col.label,
    hidden: Boolean(override?.is_hidden),
  };
}

async function gatherReport(config) {
  const overrides = await fetchOverrides();

  // Desa list
  let desaQ = supabase.from('desa').select('id, nama, nomor_urut').eq('is_active', 1).order('nomor_urut');
  if (Array.isArray(config.desaIds) && config.desaIds.length > 0) {
    desaQ = desaQ.in('id', config.desaIds);
  }
  const { data: desaList } = await desaQ;

  const years = [];
  for (let y = config.tahunFrom; y <= config.tahunTo; y++) years.push(y);

  const sheets = [];
  for (const t of config.tables) {
    const meta = VALID_TABLES[t];
    if (!meta) continue;

    // Resolve kolom yang dipilih, terapkan override
    const overrideMap = overrides[t] || {};
    const requestedKeys = Array.isArray(config.columns?.[t]) ? config.columns[t] : meta.columns.map((c) => c.key);
    const cols = meta.columns
      .map((c) => applyOverride(c, overrideMap[c.key]))
      .filter((c) => !c.hidden && requestedKeys.includes(c.key));

    if (cols.length === 0) continue;

    // Fetch rows
    let q = supabase.from(t).select('*').in('tahun', years);
    if (meta.hasMonth && config.bulan) q = q.eq('bulan', config.bulan);
    if (Array.isArray(config.desaIds) && config.desaIds.length > 0) {
      q = q.in('desa_id', config.desaIds);
    }
    const { data: rows } = await q;

    const merged = (rows || [])
      .map((r) => {
        const d = (desaList || []).find((x) => x.id === r.desa_id);
        return d ? { ...r, _desa_nama: d.nama, _nomor_urut: d.nomor_urut } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.tahun !== b.tahun ? a.tahun - b.tahun : (a._nomor_urut || 0) - (b._nomor_urut || 0)));

    sheets.push({
      tableName: t,
      title: meta.title,
      columns: cols,
      rows: merged,
    });
  }

  return { sheets, desaList: desaList || [], years };
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const body = await request.json();
    const tables = Array.isArray(body.tables) ? body.tables.filter((t) => VALID_TABLES[t]) : [];
    if (tables.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal satu tabel' }, { status: 400 });
    }
    const tahunFrom = clampYear(body.tahunFrom || new Date().getFullYear());
    const tahunTo = clampYear(body.tahunTo || tahunFrom);
    if (tahunTo < tahunFrom) {
      return NextResponse.json({ error: 'Tahun akhir harus >= tahun awal' }, { status: 400 });
    }
    const format = body.format === 'word' || body.format === 'pdf' ? body.format : 'excel';

    const config = {
      tables,
      tahunFrom,
      tahunTo,
      bulan: body.bulan ? Number(body.bulan) : 12,
      desaIds: Array.isArray(body.desaIds) ? body.desaIds.map((n) => Number(n)).filter(Number.isInteger) : [],
      columns: body.columns || {},
    };

    const report = await gatherReport(config);

    if (format === 'excel') {
      return await buildExcel(report, config);
    }
    if (format === 'word') {
      return await buildWord(report, config);
    }
    return await buildPdf(report, config);
  } catch (error) {
    console.error('Report build error:', error);
    return NextResponse.json({ error: 'Gagal membangun laporan: ' + error.message }, { status: 500 });
  }
}

// ─── Excel ───────────────────────────────────────────────────────────────────
async function buildExcel(report, config) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistem Rekapitulasi PKK';
  wb.created = new Date();

  const HF = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D7377' } };
  const BORDER = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

  for (const sheet of report.sheets) {
    const ws = wb.addWorksheet(sheet.title.slice(0, 31));
    ws.addRow([sheet.title]).getCell(1).font = { bold: true, size: 14 };
    ws.mergeCells(1, 1, 1, 3 + sheet.columns.length);
    ws.addRow([`Periode ${config.tahunFrom}–${config.tahunTo}`]);
    ws.addRow([]);

    const headers = ['No', 'Desa', 'Tahun', ...sheet.columns.map((c) => c.label)];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((c) => {
      c.fill = HF;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = BORDER;
    });

    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 18;
    ws.getColumn(3).width = 8;
    sheet.columns.forEach((_, i) => { ws.getColumn(4 + i).width = 14; });

    sheet.rows.forEach((r, i) => {
      const rowVals = [
        i + 1,
        r._desa_nama,
        r.tahun,
        ...sheet.columns.map((c) => Number(r[c.key] || 0)),
      ];
      const rr = ws.addRow(rowVals);
      rr.eachCell((c) => {
        c.font = { size: 10 };
        c.border = BORDER;
        if (typeof c.value === 'number') {
          c.alignment = { horizontal: 'right' };
          c.numFmt = '#,##0';
        }
      });
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Laporan_Custom_${stamp}.xlsx"`,
    },
  });
}

// ─── Word ────────────────────────────────────────────────────────────────────
async function buildWord(report, config) {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle } = docx;

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  };

  const sections = report.sheets.map((sheet) => {
    const headerCells = ['No', 'Desa', 'Tahun', ...sheet.columns.map((c) => c.label)].map((label) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
        borders: cellBorder,
      })
    );

    const dataRows = sheet.rows.map((r, i) => new TableRow({
      children: [
        i + 1, r._desa_nama, r.tahun, ...sheet.columns.map((c) => Number(r[c.key] || 0)),
      ].map((v) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(v), size: 18 })], alignment: AlignmentType.CENTER })],
        borders: cellBorder,
      })),
    }));

    return {
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: sheet.title, bold: true, size: 26 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: `Periode ${config.tahunFrom}–${config.tahunTo}`, size: 20 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Table({
          rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    };
  });

  const doc = new Document({
    sections: sections.length > 0 ? sections : [{ children: [new Paragraph({ children: [new TextRun('Tidak ada data')] })] }],
    creator: 'Sistem Rekapitulasi PKK',
  });

  const buffer = await Packer.toBuffer(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Laporan_Custom_${stamp}.docx"`,
    },
  });
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
async function buildPdf(report, config) {
  const PDFKit = (await import('pdfkit')).default;
  const stamp = new Date().toISOString().slice(0, 10);

  const doc = new PDFKit({ size: 'A4', layout: 'landscape', margin: 36, info: { Title: 'Laporan PKK', Author: 'Sistem Rekapitulasi PKK' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));

  // Header function
  const addHeader = (text) => {
    doc.fontSize(14).font('Helvetica-Bold').text(text, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Periode ${config.tahunFrom}–${config.tahunTo} · TP PKK Kec. Baturetno`, { align: 'center' });
    doc.moveDown(0.5);
  };

  let firstSheet = true;
  for (const sheet of report.sheets) {
    if (!firstSheet) doc.addPage();
    firstSheet = false;

    addHeader(sheet.title);

    // Compute column widths
    const headers = ['No', 'Desa', 'Tahun', ...sheet.columns.map((c) => c.label)];
    const usableWidth = doc.page.width - 72;
    const fixedW = [24, 90, 40];
    const dataW = (usableWidth - fixedW.reduce((a, b) => a + b, 0)) / sheet.columns.length;
    const widths = [...fixedW, ...sheet.columns.map(() => Math.max(40, dataW))];

    const startY = doc.y;
    let y = startY;

    // Render header row
    doc.fontSize(8).font('Helvetica-Bold');
    let x = doc.page.margins.left;
    headers.forEach((h, idx) => {
      doc.rect(x, y, widths[idx], 22).fill('#0d7377').stroke('#0d7377');
      doc.fillColor('#ffffff').text(h, x + 2, y + 6, { width: widths[idx] - 4, align: 'center', ellipsis: true });
      x += widths[idx];
    });
    doc.fillColor('#000000');
    y += 22;

    // Render rows
    doc.fontSize(8).font('Helvetica');
    sheet.rows.forEach((r, i) => {
      if (y > doc.page.height - doc.page.margins.bottom - 22) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      let xx = doc.page.margins.left;
      const rowH = 18;
      const cells = [
        String(i + 1), r._desa_nama || '-', String(r.tahun),
        ...sheet.columns.map((c) => Number(r[c.key] || 0).toLocaleString('id-ID')),
      ];
      cells.forEach((val, idx) => {
        doc.rect(xx, y, widths[idx], rowH).strokeColor('#cccccc').stroke();
        doc.fillColor('#000000').text(val, xx + 2, y + 4, { width: widths[idx] - 4, align: idx >= 3 ? 'right' : (idx === 1 ? 'left' : 'center'), ellipsis: true });
        xx += widths[idx];
      });
      y += rowH;
    });

    doc.moveDown();
  }

  if (report.sheets.length === 0) {
    addHeader('Laporan Custom');
    doc.fontSize(11).text('Tidak ada data untuk konfigurasi yang dipilih.', { align: 'center' });
  }

  doc.end();
  await done;

  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Laporan_Custom_${stamp}.pdf"`,
    },
  });
}
