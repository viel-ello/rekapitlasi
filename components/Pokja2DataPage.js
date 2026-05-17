'use client';

import NestedDataPage from '@/components/NestedDataPage';

/**
 * Pokja II — pixel-perfect sesuai gambar referensi.
 * 36 kolom logis, 4-level header dengan TUTOR sub-sub-grup di KADER KHUSUS.
 */

const POKJA2_TREE = [
  {
    kind: 'group',
    label: 'PENDIDIKAN DAN KETRAMPILAN',
    children: [
      { kind: 'leaf', key: 'jml_warga_3_buta', label: 'Jml wrg yg masih 3 buta', vertical: true },
      {
        kind: 'group', label: 'PAKET A',
        children: [
          { kind: 'leaf', key: 'paket_a_klp', label: 'Jml Klp Bljr', vertical: true },
          { kind: 'leaf', key: 'paket_a_wrg', label: 'Wrg Bljr', vertical: true },
        ],
      },
      {
        kind: 'group', label: 'PAKET B',
        children: [
          { kind: 'leaf', key: 'paket_b_klp', label: 'Jml Klp Bljr', vertical: true },
          { kind: 'leaf', key: 'paket_b_wrg', label: 'Wrg Bljr', vertical: true },
        ],
      },
      {
        kind: 'group', label: 'PAKET C',
        children: [
          { kind: 'leaf', key: 'paket_c_klp', label: 'Jml Klp Bljr', vertical: true },
          { kind: 'leaf', key: 'paket_c_wrg', label: 'Wrg Bljr', vertical: true },
        ],
      },
      {
        kind: 'group', label: 'KF',
        children: [
          { kind: 'leaf', key: 'kf_klp', label: 'Jml', vertical: true },
          { kind: 'leaf', key: 'kf_wrg', label: 'Tg Bljr', vertical: true },
        ],
      },
      { kind: 'leaf', key: 'paud_sejenis', label: 'PAUD SEJENIS', vertical: true },
      { kind: 'leaf', key: 'taman_bacaan', label: 'JML TAMAN BACAAN', vertical: true },
      {
        kind: 'group', label: 'BKB',
        children: [
          { kind: 'leaf', key: 'bkb_klp', label: 'Jml Klp', vertical: true },
          { kind: 'leaf', key: 'bkb_jml_ibu_peserta', label: 'Jml Ibu peserta', vertical: true },
          { kind: 'leaf', key: 'bkb_ape_set_a', label: 'Jml APE Set', vertical: true },
          { kind: 'leaf', key: 'bkb_ape_set_b', label: 'Jml APE Set', vertical: true },
        ],
      },
      {
        kind: 'group', label: 'KADER KHUSUS',
        children: [
          {
            kind: 'group', label: 'TUTOR',
            children: [
              { kind: 'leaf', key: 'kader_tutor_kf', label: 'KF', vertical: true },
              { kind: 'leaf', key: 'kader_tutor_paud', label: 'PAUD Sejenis', vertical: true },
            ],
          },
          { kind: 'leaf', key: 'kader_bkb', label: 'BKB', vertical: true },
          { kind: 'leaf', key: 'kader_khusus_koperasi', label: 'KOPERASI', vertical: true },
          { kind: 'leaf', key: 'kader_khusus_keterampilan', label: 'KETRAMPILAN', vertical: true },
        ],
      },
      {
        kind: 'group', label: 'YG SDH DI LATIH',
        children: [
          { kind: 'leaf', key: 'yg_dilatih_lp3pkk', label: 'LP3PKK', vertical: true },
          { kind: 'leaf', key: 'yg_dilatih_tp3pkk', label: 'TP3PKK', vertical: true },
          { kind: 'leaf', key: 'yg_dilatih_damaspkk', label: 'DAMAS PKK', vertical: true },
        ],
      },
    ],
  },
  {
    kind: 'group',
    label: 'PE NGEMBANGAN KEH BERKOPERASI',
    children: [
      {
        kind: 'group', label: 'PRA KOPERASI/USAHA BERSAMA/UP2K',
        children: [
          {
            kind: 'group', label: 'PEMULA',
            children: [
              { kind: 'leaf', key: 'up2k_pemula_klp', label: 'JML KLP', vertical: true },
              { kind: 'leaf', key: 'up2k_pemula_psrt', label: 'JML PSRTA', vertical: true },
            ],
          },
          {
            kind: 'group', label: 'MADYA',
            children: [
              { kind: 'leaf', key: 'up2k_madya_klp', label: 'JML KLP', vertical: true },
              { kind: 'leaf', key: 'up2k_madya_psrt', label: 'JML PSRTA', vertical: true },
            ],
          },
          {
            kind: 'group', label: 'UTAMA',
            children: [
              { kind: 'leaf', key: 'up2k_utama_klp', label: 'JML KLP', vertical: true },
              { kind: 'leaf', key: 'up2k_utama_psrt', label: 'JML PSRTA', vertical: true },
            ],
          },
          {
            kind: 'group', label: 'MANDIRI',
            children: [
              { kind: 'leaf', key: 'up2k_mandiri_klp', label: 'JML KLP', vertical: true },
              { kind: 'leaf', key: 'up2k_mandiri_psrt', label: 'JML PSRTA', vertical: true },
            ],
          },
        ],
      },
      {
        kind: 'group', label: 'KOPERSASI HUKUM',
        children: [
          { kind: 'leaf', key: 'koperasi_berbadan_hukum_kop', label: 'JML KLP', vertical: true },
          { kind: 'leaf', key: 'koperasi_berbadan_hukum_angg', label: 'JML PSRTA', vertical: true },
        ],
      },
    ],
  },
  { kind: 'leaf', key: 'keterangan', label: 'KET', type: 'text' },
];

function TitleBlock(tahun) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-center text-sm font-bold uppercase leading-snug text-gray-900">
        <div>DATA KEGIATAN PKK</div>
        <div>DESA   : BELIKURIP</div>
        <div>POKJA II</div>
        <div className="mt-1">TAHUN : {tahun}</div>
      </div>
    </div>
  );
}

export default function Pokja2DataPage({ config }) {
  return (
    <NestedDataPage
      config={config}
      tree={POKJA2_TREE}
      titleBlock={TitleBlock}
      unitLabel="Dusun"
      unitColumnLabel="Nama Dusun"
    />
  );
}
