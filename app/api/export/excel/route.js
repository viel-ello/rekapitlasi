import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const HF = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D7377' } };
const HFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' };
const TF = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
const TFont = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF1B5E20' } };
const BF = { size: 10, name: 'Arial' };
const BD = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };

function styleH(r){ r.eachCell(c=>{ c.fill=HF; c.font=HFont; c.alignment={horizontal:'center',vertical:'middle',wrapText:true}; c.border=BD; }); }
function styleB(r){ r.eachCell(c=>{ c.font=BF; c.border=BD; if(typeof c.value==='number'){c.alignment={horizontal:'right'};c.numFmt='#,##0';} }); }
function styleT(r){ r.eachCell(c=>{ c.fill=TF; c.font=TFont; c.border=BD; if(typeof c.value==='number'){c.alignment={horizontal:'right'};c.numFmt='#,##0';} }); }

function addTitle(ws, t1, t2, tahun, n) {
  let r=ws.addRow([t1]); ws.mergeCells(ws.rowCount,1,ws.rowCount,n); r.getCell(1).font={bold:true,size:14,name:'Arial'}; r.getCell(1).alignment={horizontal:'center'};
  r=ws.addRow([t2]); ws.mergeCells(ws.rowCount,1,ws.rowCount,n); r.getCell(1).font={bold:true,size:11,name:'Arial'}; r.getCell(1).alignment={horizontal:'center'};
  r=ws.addRow([`TAHUN ${tahun}`]); ws.mergeCells(ws.rowCount,1,ws.rowCount,n); r.getCell(1).font={bold:true,size:11,name:'Arial'}; r.getCell(1).alignment={horizontal:'center'};
  ws.addRow([]);
}

