/**
 * @file Excel export — pixel-perfect layout per laporan resmi PKK Desa Belikurip.
 *
 * Mengikuti spec di .kiro/specs/migrasi-level-desa/design.md:
 *   Annex A — Bumil      (header 3-row title + BULAN/TAHUN, multi-row header 18 kolom)
 *   Annex B — Pokja I    (latar hijau, 19 kolom 3-level header)
 *   Annex C — Pokja II   (latar putih, 36 kolom 4-level header, A3)
 *   Annex D — Pokja III  (latar biru muda, 19 kolom 3-level header)
 *   Annex E — Pokja IV   (latar kuning muda, 26 kolom 4-level header, A3)
 *   Annex F — Rekap Dawis (34 kolom 4-level header, A3)
 *
 * Untuk Data Umum: layout single-row header dengan branding Desa Belikurip.
 *
 * GET /api/export/excel?tahun=YYYY[&bulan=MM][&table=...]  (table opsional, default semua)
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { requireAuth, normalizeTableName } from '@/lib/auth';
import { DUSUN_LIST } from '@/lib/dusun';
import { MONTHS } from '@/lib/dataPages';
import { BRAND } from '@/lib/branding';

export const dynamic = 'force-dynamic';

const BORDER_THIN = {
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' },
};

// Latar header per pokja (per gambar referensi)
const HEADER_FILLS = {
  pokja1: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }, // hijau muda
  pokja3: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCE5FF' } }, // biru muda
  pokja4: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }, // kuning muda
};

function unitIdOf(row) {
  return row?.dusun_id ?? row?.desa_id;
}

/**
 * Fetch data per dusun untuk tabel target. Return Map { dusunNama -> rowData }.
 * Untuk data_bumil dengan bulan: filter bulan; tanpa bulan: aggregate semua bulan jadi 1 row per dusun.
 */
async function fetchDusunData(table, tahun, bulan = null, dusunByName) {
  let q = supabase.from(table).select('*').eq('tahun', tahun);
  if (table === 'data_bumil' && bulan != null) q = q.eq('bulan', bulan);
  const { data: rows } = await q;

  const map = {};
  for (const dusunNama of Object.keys(dusunByName)) {
    map[dusunNama] = {};
  }

  for (const row of rows || []) {
    const id = unitIdOf(row);
    const dusunName = Object.keys(dusunByName).find((nama) => dusunByName[nama].id === id);
    if (!dusunName) continue;

    if (table === 'data_bumil' && bulan == null) {
      // Aggregate semua bulan
      const existing = map[dusunName];
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'number') {
          existing[k] = (existing[k] || 0) + v;
        } else if (existing[k] == null) {
          existing[k] = v;
        }
      }
    } else {
      map[dusunName] = row;
    }
  }
  return map;
}

/** Apply BORDER_THIN + center align ke range (rowStart..rowEnd, colStart..colEnd). */
function applyBorderRange(ws, rowStart, rowEnd, colStart, colEnd, fill = null) {
  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      const cell = ws.getCell(r, c);
      cell.border = BORDER_THIN;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      if (fill) cell.fill = fill;
    }
  }
}

function applyBoldRows(ws, rows, colStart, colEnd) {
  for (const r of rows) {
    for (let c = colStart; c <= colEnd; c++) {
      ws.getCell(r, c).font = { bold: true, name: 'Arial', size: 10 };
    }
  }
}

