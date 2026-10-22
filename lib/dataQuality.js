import { validateRow, countIssues } from '@/lib/validation';
import { SHEET_MAP } from '@/lib/excel/sheetMap';
import { DATA_PAGES } from '@/lib/dataPages';

export const COMPLETENESS_STATUS = {
  COMPLETE: 'lengkap',
  INCOMPLETE: 'belum_lengkap',
  NEEDS_CHECK: 'perlu_dicek',
};
export const STATUS_LABELS = {
  [COMPLETENESS_STATUS.COMPLETE]: 'Lengkap',
  [COMPLETENESS_STATUS.INCOMPLETE]: 'Belum lengkap',
  [COMPLETENESS_STATUS.NEEDS_CHECK]: 'Perlu dicek',
};

/**
 * Tabel operasional yang dipantau completeness-nya.
 * `data_kegiatan_warga` dipertahankan sebagai alias untuk `data_rekap_dawis`
 * supaya import file lama & code legacy tidak break selama transition.
 */
export const OPERATIONAL_TABLES = [
  { table: 'data_umum', label: 'Data Umum', sheetName: 'DATA UMUM' },
  { table: 'data_pokja1', label: 'Pokja I', sheetName: 'POKJA I' },
  { table: 'data_pokja2', label: 'Pokja II', sheetName: 'POKJA II' },
  { table: 'data_pokja3', label: 'Pokja III', sheetName: 'POKJA III' },
  { table: 'data_pokja4', label: 'Pokja IV', sheetName: 'POKJA IV' },
  { table: 'data_rekap_dawis', label: 'Rekapitulasi Dawis', sheetName: 'REKAP DAWIS' },
  // Backward-compat alias
  { table: 'data_kegiatan_warga', label: 'Rekapitulasi Dawis', sheetName: 'REKAP DAWIS', aliasOf: 'data_rekap_dawis' },
  { table: 'data_bumil', label: 'Bumil', sheetName: 'DATA BUMIL' },
];

/** Normalisasi alias: kalau caller masih kirim `data_kegiatan_warga`, treat as `data_rekap_dawis`. */
function canonicalTable(tableName) {
  return tableName === 'data_kegiatan_warga' ? 'data_rekap_dawis' : tableName;
}

export function getTableKeys(tableName) {
  const canonical = canonicalTable(tableName);
  const dataPage = Object.values(DATA_PAGES).find((page) => page.tableName === canonical);
  if (dataPage) return dataPage.columns.map((column) => column.key);

  const sheet = Object.values(SHEET_MAP).find((item) => item.table === canonical);
  return sheet?.keys || [];
}

export function isKnownOperationalTable(tableName) {
  return OPERATIONAL_TABLES.some((item) => item.table === tableName);
}

function hasAnyFilledValue(row, keys) {
  if (!row) return false;
  return keys.some((key) => {
    const value = row[key];
    return value !== null && value !== undefined && value !== '';
  });
}

export function evaluateRecordCompleteness(row, keys, previousRow = null) {
  if (!row || !hasAnyFilledValue(row, keys)) {
    return {
      status: COMPLETENESS_STATUS.INCOMPLETE,
      label: STATUS_LABELS[COMPLETENESS_STATUS.INCOMPLETE],
      issues: { errors: 0, warnings: 0, infos: keys.length },
      issueCount: keys.length,
    };
  }

  const columns = keys.map((key) => ({ key, label: key }));
  const validation = validateRow(row, columns, previousRow);
  const issues = countIssues(validation);

  if (issues.errors > 0 || issues.warnings > 0) {
    return {
      status: COMPLETENESS_STATUS.NEEDS_CHECK,
      label: STATUS_LABELS[COMPLETENESS_STATUS.NEEDS_CHECK],
      issues,
      issueCount: issues.errors + issues.warnings + issues.infos,
    };
  }

  // Hanya "info" (kolom kosong) tidak menjadikan status INCOMPLETE.
  // Record dianggap lengkap selama tidak ada error/warning,
  // karena banyak kolom memang bersifat opsional per tahun.
  return {
    status: COMPLETENESS_STATUS.COMPLETE,
    label: STATUS_LABELS[COMPLETENESS_STATUS.COMPLETE],
    issues,
    issueCount: 0,
  };
}

