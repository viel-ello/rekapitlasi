import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';

export const dynamic = 'force-dynamic';

function cell(text, opts = {}) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 18, font: 'Arial', bold: opts.bold || false })], alignment: opts.align || AlignmentType.CENTER })],
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    verticalAlign: 'center',
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();

    const { data: desa, error } = await supabase.from('desa').select('*').eq('is_active', 1).order('nomor_urut', { ascending: true });
    if (error) throw error;
    const pokjaData = {
      'POKJA I': { table: 'data_pokja1', program: 'Penghayatan & Pengamalan Pancasila', ketua: '' },
      'POKJA II': { table: 'data_pokja2', program: 'Pendidikan & Keterampilan, Koperasi', ketua: '' },
      'POKJA III': { table: 'data_pokja3', program: 'Pangan, Sandang, Tata Laksana RT', ketua: '' },
      'POKJA IV': { table: 'data_pokja4', program: 'Kesehatan, Kelestarian Lingkungan', ketua: '' },
    };

    const triwulan = ['I', 'II', 'III', 'IV'];
    const sumberDana = ['APBN', 'APBD', 'BANT', 'SWD'];
    const headerCols = ['No', 'Program', 'Prioritas', 'Kegiatan', 'Sasaran', 'Target', ...triwulan, ...sumberDana, 'Ket'];
    
    const sections = [];

    for (const [pokjaName, info] of Object.entries(pokjaData)) {
      // Title
      sections.push(
        new Paragraph({ children: [new TextRun({ text: `PROGRAM KERJA TIM PENGGERAK PKK DESA BELIKURIP KECAMATAN BATURETNO`, bold: true, size: 24, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: pokjaName, bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: `TAHUN ${tahun}`, bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
      );

      // Table header
      const headerRow = new TableRow({
        children: headerCols.map(h => cell(h, { bold: true, width: h === 'No' ? 500 : h === 'Kegiatan' ? 2500 : 1000 })),
        tableHeader: true,
      });

      // Empty rows for data entry (5 rows per pokja as template)
      const dataRows = [];
      for (let i = 1; i <= 5; i++) {
        dataRows.push(new TableRow({
          children: headerCols.map((_, ci) => cell(ci === 0 ? String(i) : '', { width: ci === 0 ? 500 : ci === 3 ? 2500 : 1000 })),
        }));
      }

      const table = new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      sections.push(table);

      // Signature
      sections.push(
        new Paragraph({ children: [], spacing: { before: 400 } }),
        new Paragraph({ children: [new TextRun({ text: `Baturetno, ..................... ${tahun}`, size: 20, font: 'Arial' })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `TP PKK Desa Belikurip`, size: 20, font: 'Arial' })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `Ketua`, size: 20, font: 'Arial' })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [], spacing: { before: 600 } }),
        new Paragraph({ children: [new TextRun({ text: `(.................................)`, size: 20, font: 'Arial' })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [], spacing: { before: 200 } }),
      );
    }

    const doc = new Document({
      sections: [{ children: sections }],
      creator: 'Sistem Rekapitulasi PKK',
      title: `Program Kerja PKK ${tahun}`,
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, { status: 200, headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Program_Kerja_PKK_${tahun}.docx"`,
    }});
  } catch (error) {
    console.error('Word export error:', error);
    return NextResponse.json({ error: 'Gagal mengekspor Word' }, { status: 500 });
  }
}