function setColumnWidths(ws, widths) {
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

// ──────────────────────────────────────────────────────────────────────────────
// Annex A — Bumil
// ──────────────────────────────────────────────────────────────────────────────
function buildBumilSheet(wb, tahun, bulan, dusunListSorted, dataMap, rekapDawisMap) {
  const ws = wb.addWorksheet('Bumil', { pageSetup: { orientation: 'landscape', paperSize: 9 } }); // A4

  // 1. Title (rows 1-3) — merge col A:R (18 kolom)
  ws.mergeCells('A1:R1'); ws.getCell('A1').value = 'REKAPITULASI DATA/BUKU CATATAN';
  ws.mergeCells('A2:R2'); ws.getCell('A2').value = 'IBU HAMIL,MELAHIRKAN,NIFAS,IBU MENINGGAL,KELAHIRAN BAYI,BAYI MENINGGAL DAN KEMATIAN BALITA';
  ws.mergeCells('A3:R3'); ws.getCell('A3').value = 'TP PKK DESA BELIKURIP';
  for (const r of [1, 2, 3]) {
    const cell = ws.getCell(r, 1);
    cell.font = { bold: true, name: 'Arial', size: r === 1 ? 12 : (r === 3 ? 12 : 10) };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  // 2. Period labels (rows 4-5)
  const namaBulan = bulan != null ? MONTHS[bulan - 1] : '';
  ws.getCell('A4').value = 'BULAN';
  ws.getCell('B4').value = `: ${namaBulan}`;
  ws.getCell('A5').value = 'TAHUN';
  ws.getCell('B5').value = `: ${tahun}`;
  for (const r of [4, 5]) {
    ws.getCell(r, 1).font = { bold: true, name: 'Arial', size: 10 };
  }

  // 3. Header table (rows 6-8)
  ws.mergeCells('A6:A8'); ws.getCell('A6').value = 'NO';
  ws.mergeCells('B6:B8'); ws.getCell('B6').value = 'Nama Dusun';
  ws.mergeCells('C6:E6'); ws.getCell('C6').value = 'JUMLAH';
  ws.mergeCells('F6:I6'); ws.getCell('F6').value = 'JUMLAH IBU';
  ws.mergeCells('J6:O6'); ws.getCell('J6').value = 'JUMLAH BAYI';
  ws.mergeCells('P6:Q6'); ws.getCell('P6').value = 'Jml Balita Meninggal';
  ws.mergeCells('R6:R8'); ws.getCell('R6').value = 'Keterangan';

  // Row 7: sub-headers
  ws.mergeCells('C7:C8'); ws.getCell('C7').value = 'RT';
  ws.mergeCells('D7:D8'); ws.getCell('D7').value = 'RW';
  ws.mergeCells('E7:E8'); ws.getCell('E7').value = 'Dawis';
  ws.mergeCells('F7:F8'); ws.getCell('F7').value = 'Hamil';
  ws.mergeCells('G7:G8'); ws.getCell('G7').value = 'Melahirkan';
  ws.mergeCells('H7:H8'); ws.getCell('H7').value = 'Nifas';
  ws.mergeCells('I7:I8'); ws.getCell('I7').value = 'Meninggal';
  ws.mergeCells('J7:K7'); ws.getCell('J7').value = 'Lahir';
  ws.mergeCells('L7:M7'); ws.getCell('L7').value = 'Akte Kelahiran';
  ws.mergeCells('N7:O7'); ws.getCell('N7').value = 'Meninggal';
  ws.mergeCells('P7:P8'); ws.getCell('P7').value = 'L';
  ws.mergeCells('Q7:Q8'); ws.getCell('Q7').value = 'P';

  // Row 8: leaf labels untuk JUMLAH BAYI
  ws.getCell('J8').value = 'L'; ws.getCell('K8').value = 'P';
  ws.getCell('L8').value = 'L'; ws.getCell('M8').value = 'P';
  ws.getCell('N8').value = 'L'; ws.getCell('O8').value = 'P';

  // 4. Column number reference (row 9)
  for (let i = 1; i <= 18; i++) ws.getCell(9, i).value = i;

  // 5. Data rows (rows 10-18)
  dusunListSorted.forEach((dusun, idx) => {
    const r = 10 + idx;
    const data = dataMap[dusun.nama] || {};
    const kw = rekapDawisMap[dusun.nama] || {};
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = dusun.nama;
    ws.getCell(r, 3).value = kw.jml_rt ?? data.jml_rt ?? 0;
    ws.getCell(r, 4).value = kw.jml_rw ?? data.jml_rw ?? 0;
    ws.getCell(r, 5).value = kw.jml_dawis ?? data.jml_dasa_wisma ?? 0;
    ws.getCell(r, 6).value = data.ibu_hamil ?? 0;
    ws.getCell(r, 7).value = data.ibu_melahirkan ?? 0;
    ws.getCell(r, 8).value = data.ibu_nifas ?? 0;
    ws.getCell(r, 9).value = data.ibu_meninggal ?? 0;
    ws.getCell(r, 10).value = data.bayi_lahir_l ?? 0;
    ws.getCell(r, 11).value = data.bayi_lahir_p ?? 0;
    ws.getCell(r, 12).value = data.akte_l ?? 0;
    ws.getCell(r, 13).value = data.akte_p ?? 0;
    ws.getCell(r, 14).value = data.bayi_meninggal_l ?? 0;
    ws.getCell(r, 15).value = data.bayi_meninggal_p ?? 0;
    ws.getCell(r, 16).value = data.balita_meninggal_l ?? 0;
    ws.getCell(r, 17).value = data.balita_meninggal_p ?? 0;
    ws.getCell(r, 18).value = data.keterangan ?? '';
  });

  // 6. Total row (row 19)
  ws.getCell(19, 2).value = 'Jumlah';
  for (let col = 3; col <= 17; col++) {
    const letter = ws.getColumn(col).letter;
    ws.getCell(19, col).value = { formula: `SUM(${letter}10:${letter}18)` };
  }

  // 7. Borders + alignment + bold header
  applyBorderRange(ws, 6, 19, 1, 18);
  applyBoldRows(ws, [6, 7, 8, 19], 1, 18);

  // 8. Column widths
  setColumnWidths(ws, [4, 16, 6, 6, 6, 8, 11, 7, 9, 5, 5, 5, 5, 5, 5, 5, 5, 14]);
}

// ──────────────────────────────────────────────────────────────────────────────
// Annex B — Pokja I
// ──────────────────────────────────────────────────────────────────────────────
function buildPokja1Sheet(wb, tahun, dusunListSorted, dataMap) {
  const ws = wb.addWorksheet('Pokja I', { pageSetup: { orientation: 'landscape', paperSize: 9 } });

  // 1. Title
  ws.mergeCells('A1:S1'); ws.getCell('A1').value = 'DATA KEGIATAN PKK';
  ws.mergeCells('A2:S2'); ws.getCell('A2').value = 'DESA   : BELIKURIP';
  ws.mergeCells('A3:S3'); ws.getCell('A3').value = 'POKJA I';
  for (const r of [1, 2, 3]) {
    const cell = ws.getCell(r, 1);
    cell.font = { bold: true, name: 'Arial', size: 12 };
    cell.alignment = { horizontal: 'center' };
  }

  // 2. Period label
  ws.getCell('A5').value = `TAHUN : ${tahun}`;
  ws.getCell('A5').font = { bold: true, name: 'Arial', size: 10 };

  // 3. Header table (rows 7-9)
  ws.mergeCells('A7:A9'); ws.getCell('A7').value = 'No';
  ws.mergeCells('B7:B9'); ws.getCell('B7').value = 'NAMA DUSUN';
  ws.mergeCells('C7:E7'); ws.getCell('C7').value = 'JUMLAH KADER';
  ws.mergeCells('F7:M7'); ws.getCell('F7').value = 'PENGHAYATAN DAN PENGAMALAN PANCASILA';
  ws.mergeCells('N7:R7'); ws.getCell('N7').value = 'GOTONG ROYONG';
  ws.mergeCells('S7:S9'); ws.getCell('S7').value = 'KET';

  // Row 8 sub-groups
  ws.mergeCells('C8:C9'); ws.getCell('C8').value = 'PKBN';
  ws.mergeCells('D8:D9'); ws.getCell('D8').value = 'PKDRT';
  ws.mergeCells('E8:E9'); ws.getCell('E8').value = 'POLA ASUH';
  ws.mergeCells('F8:G8'); ws.getCell('F8').value = 'PKBN';
  ws.mergeCells('H8:I8'); ws.getCell('H8').value = 'PKDRT';
  ws.mergeCells('J8:K8'); ws.getCell('J8').value = 'POLA ASUH';
  ws.mergeCells('L8:M8'); ws.getCell('L8').value = 'LANSIA';
  ws.mergeCells('N8:N9'); ws.getCell('N8').value = 'KERJA BAKTI';
  ws.mergeCells('O8:O9'); ws.getCell('O8').value = 'RUKUN KEMATIAN';
  ws.mergeCells('P8:R8'); ws.getCell('P8').value = 'JUMLAH KELOMPOK';

  // Row 9 leaf labels
  const leafsF = ['JML KLP SIMULASI', 'JML ANG', 'JML KLP SIMULASI', 'JML ANG', 'JML KLP SIMULASI', 'JML ANG', 'JML KLP SIMULASI', 'JML ANG'];
  leafsF.forEach((label, i) => { ws.getCell(9, 6 + i).value = label; });
  ws.getCell('P9').value = 'KEAGAMAAN';
  ws.getCell('Q9').value = 'JIMPITAN';
  ws.getCell('R9').value = 'ARISAN';

  // 4. Column number reference (row 10)
  for (let i = 1; i <= 19; i++) ws.getCell(10, i).value = i;

  // 5. Data rows (rows 11-19)
  dusunListSorted.forEach((dusun, idx) => {
    const r = 11 + idx;
    const data = dataMap[dusun.nama] || {};
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = dusun.nama.toUpperCase();
    ws.getCell(r, 3).value = data.kader_pkbn ?? 0;
    ws.getCell(r, 4).value = data.kader_pkdrt ?? 0;
    ws.getCell(r, 5).value = data.kader_pola_asuh ?? 0;
    ws.getCell(r, 6).value = data.pkbn_jml_klp_simulasi ?? 0;
    ws.getCell(r, 7).value = data.pkbn_jml_anggota ?? 0;
    ws.getCell(r, 8).value = data.pkdrt_jml_klp_simulasi ?? 0;
    ws.getCell(r, 9).value = data.pkdrt_jml_anggota ?? 0;
    ws.getCell(r, 10).value = data.pola_asuh_jml_klp ?? 0;
    ws.getCell(r, 11).value = data.pola_asuh_jml_anggota ?? 0;
    ws.getCell(r, 12).value = data.lansia_jml_klp ?? 0;
    ws.getCell(r, 13).value = data.lansia_jml_anggota ?? 0;
    ws.getCell(r, 14).value = data.gr_kerja_bakti ?? 0;
    ws.getCell(r, 15).value = data.gr_rukun_kematian ?? 0;
    ws.getCell(r, 16).value = data.gr_keagamaan ?? 0;
    ws.getCell(r, 17).value = data.gr_jimpitan ?? 0;
    ws.getCell(r, 18).value = data.gr_arisan ?? 0;
    ws.getCell(r, 19).value = data.keterangan ?? '';
  });

  // 6. Total row (row 20)
  ws.getCell(20, 2).value = 'JUMLAH';
  for (let col = 3; col <= 18; col++) {
    const letter = ws.getColumn(col).letter;
    ws.getCell(20, col).value = { formula: `SUM(${letter}11:${letter}19)` };
  }

  // 7. Borders + alignment + header background hijau
  applyBorderRange(ws, 7, 20, 1, 19);
  applyBorderRange(ws, 7, 10, 1, 19, HEADER_FILLS.pokja1);
  applyBoldRows(ws, [7, 8, 9, 10, 20], 1, 19);

  // 8. Column widths
  setColumnWidths(ws, [4, 16, 7, 7, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 6]);
}

// ──────────────────────────────────────────────────────────────────────────────
// Annex C — Pokja II
// ──────────────────────────────────────────────────────────────────────────────
function buildPokja2Sheet(wb, tahun, dusunListSorted, dataMap) {
  const ws = wb.addWorksheet('Pokja II', { pageSetup: { orientation: 'landscape', paperSize: 8 } }); // A3

  // 1. Title
  ws.mergeCells('A1:AJ1'); ws.getCell('A1').value = 'DATA KEGIATAN PKK';
  ws.mergeCells('A2:AJ2'); ws.getCell('A2').value = 'DESA   : BELIKURIP';
  ws.mergeCells('A3:AJ3'); ws.getCell('A3').value = 'POKJA II';
  for (const r of [1, 2, 3]) {
    const cell = ws.getCell(r, 1);
    cell.font = { bold: true, name: 'Arial', size: 12 };
    cell.alignment = { horizontal: 'center' };
  }

  ws.getCell('A5').value = `TAHUN : ${tahun}`;
  ws.getCell('A5').font = { bold: true, name: 'Arial', size: 10 };

  // 3. Header table (rows 7-10) — 4 baris
  ws.mergeCells('A7:A10'); ws.getCell('A7').value = 'No';
  ws.mergeCells('B7:B10'); ws.getCell('B7').value = 'Nama Dusun';
  ws.mergeCells('C7:Y7'); ws.getCell('C7').value = 'PENDIDIKAN DAN KETRAMPILAN';
  ws.mergeCells('Z7:AI7'); ws.getCell('Z7').value = 'PENGEMBANGAN KEH BERKOPERASI';
  ws.mergeCells('AJ7:AJ10'); ws.getCell('AJ7').value = 'KET';

  // Row 8: sub-groups level 2
  ws.mergeCells('C8:C10'); ws.getCell('C8').value = 'Jml Wrg yg Masih 3 Buta';
  ws.mergeCells('D8:E8'); ws.getCell('D8').value = 'PAKET A';
  ws.mergeCells('F8:G8'); ws.getCell('F8').value = 'PAKET B';
  ws.mergeCells('H8:I8'); ws.getCell('H8').value = 'PAKET C';
  ws.mergeCells('J8:K8'); ws.getCell('J8').value = 'KF';
  ws.mergeCells('L8:L10'); ws.getCell('L8').value = 'PAUD SEJENIS';
  ws.mergeCells('M8:M10'); ws.getCell('M8').value = 'JML TAMAN BACAAN';
  ws.mergeCells('N8:N10'); ws.getCell('N8').value = 'JML KLP PEMBACA';
  ws.mergeCells('O8:Q8'); ws.getCell('O8').value = 'BKB';
  ws.mergeCells('R8:V8'); ws.getCell('R8').value = 'KADER KHUSUS';
  ws.mergeCells('W8:Y8'); ws.getCell('W8').value = 'YG SDH DI LATIH';
  ws.mergeCells('Z8:AG8'); ws.getCell('Z8').value = 'PRA KOPERASI/USAHA BERSAMA/UP2K';
  ws.mergeCells('AH8:AI8'); ws.getCell('AH8').value = 'KOPERASI HUKUM';

  // Row 9: sub-sub-groups level 3
  ['JML KLP', 'JML WRG', 'JML KLP', 'JML WRG', 'JML KLP', 'JML WRG', 'JML KLP', 'JML WRG']
    .forEach((label, i) => {
      ws.mergeCells(9, 4 + i, 10, 4 + i);
      ws.getCell(9, 4 + i).value = label;
    });
  ['JML KLP', 'Jml APE Set', 'Jml APE Set'].forEach((label, i) => {
    ws.mergeCells(9, 15 + i, 10, 15 + i);
    ws.getCell(9, 15 + i).value = label;
  });
  // KADER KHUSUS sub: TUTOR (R-S), BKB (T), KOPERASI (U), KETRAMPILAN (V)
  ws.mergeCells('R9:S9'); ws.getCell('R9').value = 'TUTOR';
  ws.mergeCells('T9:T10'); ws.getCell('T9').value = 'BKB';
  ws.mergeCells('U9:U10'); ws.getCell('U9').value = 'KOPERASI';
  ws.mergeCells('V9:V10'); ws.getCell('V9').value = 'KETRAMPILAN';
  // YG SDH DI LATIH leaf
  ['LP3PKK', 'TP3PKK', 'DAMAS PKK'].forEach((label, i) => {
    ws.mergeCells(9, 23 + i, 10, 23 + i);
    ws.getCell(9, 23 + i).value = label;
  });
  // PRA KOPERASI sub: PEMULA, MADYA, UTAMA, MANDIRI (Z-AG, colspan=2 each)
  ws.mergeCells('Z9:AA9'); ws.getCell('Z9').value = 'PEMULA';
  ws.mergeCells('AB9:AC9'); ws.getCell('AB9').value = 'MADYA';
  ws.mergeCells('AD9:AE9'); ws.getCell('AD9').value = 'UTAMA';
  ws.mergeCells('AF9:AG9'); ws.getCell('AF9').value = 'MANDIRI';
  // KOPERASI HUKUM
  ws.mergeCells('AH9:AH10'); ws.getCell('AH9').value = 'JML KLP';
  ws.mergeCells('AI9:AI10'); ws.getCell('AI9').value = 'JML PSRTA';

  // Row 10: leaf labels TUTOR & PRA KOPERASI level 4
  ws.getCell('R10').value = 'KF';
  ws.getCell('S10').value = 'PAUD Sejenis';
  ['JML KLP', 'JML PSRTA', 'JML KLP', 'JML PSRTA', 'JML KLP', 'JML PSRTA', 'JML KLP', 'JML PSRTA']
    .forEach((label, i) => { ws.getCell(10, 26 + i).value = label; });

  // 4. Column number reference (row 11)
  for (let i = 1; i <= 36; i++) ws.getCell(11, i).value = i;

  // 5. Data rows (rows 12-20)
  dusunListSorted.forEach((dusun, idx) => {
    const r = 12 + idx;
    const data = dataMap[dusun.nama] || {};
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = dusun.nama.toUpperCase();
    ws.getCell(r, 3).value = data.jml_warga_3_buta ?? 0;
    ws.getCell(r, 4).value = data.paket_a_klp ?? 0;
    ws.getCell(r, 5).value = data.paket_a_wrg ?? 0;
    ws.getCell(r, 6).value = data.paket_b_klp ?? 0;
    ws.getCell(r, 7).value = data.paket_b_wrg ?? 0;
    ws.getCell(r, 8).value = data.paket_c_klp ?? 0;
    ws.getCell(r, 9).value = data.paket_c_wrg ?? 0;
    ws.getCell(r, 10).value = data.kf_klp ?? 0;
    ws.getCell(r, 11).value = data.kf_wrg ?? 0;
    ws.getCell(r, 12).value = data.paud_sejenis ?? 0;
    ws.getCell(r, 13).value = data.taman_bacaan ?? 0;
    ws.getCell(r, 14).value = data.klp_pembaca ?? 0;
    ws.getCell(r, 15).value = data.bkb_klp ?? 0;
    ws.getCell(r, 16).value = data.bkb_ape_set_a ?? 0;
    ws.getCell(r, 17).value = data.bkb_ape_set_b ?? 0;
    ws.getCell(r, 18).value = data.kader_tutor_kf ?? 0;
    ws.getCell(r, 19).value = data.kader_tutor_paud ?? 0;
    ws.getCell(r, 20).value = data.kader_bkb ?? 0;
    ws.getCell(r, 21).value = data.kader_khusus_koperasi ?? 0;
    ws.getCell(r, 22).value = data.kader_khusus_keterampilan ?? 0;
    ws.getCell(r, 23).value = data.yg_dilatih_lp3pkk ?? 0;
    ws.getCell(r, 24).value = data.yg_dilatih_tp3pkk ?? 0;
    ws.getCell(r, 25).value = data.yg_dilatih_damaspkk ?? 0;
    ws.getCell(r, 26).value = data.up2k_pemula_klp ?? 0;
    ws.getCell(r, 27).value = data.up2k_pemula_psrt ?? 0;
    ws.getCell(r, 28).value = data.up2k_madya_klp ?? 0;
    ws.getCell(r, 29).value = data.up2k_madya_psrt ?? 0;
    ws.getCell(r, 30).value = data.up2k_utama_klp ?? 0;
    ws.getCell(r, 31).value = data.up2k_utama_psrt ?? 0;
    ws.getCell(r, 32).value = data.up2k_mandiri_klp ?? 0;
    ws.getCell(r, 33).value = data.up2k_mandiri_psrt ?? 0;
    ws.getCell(r, 34).value = data.koperasi_berbadan_hukum_kop ?? 0;
    ws.getCell(r, 35).value = data.koperasi_berbadan_hukum_angg ?? 0;
    ws.getCell(r, 36).value = data.keterangan ?? '';
  });

  // 6. Total (row 21)
  ws.getCell(21, 2).value = 'JUMLAH';
  for (let col = 3; col <= 35; col++) {
    const letter = ws.getColumn(col).letter;
    ws.getCell(21, col).value = { formula: `SUM(${letter}12:${letter}20)` };
  }

  // 7. Borders + bold header
  applyBorderRange(ws, 7, 21, 1, 36);
  applyBoldRows(ws, [7, 8, 9, 10, 11, 21], 1, 36);

  // 8. Column widths
  const widths = [4, 14, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6];
  setColumnWidths(ws, widths);
}

// ──────────────────────────────────────────────────────────────────────────────
// Annex D — Pokja III
// ──────────────────────────────────────────────────────────────────────────────
function buildPokja3Sheet(wb, tahun, dusunListSorted, dataMap) {
  const ws = wb.addWorksheet('Pokja III', { pageSetup: { orientation: 'landscape', paperSize: 9 } });

  // 1. Title
  ws.mergeCells('A1:S1'); ws.getCell('A1').value = 'DATA KEGIATAN PKK';
  ws.mergeCells('A2:S2'); ws.getCell('A2').value = 'DESA   : BELIKURIP';
  ws.mergeCells('A3:S3'); ws.getCell('A3').value = 'POKJA III';
  for (const r of [1, 2, 3]) {
    const cell = ws.getCell(r, 1);
    cell.font = { bold: true, name: 'Arial', size: 12 };
    cell.alignment = { horizontal: 'center' };
  }

  ws.getCell('A5').value = `TAHUN : ${tahun}`;
  ws.getCell('A5').font = { bold: true, name: 'Arial', size: 10 };

  // Header (rows 7-9)
  ws.mergeCells('A7:A9'); ws.getCell('A7').value = 'NO';
  ws.mergeCells('B7:B9'); ws.getCell('B7').value = 'NAMA DUSUN';
  ws.mergeCells('C7:E7'); ws.getCell('C7').value = 'JUMLAH KADER';
  ws.mergeCells('F7:M7'); ws.getCell('F7').value = 'PANGAN';
  ws.mergeCells('N7:P7'); ws.getCell('N7').value = 'JUMLAH INDUSTRI RUMAH TANGGA';
  ws.mergeCells('Q7:R7'); ws.getCell('Q7').value = 'JUMLAH RUMAH';
  ws.mergeCells('S7:S9'); ws.getCell('S7').value = 'KETERANGAN';

  // Row 8 sub
  ws.mergeCells('C8:C9'); ws.getCell('C8').value = 'PANGAN';
  ws.mergeCells('D8:D9'); ws.getCell('D8').value = 'SANDANG';
  ws.mergeCells('E8:E9'); ws.getCell('E8').value = 'TATA LAKSANA RUMAH TANGGA';
  ws.mergeCells('F8:G8'); ws.getCell('F8').value = 'MAKANAN POKOK';
  ws.mergeCells('H8:M8'); ws.getCell('H8').value = 'PEMANFAATAN PEKARANGAN HATINYA PKK';
  ws.mergeCells('N8:N9'); ws.getCell('N8').value = 'PANGAN';
  ws.mergeCells('O8:O9'); ws.getCell('O8').value = 'SANDANG';
  ws.mergeCells('P8:P9'); ws.getCell('P8').value = 'JASA';
  ws.mergeCells('Q8:Q9'); ws.getCell('Q8').value = 'SEHAT DAN LAYAK HUNI';
  ws.mergeCells('R8:R9'); ws.getCell('R8').value = 'TIDAK SEHAT DAN TIDAK LAYAK';

  // Row 9 leaf
  ws.getCell('F9').value = 'BERAS';
  ws.getCell('G9').value = 'NON BERAS';
  ['PETERNAKAN', 'PERIKANAN', 'WARUNG HIDUP', 'LUMBUNG HIDUP', 'TOGA', 'TANAMAN KERAS']
    .forEach((label, i) => { ws.getCell(9, 8 + i).value = label; });

  // Row 10 — column numbers
  for (let i = 1; i <= 19; i++) ws.getCell(10, i).value = i;

  // Data rows (11-19)
  dusunListSorted.forEach((dusun, idx) => {
    const r = 11 + idx;
    const data = dataMap[dusun.nama] || {};
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = dusun.nama.toUpperCase();
    ws.getCell(r, 3).value = data.kader_pangan ?? 0;
    ws.getCell(r, 4).value = data.kader_sandang ?? 0;
    ws.getCell(r, 5).value = data.kader_tata_laksana_rt ?? 0;
    ws.getCell(r, 6).value = data.pangan_beras ?? 0;
    ws.getCell(r, 7).value = data.pangan_non_beras ?? 0;
    ws.getCell(r, 8).value = data.pemanfaatan_peternakan ?? 0;
    ws.getCell(r, 9).value = data.pemanfaatan_perikanan ?? 0;
    ws.getCell(r, 10).value = data.pemanfaatan_warung_hidup ?? 0;
    ws.getCell(r, 11).value = data.pemanfaatan_lumbung_hidup ?? 0;
    ws.getCell(r, 12).value = data.pemanfaatan_toga ?? 0;
    ws.getCell(r, 13).value = data.pemanfaatan_tanaman_keras ?? 0;
    ws.getCell(r, 14).value = data.industri_pangan ?? 0;
    ws.getCell(r, 15).value = data.industri_sandang ?? 0;
    ws.getCell(r, 16).value = data.industri_jasa ?? 0;
    ws.getCell(r, 17).value = data.rumah_sehat ?? 0;
    ws.getCell(r, 18).value = data.rumah_kurang_sehat ?? 0;
    ws.getCell(r, 19).value = data.keterangan ?? '';
  });

  // Total (row 20)
  ws.getCell(20, 2).value = 'JUMLAH';
  for (let col = 3; col <= 18; col++) {
    const letter = ws.getColumn(col).letter;
    ws.getCell(20, col).value = { formula: `SUM(${letter}11:${letter}19)` };
  }

  applyBorderRange(ws, 7, 20, 1, 19);
  applyBorderRange(ws, 7, 10, 1, 19, HEADER_FILLS.pokja3);
  applyBoldRows(ws, [7, 8, 9, 10, 20], 1, 19);

  setColumnWidths(ws, [4, 16, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 12, 12, 10]);
}

// ──────────────────────────────────────────────────────────────────────────────
// Annex E — Pokja IV
// ──────────────────────────────────────────────────────────────────────────────
function buildPokja4Sheet(wb, tahun, dusunListSorted, dataMap) {
  const ws = wb.addWorksheet('Pokja IV', { pageSetup: { orientation: 'landscape', paperSize: 8 } });

  // 1. Title
  ws.mergeCells('A1:Z1'); ws.getCell('A1').value = 'DATA KEGIATAN PKK';
  ws.mergeCells('A2:Z2'); ws.getCell('A2').value = 'DESA   : BELIKURIP';
  ws.mergeCells('A3:Z3'); ws.getCell('A3').value = 'POKJA IV';
  for (const r of [1, 2, 3]) {
    const cell = ws.getCell(r, 1);
    cell.font = { bold: true, name: 'Arial', size: 12 };
    cell.alignment = { horizontal: 'center' };
  }

  ws.getCell('A5').value = `TAHUN : ${tahun}`;
  ws.getCell('A5').font = { bold: true, name: 'Arial', size: 10 };

  // Header rows 7-10
  ws.mergeCells('A7:A10'); ws.getCell('A7').value = 'No';
  ws.mergeCells('B7:B10'); ws.getCell('B7').value = 'NAMA DUSUN';
  ws.mergeCells('C7:H7'); ws.getCell('C7').value = 'JUMLAH KADER';
  ws.mergeCells('I7:M7'); ws.getCell('I7').value = 'KESEHATAN';
  ws.mergeCells('N7:T7'); ws.getCell('N7').value = 'KELESTARIAN LING HIDUP';
  ws.mergeCells('U7:Y7'); ws.getCell('U7').value = 'PERENCANAAN SEHAT';
  ws.mergeCells('Z7:Z10'); ws.getCell('Z7').value = 'KET';

  // Row 8 sub-groups
  ['POSYANDU', 'GIZI', 'KESLING', 'PENYULUH NARKOBA', 'PHBS', 'KB'].forEach((label, i) => {
    ws.mergeCells(8, 3 + i, 10, 3 + i);
    ws.getCell(8, 3 + i).value = label;
  });
  ws.mergeCells('I8:M8'); ws.getCell('I8').value = 'POSYANDU';
  ws.mergeCells('N8:P8'); ws.getCell('N8').value = 'JML RUMAH YG MEMILIKI';
  ws.mergeCells('Q8:Q10'); ws.getCell('Q8').value = 'JML MCK';
  ws.mergeCells('R8:T8'); ws.getCell('R8').value = 'JML KRT YG MENGGUNAKAN AIR';
  ws.mergeCells('U8:U10'); ws.getCell('U8').value = 'JML PUS';
  ws.mergeCells('V8:V10'); ws.getCell('V8').value = 'JML WUS';
  ws.mergeCells('W8:X8'); ws.getCell('W8').value = 'JML ASEPTOR KB';
  ws.mergeCells('Y8:Y10'); ws.getCell('Y8').value = 'JML KK YG MEMILIKI TAB KES';

  // Row 9 sub-sub
  ws.mergeCells('I9:I10'); ws.getCell('I9').value = 'JUMLAH';
  ws.mergeCells('J9:J10'); ws.getCell('J9').value = 'TERINTEGRASI';
  ws.mergeCells('K9:M9'); ws.getCell('K9').value = 'LANSIA';
  ['JAMBAN', 'SPAL', 'TEMPAT PEMBUANGAN SAMPAH'].forEach((label, i) => {
    ws.mergeCells(9, 14 + i, 10, 14 + i);
    ws.getCell(9, 14 + i).value = label;
  });
  ['PDAM', 'SUMUR', 'DLL'].forEach((label, i) => {
    ws.mergeCells(9, 18 + i, 10, 18 + i);
    ws.getCell(9, 18 + i).value = label;
  });
  ws.mergeCells('W9:W10'); ws.getCell('W9').value = 'L';
  ws.mergeCells('X9:X10'); ws.getCell('X9').value = 'P';

  // Row 10 leaf LANSIA
  ws.getCell('K10').value = 'JML KLP';
  ws.getCell('L10').value = 'JML ANG';
  ws.getCell('M10').value = 'JML YG MMLKI KARTU BEROBAT/GRTAS';

  // Row 11 column numbers
  for (let i = 1; i <= 26; i++) ws.getCell(11, i).value = i;

  // Data rows (12-20)
  dusunListSorted.forEach((dusun, idx) => {
    const r = 12 + idx;
    const data = dataMap[dusun.nama] || {};
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = dusun.nama.toUpperCase();
    ws.getCell(r, 3).value = data.kader_posyandu ?? 0;
    ws.getCell(r, 4).value = data.kader_gizi ?? 0;
    ws.getCell(r, 5).value = data.kader_kesling ?? 0;
    ws.getCell(r, 6).value = data.kader_penyuluh_narkoba ?? 0;
    ws.getCell(r, 7).value = data.kader_phbs ?? 0;
    ws.getCell(r, 8).value = data.kader_kb ?? 0;
    ws.getCell(r, 9).value = data.posyandu_jumlah ?? 0;
    ws.getCell(r, 10).value = data.posyandu_terintegrasi ?? 0;
    ws.getCell(r, 11).value = data.lansia_jml_klp ?? 0;
    ws.getCell(r, 12).value = data.lansia_jml_anggota ?? 0;
    ws.getCell(r, 13).value = data.lansia_jml_kartu_berobat ?? 0;
    ws.getCell(r, 14).value = data.rumah_jamban ?? 0;
    ws.getCell(r, 15).value = data.rumah_spal ?? 0;
    ws.getCell(r, 16).value = data.rumah_tempat_sampah ?? 0;
    ws.getCell(r, 17).value = data.rumah_mck ?? 0;
    ws.getCell(r, 18).value = data.air_pdam ?? 0;
    ws.getCell(r, 19).value = data.air_sumur ?? 0;
    ws.getCell(r, 20).value = data.air_lain ?? 0;
    ws.getCell(r, 21).value = data.jml_pus ?? 0;
    ws.getCell(r, 22).value = data.jml_wus ?? 0;
    ws.getCell(r, 23).value = data.akseptor_kb_l ?? 0;
    ws.getCell(r, 24).value = data.akseptor_kb_p ?? 0;
    ws.getCell(r, 25).value = data.kk_tabungan ?? 0;
    ws.getCell(r, 26).value = data.keterangan ?? '';
  });

  // Total (row 21)
  ws.getCell(21, 2).value = 'JUMLAH';
  for (let col = 3; col <= 25; col++) {
    const letter = ws.getColumn(col).letter;
    ws.getCell(21, col).value = { formula: `SUM(${letter}12:${letter}20)` };
  }

  applyBorderRange(ws, 7, 21, 1, 26);
  applyBorderRange(ws, 7, 11, 1, 26, HEADER_FILLS.pokja4);
  applyBoldRows(ws, [7, 8, 9, 10, 11, 21], 1, 26);

  const widths = [4, 14, 7, 7, 7, 8, 7, 7, 8, 8, 8, 8, 9, 8, 8, 9, 6, 7, 7, 7, 6, 6, 5, 5, 9, 6];
  setColumnWidths(ws, widths);
}

// ──────────────────────────────────────────────────────────────────────────────
// Annex F — Rekap Dawis
// ──────────────────────────────────────────────────────────────────────────────
function buildRekapDawisSheet(wb, tahun, dusunListSorted, dataMap) {
  const ws = wb.addWorksheet('Rekap Dawis', { pageSetup: { orientation: 'landscape', paperSize: 8 } });

  // 1. Title (rows 1-3)
  ws.mergeCells('A1:AH1'); ws.getCell('A1').value = 'CATATAN DATA DAN KEGIATAN WARGA';
  ws.mergeCells('A2:AH2'); ws.getCell('A2').value = 'TP PKK DESA BELIKURIP KECAMATAN BATURETNO';
  ws.mergeCells('A3:AH3'); ws.getCell('A3').value = `TAHUN ${tahun}`;
  for (const r of [1, 2, 3]) {
    const cell = ws.getCell(r, 1);
    cell.font = { bold: true, name: 'Arial', size: r === 1 ? 12 : 10 };
    cell.alignment = { horizontal: 'center' };
  }

  // 2. Header (rows 4-7)
  ws.mergeCells('A4:A7'); ws.getCell('A4').value = 'No';
  ws.mergeCells('B4:B7'); ws.getCell('B4').value = 'Nama dusun';
  ws.mergeCells('C4:C7'); ws.getCell('C4').value = 'Jml RW';
  ws.mergeCells('D4:D7'); ws.getCell('D4').value = 'Jml RT';
  ws.mergeCells('E4:E7'); ws.getCell('E4').value = 'Jml dawis';
  ws.mergeCells('F4:F7'); ws.getCell('F4').value = 'Jml KRT';
  ws.mergeCells('G4:G7'); ws.getCell('G4').value = 'Jml KK';
  ws.mergeCells('H4:R4'); ws.getCell('H4').value = 'Jml Angg keluarga';
  ws.mergeCells('S4:X4'); ws.getCell('S4').value = 'Jumlah Rumah';
  ws.mergeCells('Y4:AB4'); ws.getCell('Y4').value = 'Sumber Air Keluarga';
  ws.mergeCells('AC4:AD4'); ws.getCell('AC4').value = 'Makanan';
  ws.mergeCells('AE4:AG4'); ws.getCell('AE4').value = 'Wrg yg mengikuti';
  ws.mergeCells('AH4:AH7'); ws.getCell('AH4').value = 'KET (JKN/BPJS)';

  // Row 5 sub: Jml Angg keluarga
  ws.mergeCells('H5:I5'); ws.getCell('H5').value = 'Total';
  ws.mergeCells('J5:K5'); ws.getCell('J5').value = 'Balita';
  ws.mergeCells('L5:L7'); ws.getCell('L5').value = 'PUS';
  ws.mergeCells('M5:M7'); ws.getCell('M5').value = 'WUS';
  ws.mergeCells('N5:N7'); ws.getCell('N5').value = 'Ibu Hamil';
  ws.mergeCells('O5:O7'); ws.getCell('O5').value = 'Ibu menyusui';
  ws.mergeCells('P5:P7'); ws.getCell('P5').value = 'Lansia';
  ws.mergeCells('Q5:Q7'); ws.getCell('Q5').value = '3 Buta';
  ws.mergeCells('R5:R7'); ws.getCell('R5').value = 'Berkebutuhan khusus';

  // Jumlah Rumah (cols 19-24)
  ['Sehat', 'Tidak sehat', 'Memiliki tempt sampah', 'Memiliki spal', 'Memiliki jamban', 'Menempel stiker']
    .forEach((label, i) => {
      ws.mergeCells(5, 19 + i, 7, 19 + i);
      ws.getCell(5, 19 + i).value = label;
    });

  // Sumber Air Keluarga (cols 25-28)
  ['PDAM', 'Sumber', 'Sungai', 'Dll'].forEach((label, i) => {
    ws.mergeCells(5, 25 + i, 7, 25 + i);
    ws.getCell(5, 25 + i).value = label;
  });

  // Makanan (cols 29-30)
  ['Beras', 'Non BERAS'].forEach((label, i) => {
    ws.mergeCells(5, 29 + i, 7, 29 + i);
    ws.getCell(5, 29 + i).value = label;
  });

  // Wrg yg mengikuti (cols 31-33)
  ['UP2K', 'Pemanfaatan lahan', 'Kes lngk'].forEach((label, i) => {
    ws.mergeCells(5, 31 + i, 7, 31 + i);
    ws.getCell(5, 31 + i).value = label;
  });

  // Row 6 leaf: Total/Balita L/P
  ws.mergeCells('H6:H7'); ws.getCell('H6').value = 'L';
  ws.mergeCells('I6:I7'); ws.getCell('I6').value = 'P';
  ws.mergeCells('J6:J7'); ws.getCell('J6').value = 'L';
  ws.mergeCells('K6:K7'); ws.getCell('K6').value = 'P';

  // Row 8: column numbers
  for (let i = 1; i <= 34; i++) ws.getCell(8, i).value = i;

  // Data rows (9-17)
  dusunListSorted.forEach((dusun, idx) => {
    const r = 9 + idx;
    const data = dataMap[dusun.nama] || {};
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = dusun.nama;
    ws.getCell(r, 3).value = data.jml_rw ?? 0;
    ws.getCell(r, 4).value = data.jml_rt ?? 0;
    ws.getCell(r, 5).value = data.jml_dawis ?? 0;
    ws.getCell(r, 6).value = data.jml_krt ?? 0;
    ws.getCell(r, 7).value = data.jml_kk ?? 0;
    ws.getCell(r, 8).value = data.jml_anggota_l ?? 0;
    ws.getCell(r, 9).value = data.jml_anggota_p ?? 0;
    ws.getCell(r, 10).value = data.balita_l ?? 0;
    ws.getCell(r, 11).value = data.balita_p ?? 0;
    ws.getCell(r, 12).value = data.pus ?? 0;
    ws.getCell(r, 13).value = data.wus ?? 0;
    ws.getCell(r, 14).value = data.ibu_hamil ?? 0;
    ws.getCell(r, 15).value = data.ibu_menyusui ?? 0;
    ws.getCell(r, 16).value = data.lansia ?? 0;
    ws.getCell(r, 17).value = data.tiga_buta ?? 0;
    ws.getCell(r, 18).value = data.berkebutuhan_khusus ?? 0;
    ws.getCell(r, 19).value = data.rumah_sehat ?? 0;
    ws.getCell(r, 20).value = data.rumah_kurang_sehat ?? 0;
    ws.getCell(r, 21).value = data.punya_tempat_sampah ?? 0;
    ws.getCell(r, 22).value = data.punya_spal ?? 0;
    ws.getCell(r, 23).value = data.jamban ?? 0;
    ws.getCell(r, 24).value = data.stiker_p4k ?? 0;
    ws.getCell(r, 25).value = data.air_pdam ?? 0;
    ws.getCell(r, 26).value = data.air_sumur ?? 0;
    ws.getCell(r, 27).value = data.air_sungai ?? 0;
    ws.getCell(r, 28).value = data.air_dll ?? 0;
    ws.getCell(r, 29).value = data.makan_beras ?? 0;
    ws.getCell(r, 30).value = data.makan_non_beras ?? 0;
    ws.getCell(r, 31).value = data.ikut_up2k ?? 0;
    ws.getCell(r, 32).value = data.ikut_pekarangan ?? 0;
    ws.getCell(r, 33).value = data.ikut_kesling ?? 0;
    ws.getCell(r, 34).value = data.jkn_bpjs ?? 0;
  });

  // Total (row 18)
  ws.getCell(18, 2).value = 'JUMLAH';
  for (let col = 3; col <= 33; col++) {
    const letter = ws.getColumn(col).letter;
    ws.getCell(18, col).value = { formula: `SUM(${letter}9:${letter}17)` };
  }

  applyBorderRange(ws, 4, 18, 1, 34);
  applyBoldRows(ws, [4, 5, 6, 7, 8, 18], 1, 34);

  // Vertical text untuk kolom dengan label panjang
  for (const col of [19, 20, 21, 22, 23, 24, 32, 33]) {
    ws.getCell(5, col).alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  const widths = [4, 14, 5, 5, 6, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 6, 5, 7, 5, 6, 7, 5, 6, 6, 5, 5, 5, 5, 5, 6, 5, 7, 5, 7];
  setColumnWidths(ws, widths);
}

// ──────────────────────────────────────────────────────────────────────────────
// Data Umum — single-row header
// ──────────────────────────────────────────────────────────────────────────────
function buildDataUmumSheet(wb, tahun, dusunListSorted, dataMap) {
  const ws = wb.addWorksheet('Data Umum', { pageSetup: { orientation: 'landscape', paperSize: 9 } });

  const cols = [
    { key: 'jml_dusun', label: 'Dusun/Lingk.' },
    { key: 'jml_pkk_rw', label: 'PKK RW' },
    { key: 'jml_pkk_rt', label: 'PKK RT' },
    { key: 'jml_dasa_wisma', label: 'Dasa Wisma' },
    { key: 'jml_krt', label: 'KRT' },
    { key: 'jml_kk', label: 'KK' },
    { key: 'jml_jiwa_l', label: 'Jiwa (L)' },
    { key: 'jml_jiwa_p', label: 'Jiwa (P)' },
    { key: 'jml_kader_tp_pkk_l', label: 'Kdr TPP (L)' },
    { key: 'jml_kader_tp_pkk_p', label: 'Kdr TPP (P)' },
    { key: 'jml_kader_umum_l', label: 'Kdr Umum (L)' },
    { key: 'jml_kader_umum_p', label: 'Kdr Umum (P)' },
    { key: 'jml_kader_khusus_l', label: 'Kdr Khusus (L)' },
    { key: 'jml_kader_khusus_p', label: 'Kdr Khusus (P)' },
  ];

  const totalCols = 2 + cols.length;
  const lastColLetter = ws.getColumn(totalCols).letter;
  ws.mergeCells(`A1:${lastColLetter}1`); ws.getCell('A1').value = 'DATA UMUM PKK';
  ws.mergeCells(`A2:${lastColLetter}2`); ws.getCell('A2').value = `${BRAND.organization} · TAHUN ${tahun}`;
  for (const r of [1, 2]) {
    const cell = ws.getCell(r, 1);
    cell.font = { bold: true, name: 'Arial', size: r === 1 ? 14 : 11 };
    cell.alignment = { horizontal: 'center' };
  }

  // Header (row 4)
  const headers = ['No', 'DUSUN', ...cols.map((c) => c.label)];
  headers.forEach((h, i) => { ws.getCell(4, i + 1).value = h; });

  // Data (rows 5-13)
  dusunListSorted.forEach((dusun, idx) => {
    const r = 5 + idx;
    const data = dataMap[dusun.nama] || {};
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = dusun.nama;
    cols.forEach((c, ci) => { ws.getCell(r, 3 + ci).value = data[c.key] ?? 0; });
  });

  // Total (row 14)
  ws.getCell(14, 2).value = 'JUMLAH';
  for (let col = 3; col <= totalCols; col++) {
    const letter = ws.getColumn(col).letter;
    ws.getCell(14, col).value = { formula: `SUM(${letter}5:${letter}13)` };
  }

  applyBorderRange(ws, 4, 14, 1, totalCols);
  applyBoldRows(ws, [4, 14], 1, totalCols);
  // Header background
  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D7377' } };
    ws.getCell(4, c).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
  }

  setColumnWidths(ws, [4, 18, ...cols.map(() => 11)]);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main GET
// ──────────────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tahun = Number(searchParams.get('tahun')) || new Date().getFullYear();
    const bulan = searchParams.get('bulan') ? Number(searchParams.get('bulan')) : null;
    const tableFilter = searchParams.get('table'); // optional, single sheet only

    const wb = new ExcelJS.Workbook();
    wb.creator = `Sistem Rekapitulasi PKK · ${BRAND.organization}`;
    wb.created = new Date();

    // Fetch dusun list (sorted by nomor_urut, must match DUSUN_LIST ordering)
    const { data: dusunList } = await supabase
      .from('dusun')
      .select('id, nama, nomor_urut')
      .eq('is_active', 1)
      .order('nomor_urut');

    const sortedDusun = (dusunList || []).slice().sort((a, b) => (a.nomor_urut || 0) - (b.nomor_urut || 0));
    const dusunByName = {};
    for (const d of sortedDusun) dusunByName[d.nama] = d;

    // Fetch all data in parallel
    const [umumMap, p1Map, p2Map, p3Map, p4Map, dawisMap, bumilMap] = await Promise.all([
      fetchDusunData('data_umum', tahun, null, dusunByName),
      fetchDusunData('data_pokja1', tahun, null, dusunByName),
      fetchDusunData('data_pokja2', tahun, null, dusunByName),
      fetchDusunData('data_pokja3', tahun, null, dusunByName),
      fetchDusunData('data_pokja4', tahun, null, dusunByName),
      fetchDusunData('data_rekap_dawis', tahun, null, dusunByName),
      fetchDusunData('data_bumil', tahun, bulan, dusunByName),
    ]);

    const want = (t) => !tableFilter || normalizeTableName(tableFilter) === t;

    if (want('data_umum')) buildDataUmumSheet(wb, tahun, sortedDusun, umumMap);
    if (want('data_pokja1')) buildPokja1Sheet(wb, tahun, sortedDusun, p1Map);
    if (want('data_pokja2')) buildPokja2Sheet(wb, tahun, sortedDusun, p2Map);
    if (want('data_pokja3')) buildPokja3Sheet(wb, tahun, sortedDusun, p3Map);
    if (want('data_pokja4')) buildPokja4Sheet(wb, tahun, sortedDusun, p4Map);
    if (want('data_rekap_dawis')) buildRekapDawisSheet(wb, tahun, sortedDusun, dawisMap);
    if (want('data_bumil')) buildBumilSheet(wb, tahun, bulan, sortedDusun, bumilMap, dawisMap);

    const buffer = await wb.xlsx.writeBuffer();
    const stamp = `${tahun}${bulan != null ? `_${String(bulan).padStart(2, '0')}` : ''}`;
    const filename = `Rekapitulasi_PKK_Belikurip_${stamp}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: 'Gagal mengekspor Excel: ' + error.message }, { status: 500 });
  }
}

// Suppress lint warnings for unused imports kept for future extension
void DUSUN_LIST;
