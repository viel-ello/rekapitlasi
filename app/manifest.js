export default function manifest() {
  return {
    name: 'Lumbung Data PKK Desa Belikurip',
    short_name: 'Lumbung Data PKK',
    description: 'Sistem Informasi Rekapitulasi Data TP PKK Desa Belikurip, Kecamatan Baturetno',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#064e3b',
    theme_color: '#047857',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/map-baturetno.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
