import './globals.css';
import { Plus_Jakarta_Sans, Lora, Fira_Code } from 'next/font/google';
import ThemeProvider from '@/components/ThemeProvider';

// Self-host Google Fonts via next/font — menghilangkan render-blocking @import
// di CSS dan mencegah layout shift (FOUT). Exposed sebagai CSS variable.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
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
    <html lang="id" className={`light ${plusJakartaSans.variable} ${lora.variable} ${firaCode.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
