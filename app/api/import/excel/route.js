/**
 * @file Import Excel API
 * POST /api/import/excel — Upload an exported Excel file to auto-fill database
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, canWrite } from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import ExcelJS from 'exceljs';

// Map sheet names to DB tables and column keys
const SHEET_MAP = {
  'DATA UMUM': { table: 'data_umum', keys: ['jml_dusun','jml_pkk_rw','jml_pkk_rt','jml_dasa_wisma','jml_krt','jml_kk','jml_jiwa_l','jml_jiwa_p','jml_kader_tp_pkk_l','jml_kader_tp_pkk_p','jml_kader_umum_l','jml_kader_umum_p','jml_kader_khusus_l','jml_kader_khusus_p'] },
  'POKJA I': { table: 'data_pokja1', keys: ['kader_pkbn','kader_pkdrt','kader_pola_asuh','pkbn_jml_klp_simulasi','pkbn_jml_anggota','pkdrt_jml_klp_simulasi','pkdrt_jml_anggota','pola_asuh_jml_klp','pola_asuh_jml_anggota','lansia_jml_klp','lansia_jml_anggota','gr_kerja_bakti','gr_rukun_kematian','gr_keagamaan','gr_jimpitan','gr_arisan'] },
  'POKJA II': { table: 'data_pokja2', keys: ['paket_a_klp','paket_a_wrg','paket_b_klp','paket_b_wrg','paket_c_klp','paket_c_wrg','taman_bacaan','usaha_mikro','up2k_pemula_klp','up2k_pemula_psrt','toko_pkk','koperasi_belum_bh_kop','koperasi_berbadan_hukum_kop','koperasi_berbadan_hukum_angg'] },
  'POKJA III': { table: 'data_pokja3', keys: ['kader_pangan','kader_sandang','kader_tata_laksana_rt','pangan_beras','pemanfaatan_peternakan','pemanfaatan_perikanan','pemanfaatan_warung_hidup','pemanfaatan_lumbung_hidup','pemanfaatan_toga','industri_pangan','industri_sandang','industri_jasa','rumah_sehat','rumah_kurang_sehat'] },
  'POKJA IV': { table: 'data_pokja4', keys: ['kader_posyandu','kader_gizi','kader_kesling','kader_kb','posyandu_jumlah','posyandu_terintegrasi','lansia_jml_klp','lansia_jml_anggota','rumah_jamban','rumah_spal','air_pdam','air_sumur','jml_pus','jml_wus','akseptor_kb_l','akseptor_kb_p','kk_tabungan'] },
  'DATA BUMIL': { table: 'data_bumil', keys: ['ibu_hamil','ibu_melahirkan','ibu_nifas','ibu_meninggal','bayi_lahir_l','bayi_lahir_p','akte_ada','akte_tidak','bayi_meninggal_l','bayi_meninggal_p'] },
};

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sesi login telah berakhir' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const tahun = formData.get('tahun') || new Date().getFullYear();

    if (!file) {
      return NextResponse.json({ error: 'File Excel harus diunggah' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    const { data: desaList, error: desaError } = await supabase.from('desa').select('*').eq('is_active', 1).order('nomor_urut');
    if (desaError) throw desaError;

    let totalImported = 0;

    for (const [sheetName, config] of Object.entries(SHEET_MAP)) {
      const ws = wb.getWorksheet(sheetName);
      if (!ws) continue;

      // Check permission
      if (!canWrite(user.role, config.table)) continue;

      // Find data rows (skip title rows + header — data starts after row with "No")
      let dataStartRow = 0;
      ws.eachRow((row, rowNum) => {
        const first = String(row.getCell(1).value || '').trim();
        if (first === 'No') dataStartRow = rowNum + 1;
      });

      if (!dataStartRow) continue;

      // Fetch dynamic columns for this table
      const { data: dynamicCols } = await supabase.from('table_schemas').select('*').eq('table_name', config.table);
      const dynCols = dynamicCols || [];

      const upserts = [];

      for (let ri = dataStartRow; ri <= dataStartRow + desaList.length - 1; ri++) {
        const row = ws.getRow(ri);
        const desaNama = String(row.getCell(2).value || '').trim();

        if (!desaNama || desaNama === 'JUMLAH') continue;

        // Match desa by name
        const desa = desaList.find(d => d.nama.toLowerCase() === desaNama.toLowerCase());
        if (!desa) continue;

        const fields = { custom_columns: {} };
        config.keys.forEach((key, ki) => {
          const val = row.getCell(ki + 3).value;
          fields[key] = typeof val === 'number' ? val : (parseInt(val) || 0);
        });
        
        // Parse dynamic columns
        dynCols.forEach((col, ci) => {
          const val = row.getCell(config.keys.length + 3 + ci).value;
          if (col.column_type === 'number') {
            fields.custom_columns[col.column_key] = typeof val === 'number' ? val : (parseInt(val) || 0);
          } else {
            fields.custom_columns[col.column_key] = val !== null && val !== undefined ? String(val) : '';
          }
        });

        const record = { desa_id: desa.id, tahun: Number(tahun), ...fields, updated_at: new Date().toISOString() };
        
        let onConflict = 'desa_id,tahun';
        if (config.table === 'data_bumil') {
          record.bulan = 12; // Aggregate import goes to December
          onConflict = 'desa_id,tahun,bulan';
        }

        upserts.push(supabase.from(config.table).upsert(record, { onConflict }));
        totalImported++;
      }

      // Execute all upserts for this sheet
      await Promise.all(upserts);

      writeLog({
        userId: user.userId, username: user.username,
        action: 'import', tableName: config.table,
        detail: `Import Excel sheet "${sheetName}" tahun ${tahun}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${totalImported} baris data berhasil diimpor`,
      imported: totalImported,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Gagal mengimpor Excel: ' + error.message }, { status: 500 });
  }
}
