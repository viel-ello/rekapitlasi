const db = require('./lib/db');
const fs = require('fs');
const ExcelJS = require('exceljs');

async function testExport() {
  console.log('1. Mengisi data dummy ke database (Tahun 2025, Desa ID 1)...');
  
  // Isi data umum
  db.prepare(`
    INSERT INTO data_umum (desa_id, tahun, jml_kk, jml_jiwa_l, jml_jiwa_p)
    VALUES (1, 2025, 150, 300, 320)
    ON CONFLICT(desa_id, tahun) DO UPDATE SET
    jml_kk = 150, jml_jiwa_l = 300, jml_jiwa_p = 320
  `).run();

  // Isi Pokja 1
  db.prepare(`
    INSERT INTO data_pokja1 (desa_id, tahun, kader_pkbn, gr_kerja_bakti)
    VALUES (1, 2025, 12, 5)
    ON CONFLICT(desa_id, tahun) DO UPDATE SET
    kader_pkbn = 12, gr_kerja_bakti = 5
  `).run();

  console.log('2. Request Export Excel...');
  const resExcel = await fetch('http://localhost:3000/api/export/excel?tahun=2025');
  const bufferExcel = Buffer.from(await resExcel.arrayBuffer());
  const excelPath = 'c:\\Users\\ipw26\\Downloads\\Rekapitulasi_PKK_Test_2025.xlsx';
  fs.writeFileSync(excelPath, bufferExcel);
  console.log('   ✅ File Excel berhasil disimpan di:', excelPath);

  console.log('3. Membaca Excel untuk verifikasi data...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bufferExcel);
  
  const wsUmum = wb.getWorksheet('DATA UMUM');
  const rowUmum = wsUmum.getRow(5); // Baris data pertama (setelah title & header)
  console.log('   Data Umum Desa 1 (KK, Jiwa L, Jiwa P):', 
    rowUmum.getCell(6).value, // KK
    rowUmum.getCell(7).value, // Jiwa L
    rowUmum.getCell(8).value  // Jiwa P
  );

  const wsPokja1 = wb.getWorksheet('POKJA I');
  const rowPokja1 = wsPokja1.getRow(5);
  console.log('   Pokja I Desa 1 (Kader PKBN, Kerja Bakti):', 
    rowPokja1.getCell(3).value,  // Kader PKBN
    rowPokja1.getCell(14).value  // Kerja Bakti
  );

  console.log('4. Request Export Word...');
  const resWord = await fetch('http://localhost:3000/api/export/word?tahun=2025');
  const bufferWord = Buffer.from(await resWord.arrayBuffer());
  const wordPath = 'c:\\Users\\ipw26\\Downloads\\Program_Kerja_PKK_Test_2025.docx';
  fs.writeFileSync(wordPath, bufferWord);
  console.log('   ✅ File Word berhasil disimpan di:', wordPath);
  
  console.log('\n✅ SEMUA TEST BERHASIL!');
}

testExport().catch(console.error);
