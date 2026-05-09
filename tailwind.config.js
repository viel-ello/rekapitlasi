/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Fira Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Fira Code"', 'Menlo', 'monospace'],
      },
      colors: {
        primary: {
          50:  '#ecfdf5', // emerald-50
          100: '#d1fae5', // emerald-100
          200: '#a7f3d0', // emerald-200
          300: '#6ee7b7', // emerald-300
          400: '#34d399', // emerald-400
          500: '#10B981', // emerald-500 (Secondary Green)
          600: '#059669', // emerald-600 (Primary Green)
          700: '#047857', // emerald-700
          800: '#065f46', // emerald-800
          900: '#064E3B', // emerald-900 (Text Green)
        },
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B', // CTA Amber
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      backgroundColor: {
        'dashboard': '#ecfdf5',
      },
      textColor: {
        'dashboard': '#064E3B',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(30, 64, 175, 0.04), 0 4px 12px rgba(30, 64, 175, 0.06)',
        'card-hover': '0 4px 8px rgba(30, 64, 175, 0.06), 0 12px 28px rgba(30, 64, 175, 0.1)',
        'nav': '0 1px 3px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [
    require('flowbite/plugin'),
  ],
}
