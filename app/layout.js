import './globals.css';
import { Fira_Sans, Fira_Code } from 'next/font/google';
import ThemeProvider from '@/components/ThemeProvider';

// Self-host Google Fonts via next/font — menghilangkan render-blocking @import
// di CSS dan mencegah layout shift (FOUT). Exposed sebagai CSS variable.
const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fira-sans',
  display: 'swap',
});
const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fira-code',
  display: 'swap',
});

export const metadata = {
  title: 'Lumbung Data PKK Desa Belikurip',
  description: 'Lumbung Data PKK Desa Belikurip — Kecamatan Baturetno, Kabupaten Wonogiri, Jawa Tengah. Aplikasi rekapitulasi data kegiatan PKK per dusun.',
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
    <html lang="id" className={`light ${firaSans.variable} ${firaCode.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