export function mergeStatus(statuses) {
  if (!statuses.length) return COMPLETENESS_STATUS.INCOMPLETE;
  if (statuses.some((status) => status === COMPLETENESS_STATUS.NEEDS_CHECK)) {
    return COMPLETENESS_STATUS.NEEDS_CHECK;
  }
  if (statuses.every((status) => status === COMPLETENESS_STATUS.COMPLETE)) {
    return COMPLETENESS_STATUS.COMPLETE;
  }
  return COMPLETENESS_STATUS.INCOMPLETE;
}

/**
 * Pure function auditor logis lintas-tabel untuk mendeteksi anomali relasional antar data.
 * Memeriksa:
 * 1. Data Umum: KK vs Jiwa, KK tanpa jiwa, rasio KRT vs KK, selisih KK vs Dawis.
 * 2. Balita: Pokja IV vs Dawis, kematian balita vs populasi balita, posyandu tanpa balita.
 * 3. Bumil: Bumil Data vs Dawis, Bumil Risti melebihi total bumil, pendampingan risti, akte vs kelahiran.
 */
export function auditCrossTableConsistency({
  dusunId,
  dusunNama = `Dusun ${dusunId}`,
  tahun,
  bulan = 12,
  dataUmum = {},
  pokja1 = {},
  pokja2 = {},
  pokja3 = {},
  pokja4 = {},
  dawis = {},
  bumil = {},
}) {
  const issues = [];
  const num = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ──────────────────────────────────────────────────────────
  // RULE 1: KK vs Jiwa di Data Umum & Konsistensi KK Lintas Tabel
  // ──────────────────────────────────────────────────────────
  const kkUmum = num(dataUmum.jml_kk ?? dataUmum.kk);
  const jiwaL = num(dataUmum.jml_jiwa_l ?? dataUmum.jiwaL);
  const jiwaP = num(dataUmum.jml_jiwa_p ?? dataUmum.jiwaP);
  const totalJiwa = (jiwaL + jiwaP) > 0 ? (jiwaL + jiwaP) : num(dataUmum.jiwa);
  const krtUmum = num(dataUmum.jml_krt ?? dataUmum.krt);
  const kkDawis = num(dawis.jml_kk ?? dawis.kk);

  // 1a. Populasi Jiwa lebih kecil dari jumlah KK (Mustahil secara demografis)
  if (kkUmum > 0 && totalJiwa > 0 && totalJiwa < kkUmum) {
    issues.push({
      id: `KK_JIWA_ANOMALY_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'error',
      code: 'KK_EXCEEDS_JIWA',
      title: 'Jumlah Jiwa Lebih Kecil Dari KK',
      description: `Dusun ${dusunNama} mencatat ${kkUmum} KK tetapi hanya memiliki ${totalJiwa} jiwa (${jiwaL} L, ${jiwaP} P). Secara demografis, 1 KK minimal berisi 1 jiwa.`,
      sourceTable: 'data_umum',
      targetTable: 'data_umum',
      editHref: `/dashboard/data-umum/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { kk: kkUmum, jiwa: totalJiwa },
    });
  }

  // 1b. KK ada tapi Jiwa bernilai 0
  if (kkUmum > 0 && totalJiwa === 0) {
    issues.push({
      id: `KK_NO_JIWA_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'error',
      code: 'KK_WITHOUT_POPULATION',
      title: 'KK Tercatat Tanpa Jumlah Jiwa',
      description: `Terdapat ${kkUmum} KK di Dusun ${dusunNama}, tetapi kolom Jiwa (L) dan Jiwa (P) masih bernilai 0.`,
      sourceTable: 'data_umum',
      targetTable: 'data_umum',
      editHref: `/dashboard/data-umum/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { kk: kkUmum, jiwa: 0 },
    });
  }

  // 1c. Selisih KK Data Umum vs Rekap Dawis
  if (kkUmum > 0 && kkDawis > 0 && Math.abs(kkUmum - kkDawis) > 0) {
    const diff = Math.abs(kkUmum - kkDawis);
    issues.push({
      id: `KK_DAWIS_DIFF_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: diff > 5 ? 'warning' : 'info',
      code: 'CROSS_KK_DISCREPANCY',
      title: 'Selisih Jumlah KK (Data Umum vs Dawis)',
      description: `Jumlah KK di Data Umum (${kkUmum}) tidak sinkron dengan Rekapitulasi Dawis (${kkDawis}). Terdapat selisih ${diff} KK.`,
      sourceTable: 'data_umum',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/rekap-dawis/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { kkUmum, kkDawis, diff },
    });
  }

  // 1d. KRT melebihi KK
  if (krtUmum > 0 && kkUmum > 0 && krtUmum > kkUmum) {
    issues.push({
      id: `KRT_EXCEEDS_KK_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'KRT_EXCEEDS_KK',
      title: 'Kepala Rumah Tangga Melebihi KK',
      description: `Jumlah KRT (${krtUmum}) tercatat melebihi jumlah KK (${kkUmum}) di Dusun ${dusunNama}.`,
      sourceTable: 'data_umum',
      targetTable: 'data_umum',
      editHref: `/dashboard/data-umum/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { krt: krtUmum, kk: kkUmum },
    });
  }

  // ──────────────────────────────────────────────────────────
  // RULE 2: Balita Pokja IV vs Rekap Dawis & Kematian Balita
  // ──────────────────────────────────────────────────────────
  const balitaDawisRaw = num(dawis.balita_l) + num(dawis.balita_p);
  const balitaDawis = balitaDawisRaw > 0 ? balitaDawisRaw : num(dawis.balita);
  const balitaMeninggal = (num(bumil.balita_meninggal_l) + num(bumil.balita_meninggal_p)) || num(bumil.balitaMeninggal);
  const posyanduJml = num(pokja4.posyandu_jumlah ?? pokja4.posyandu);
  const balitaPokja4 = pokja4.jml_balita ?? pokja4.custom_columns?.jml_balita;

  // 2a. Jika Pokja IV memiliki kolom jml_balita (misal via custom column)
  if (balitaPokja4 !== undefined && balitaPokja4 !== null && num(balitaPokja4) !== balitaDawis) {
    issues.push({
      id: `BALITA_POKJA4_DAWIS_${dusunId}_${tahun}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'BALITA_COUNT_MISMATCH',
      title: 'Perbedaan Jumlah Balita (Pokja IV vs Dawis)',
      description: `Pokja IV mencatat ${num(balitaPokja4)} balita, sedangkan Rekap Dawis mencatat ${balitaDawis} balita.`,
      sourceTable: 'data_pokja4',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/pokja4/edit?dusun_id=${dusunId}&tahun=${tahun}`,
      metrics: { balitaPokja4: num(balitaPokja4), balitaDawis },
    });
  }

  // 2b. Posyandu Aktif di Pokja IV tapi Balita di Dawis 0
  if (posyanduJml > 0 && balitaDawis === 0 && (kkDawis > 0 || kkUmum > 0 || num(dawis.jml_dawis ?? dawis.dasaWisma) > 0)) {
    issues.push({
      id: `POSYANDU_NO_BALITA_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'POSYANDU_ACTIVE_NO_BALITA',
      title: 'Posyandu Aktif Tanpa Data Balita di Dawis',
      description: `Pokja IV mencatat ${posyanduJml} unit Posyandu aktif, namun Rekap Dawis mencatat 0 balita pada periode ini.`,
      sourceTable: 'data_pokja4',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/rekap-dawis/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { posyandu: posyanduJml, balitaDawis },
    });
  }

  // 2c. Kematian Balita Melebihi Populasi Balita
  if (balitaMeninggal > 0 && balitaDawis > 0 && balitaMeninggal > balitaDawis) {
    issues.push({
      id: `BALITA_DEATH_EXCEEDS_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'error',
      code: 'BALITA_DEATH_EXCEEDS_TOTAL',
      title: 'Kematian Balita Melebihi Total Balita',
      description: `Data Bumil mencatat ${balitaMeninggal} kematian balita, melebihi jumlah balita hidup yang tercatat di Dawis (${balitaDawis}).`,
      sourceTable: 'data_bumil',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { balitaMeninggal, balitaDawis },
    });
  }

  // ──────────────────────────────────────────────────────────
  // RULE 3: Ibu Hamil, Bumil Risti, & Pendampingan
  // ──────────────────────────────────────────────────────────
  const bumilTable = num(bumil.ibu_hamil ?? bumil.ibuHamil);
  const bumilDawis = num(dawis.ibu_hamil ?? dawis.ibuHamil);
  const bumilRisti = num(bumil.bumil_risti ?? bumil.custom_columns?.bumil_risti ?? bumil.risti);
  const pendampingan = num(bumil.bumil_pendampingan ?? bumil.custom_columns?.bumil_pendampingan ?? bumil.pendampingan);
  const bayiLahir = (num(bumil.bayi_lahir_l) + num(bumil.bayi_lahir_p)) || num(bumil.bayiLahir);
  const akteLahir = (num(bumil.akte_l) + num(bumil.akte_p)) || num(bumil.akteLahir);

  // 3a. Bumil Data vs Dawis Discrepancy
  if (bumilTable > 0 && bumilDawis > 0 && bumilTable !== bumilDawis) {
    issues.push({
      id: `BUMIL_DAWIS_DIFF_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'BUMIL_DISCREPANCY',
      title: 'Jumlah Ibu Hamil Berbeda (Bumil vs Dawis)',
      description: `Tabel Bumil mencatat ${bumilTable} ibu hamil, sedangkan Rekap Dawis mencatat ${bumilDawis} ibu hamil.`,
      sourceTable: 'data_bumil',
      targetTable: 'data_rekap_dawis',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { bumilTable, bumilDawis },
    });
  }

  // 3b. Bumil Risti melebihi total Ibu Hamil
  if (bumilRisti > 0 && bumilTable > 0 && bumilRisti > bumilTable) {
    issues.push({
      id: `BUMIL_RISTI_EXCEEDS_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'error',
      code: 'RISTI_EXCEEDS_TOTAL',
      title: 'Bumil Risiko Tinggi Melebihi Total Ibu Hamil',
      description: `Ibu hamil risiko tinggi (${bumilRisti}) melebihi total ibu hamil yang tercatat (${bumilTable}).`,
      sourceTable: 'data_bumil',
      targetTable: 'data_bumil',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { bumilRisti, bumilTable },
    });
  }

  // 3c. Bumil Risti belum seluruhnya didampingi kader
  if (bumilRisti > 0 && pendampingan < bumilRisti) {
    issues.push({
      id: `BUMIL_PENDAMPINGAN_DEFICIT_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'warning',
      code: 'RISTI_UNACCOMPANIED',
      title: 'Bumil Risti Belum Tuntas Didampingi',
      description: `Dari ${bumilRisti} ibu hamil risiko tinggi, baru ${pendampingan} yang mendapatkan pendampingan kader khusus.`,
      sourceTable: 'data_bumil',
      targetTable: 'data_bumil',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { bumilRisti, pendampingan, gap: bumilRisti - pendampingan },
    });
  }

  // 3d. Akta Kelahiran melebihi Bayi Lahir periode ini
  if (akteLahir > 0 && bayiLahir > 0 && akteLahir > bayiLahir) {
    issues.push({
      id: `AKTE_EXCEEDS_LAHIR_${dusunId}_${tahun}_${bulan}`,
      dusunId,
      dusunNama,
      severity: 'info',
      code: 'AKTE_EXCEEDS_BIRTH',
      title: 'Penerbitan Akta Melebihi Bayi Lahir Periode Ini',
      description: `Jumlah akta kelahiran (${akteLahir}) melebihi kelahiran bulan berjalan (${bayiLahir}). Kemungkinan mencakup akta susulan bulan lalu.`,
      sourceTable: 'data_bumil',
      targetTable: 'data_bumil',
      editHref: `/dashboard/bumil/edit?dusun_id=${dusunId}&tahun=${tahun}&bulan=${bulan}`,
      metrics: { akteLahir, bayiLahir },
    });
  }

  return issues;
}

/**
 * Audit konsistensi untuk kumpulan seluruh dusun.
 */
export function auditDusunListConsistency(dusunList, { tahun, bulan = 12 } = {}) {
  if (!Array.isArray(dusunList)) return [];
  const allIssues = [];
  for (const item of dusunList) {
    const issues = auditCrossTableConsistency({
      dusunId: item.id || item.dusun_id,
      dusunNama: item.nama || item.dusun_nama || `Dusun ${item.id}`,
      tahun,
      bulan,
      dataUmum: item.dataUmum || item,
      pokja1: item.pokja1 || item,
      pokja2: item.pokja2 || item,
      pokja3: item.pokja3 || item,
      pokja4: item.pokja4 || item,
      dawis: item.dawis || item,
      bumil: item.bumil || item,
    });
    allIssues.push(...issues);
  }
  return allIssues;
}
