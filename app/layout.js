import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata = {
  title: 'Sistem Rekapitulasi Data PKK Desa Belikurip',
  description: 'Aplikasi web untuk rekapitulasi data kegiatan PKK Desa Belikurip, Kecamatan Baturetno, Kabupaten Wonogiri, Jawa Tengah.',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

// Inline script di <head> supaya theme class ter-apply sebelum hydrasi, tanpa flash.
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('theme') || 'light';
    var effective = t;
    if (t === 'system') {
      effective = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(effective);
  } catch (_) {
    document.documentElement.classList.add('light');
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