async function buildSheet(wb, tahun, sheetName, dbTable, title, cols) {
  // Fetch dynamic columns for this table
  const { data: dynamicCols } = await supabase.from('table_schemas').select('*').eq('table_name', dbTable);
  const dynCols = dynamicCols || [];

  // Fetch column overrides (rename/hide) for this table
  const { data: overrides } = await supabase.from('table_column_overrides').select('*').eq('table_name', dbTable);
  const overrideMap = {};
  (overrides || []).forEach((o) => { overrideMap[o.column_key] = o; });

  // Filter hidden columns and apply rename
  const visibleCols = cols
    .filter((c) => !overrideMap[c.key]?.is_hidden)
    .map((c) => ({
      key: c.key,
      label: overrideMap[c.key]?.label_override?.trim() || c.label,
    }));

  const ws = wb.addWorksheet(sheetName);
  const hdrs = ['No','Nama Desa',...visibleCols.map(c=>c.label), ...dynCols.map(c=>c.column_label)];
  const keys = visibleCols.map(c=>c.key);
  addTitle(ws, `DATA KEGIATAN PKK — ${title}`, 'TP PKK KECAMATAN BATURETNO', tahun, hdrs.length);
  styleH(ws.addRow(hdrs));
  ws.columns.forEach((c,i)=>{c.width=i<2?(i===0?5:18):12;});
  
  const { data: tableData } = await supabase.from(dbTable).select('*').eq('tahun', tahun);
  const { data: desa } = await supabase.from('desa').select('*').eq('is_active', 1).order('nomor_urut', { ascending: true });
  
  const tots = new Array(keys.length).fill(0);
  (desa || []).forEach((d,i)=>{
    const row = (tableData || []).find(r=>r.desa_id===d.id)||{};
    // For bumil, sum all months if multiple months exist, but usually we just want the aggregated data.
    // The current SQLite query just did `SELECT t.* ... WHERE t.tahun=?`. For bumil, this returns multiple rows per desa (one per month).
    // Let's aggregate if there are multiple rows for a desa.
    const rows = (tableData || []).filter(r => r.desa_id === d.id);
    const aggregatedRow = {};
    if (rows.length > 0) {
      keys.forEach(k => {
        aggregatedRow[k] = rows.reduce((sum, r) => sum + (r[k] || 0), 0);
      });
      // aggregate dynamic columns if numeric
      aggregatedRow.custom_columns = {};
      dynCols.forEach(col => {
        if (col.column_type === 'number') {
           aggregatedRow.custom_columns[col.column_key] = rows.reduce((sum, r) => sum + (Number(r.custom_columns?.[col.column_key]) || 0), 0);
        } else {
           aggregatedRow.custom_columns[col.column_key] = rows[0]?.custom_columns?.[col.column_key] || '';
        }
      });
    }

    const vals = keys.map((k,ki)=>{const v=aggregatedRow[k]||0;tots[ki]+=v;return v;});
    const dynVals = dynCols.map((c,ci)=>{
      const idx = keys.length + ci;
      if (!tots[idx]) tots[idx] = 0;
      const val = aggregatedRow.custom_columns?.[c.column_key] || (c.column_type === 'number' ? 0 : '');
      if (c.column_type === 'number') tots[idx] += Number(val);
      return val;
    });

    styleB(ws.addRow([i+1,d.nama,...vals,...dynVals]));
  });
  styleT(ws.addRow(['','JUMLAH',...tots.map((t,i) => {
    // If it's a dynamic text column, don't show total
    if (i >= keys.length && dynCols[i - keys.length].column_type !== 'number') return '-';
    return t;
  })]));
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();
    const wb = new ExcelJS.Workbook();
    wb.creator='Sistem Rekapitulasi PKK'; wb.created=new Date();

    // Data Umum
    await buildSheet(wb,tahun,'DATA UMUM','data_umum','Data Umum PKK',[
      {key:'jml_dusun',label:'Dusun'},{key:'jml_pkk_rw',label:'PKK RW'},{key:'jml_pkk_rt',label:'PKK RT'},
      {key:'jml_dasa_wisma',label:'Dasa Wisma'},{key:'jml_krt',label:'KRT'},{key:'jml_kk',label:'KK'},
      {key:'jml_jiwa_l',label:'Jiwa (L)'},{key:'jml_jiwa_p',label:'Jiwa (P)'},
      {key:'jml_kader_tp_pkk_l',label:'Kdr TPP (L)'},{key:'jml_kader_tp_pkk_p',label:'Kdr TPP (P)'},
      {key:'jml_kader_umum_l',label:'Kdr Umum (L)'},{key:'jml_kader_umum_p',label:'Kdr Umum (P)'},
      {key:'jml_kader_khusus_l',label:'Kdr Khusus (L)'},{key:'jml_kader_khusus_p',label:'Kdr Khusus (P)'},
    ]);
    // Pokja I
    await buildSheet(wb,tahun,'POKJA I','data_pokja1','POKJA I — Pancasila & Gotong Royong',[
      {key:'kader_pkbn',label:'Kdr PKBN'},{key:'kader_pkdrt',label:'Kdr PKDRT'},{key:'kader_pola_asuh',label:'Kdr PA'},
      {key:'pkbn_jml_klp_simulasi',label:'PKBN Klp'},{key:'pkbn_jml_anggota',label:'PKBN Angg'},
      {key:'pkdrt_jml_klp_simulasi',label:'PKDRT Klp'},{key:'pkdrt_jml_anggota',label:'PKDRT Angg'},
      {key:'pola_asuh_jml_klp',label:'PA Klp'},{key:'pola_asuh_jml_anggota',label:'PA Angg'},
      {key:'lansia_jml_klp',label:'Lansia Klp'},{key:'lansia_jml_anggota',label:'Lansia Angg'},
      {key:'gr_kerja_bakti',label:'K.Bakti'},{key:'gr_rukun_kematian',label:'R.Kematian'},
      {key:'gr_keagamaan',label:'Keagamaan'},{key:'gr_jimpitan',label:'Jimpitan'},{key:'gr_arisan',label:'Arisan'},
    ]);
    // Pokja II
    await buildSheet(wb,tahun,'POKJA II','data_pokja2','POKJA II — Pendidikan & Koperasi',[
      {key:'paket_a_klp',label:'Pkt A Klp'},{key:'paket_a_wrg',label:'Pkt A Wrg'},
      {key:'paket_b_klp',label:'Pkt B Klp'},{key:'paket_b_wrg',label:'Pkt B Wrg'},
      {key:'paket_c_klp',label:'Pkt C Klp'},{key:'paket_c_wrg',label:'Pkt C Wrg'},
      {key:'taman_bacaan',label:'T.Bacaan'},{key:'usaha_mikro',label:'U.Mikro'},
      {key:'up2k_pemula_klp',label:'UP2K Pmla'},{key:'up2k_pemula_psrt',label:'UP2K Psrt'},
      {key:'toko_pkk',label:'Toko PKK'},{key:'koperasi_belum_bh_kop',label:'Kop Non-BH'},
      {key:'koperasi_berbadan_hukum_kop',label:'Kop BH'},{key:'koperasi_berbadan_hukum_angg',label:'Angg BH'},
    ]);
    // Pokja III
    await buildSheet(wb,tahun,'POKJA III','data_pokja3','POKJA III — Pangan & Sandang',[
      {key:'kader_pangan',label:'Kdr Pangan'},{key:'kader_sandang',label:'Kdr Sandang'},{key:'kader_tata_laksana_rt',label:'Kdr TataRT'},
      {key:'pangan_beras',label:'Beras'},{key:'pemanfaatan_peternakan',label:'Ternak'},
      {key:'pemanfaatan_perikanan',label:'Ikan'},{key:'pemanfaatan_warung_hidup',label:'W.Hidup'},
      {key:'pemanfaatan_lumbung_hidup',label:'L.Hidup'},{key:'pemanfaatan_toga',label:'TOGA'},
      {key:'industri_pangan',label:'Ind.Pangan'},{key:'industri_sandang',label:'Ind.Sandang'},{key:'industri_jasa',label:'Ind.Jasa'},
      {key:'rumah_sehat',label:'Rmh Sehat'},{key:'rumah_kurang_sehat',label:'Rmh Kr.Sehat'},
    ]);
    // Pokja IV
    await buildSheet(wb,tahun,'POKJA IV','data_pokja4','POKJA IV — Kesehatan & Lingkungan',[
      {key:'kader_posyandu',label:'Kdr Posyandu'},{key:'kader_gizi',label:'Kdr Gizi'},
      {key:'kader_kesling',label:'Kdr Kesling'},{key:'kader_kb',label:'Kdr KB'},
      {key:'posyandu_jumlah',label:'Posyandu'},{key:'posyandu_terintegrasi',label:'Integrasi'},
      {key:'lansia_jml_klp',label:'Lansia Klp'},{key:'lansia_jml_anggota',label:'Lansia Angg'},
      {key:'rumah_jamban',label:'Jamban'},{key:'rumah_spal',label:'SPAL'},
      {key:'air_pdam',label:'PDAM'},{key:'air_sumur',label:'Sumur'},
      {key:'jml_pus',label:'PUS'},{key:'jml_wus',label:'WUS'},
      {key:'akseptor_kb_l',label:'KB(L)'},{key:'akseptor_kb_p',label:'KB(P)'},{key:'kk_tabungan',label:'Tabungan'},
    ]);
    // Bumil
    await buildSheet(wb,tahun,'DATA BUMIL','data_bumil','Rekapitulasi Bumil',[
      {key:'ibu_hamil',label:'Hamil'},{key:'ibu_melahirkan',label:'Melahirkan'},{key:'ibu_nifas',label:'Nifas'},
      {key:'ibu_meninggal',label:'Ibu Meninggal'},{key:'bayi_lahir_l',label:'Bayi(L)'},{key:'bayi_lahir_p',label:'Bayi(P)'},
      {key:'akte_ada',label:'Akte Ada'},{key:'akte_tidak',label:'Akte Tidak'},
      {key:'bayi_meninggal_l',label:'By.Mng(L)'},{key:'bayi_meninggal_p',label:'By.Mng(P)'},
    ]);

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, { status:200, headers:{
      'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':`attachment; filename="Rekapitulasi_PKK_Baturetno_${tahun}.xlsx"`,
    }});
  } catch(error) {
    console.error('Excel export error:', error);
    return NextResponse.json({error:'Gagal mengekspor Excel'},{status:500});
  }
}
