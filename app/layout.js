import './globals.css';

export const metadata = {
  title: 'Sistem Rekapitulasi Data PKK — Kecamatan Baturetno',
  description: 'Aplikasi web untuk rekapitulasi data kegiatan PKK tingkat Kecamatan Baturetno, Kabupaten Wonogiri, Jawa Tengah.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
