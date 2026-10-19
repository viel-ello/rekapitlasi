/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
  				'"Plus Jakarta Sans"',
  				'system-ui',
  				'-apple-system',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'"Fira Code"',
  				'Menlo',
  				'monospace'
  			],
  			serif: [
  				'var(--font-serif)',
  				'Lora',
  				'Georgia',
  				'"Times New Roman"',
  				'serif'
  			]
  		},
  		colors: {
  			// ── Token semantik shadcn/ui (nilai di CSS variable app/globals.css) ──
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			primary: {
  				// DEFAULT/foreground untuk komponen shadcn (bg-primary, text-primary-foreground).
  				// Skala 50–900 tetap dipakai kode lama.
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				'50': '#ecfdf5',
  				'100': '#d1fae5',
  				'200': '#a7f3d0',
  				'300': '#6ee7b7',
  				'400': '#34d399',
  				'500': '#10B981',
  				// 600 dipakai sebagai latar tombol dengan teks putih. Nilai lama
  				// #059669 hanya 3.77:1 — di bawah ambang WCAG AA 4.5:1. #047857
  				// memberi 5.48:1. Nilai 700/800 diturunkan agar skala tetap menggelap.
  				'600': '#047857',
  				'700': '#036848',
  				'800': '#065f46',
  				'900': '#064E3B'
  			},
  			accent: {
  				// DEFAULT/foreground = warna hover menu shadcn; skala 50–900 (amber) tetap untuk kode lama.
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))',
  				'50': '#fffbeb',
  				'100': '#fef3c7',
  				'200': '#fde68a',
  				'300': '#fcd34d',
  				'400': '#fbbf24',
  				'500': '#F59E0B',
  				'600': '#d97706',
  				'700': '#b45309',
  				'800': '#92400e',
  				'900': '#78350f'
  			},
  			surface: {
  				DEFAULT: '#ffffff',
  				subtle: '#f7f8f8',
  				muted: '#eef0f0',
  				dark: '#0f1714',
  				'dark-elevated': '#15201b',
  				'dark-border': '#1f2a25',
  			},
  			line: {
  				DEFAULT: '#e3e6e6',
  				strong: '#cbd0cf'
  			},
  			ink: {
  				DEFAULT: '#1a1f1d',
  				soft: '#3a423f',
  				faint: '#6b7470'
  			},
  			success: {
  				bg: '#D4EDDA',
  				fg: '#155724',
  				border: '#C3E6CB'
  			},
  			warning: {
  				bg: '#FFF3CD',
  				fg: '#856404',
  				border: '#FFE69C'
  			},
  			danger: {
  				bg: '#F8D7DA',
  				fg: '#721C24',
  				border: '#F5C6CB'
  			},
  			info: {
  				bg: '#D1ECF1',
  				fg: '#0C5460',
  				border: '#BEE5EB'
  			}
  		},
  		backgroundColor: {
  			dashboard: '#f7f8f8'
  		},
  		textColor: {
  			dashboard: '#1a1f1d'
  		},
  		borderRadius: {
  			lg: '10px',
  			xl: '14px',
  			'2xl': '18px',
  			'3xl': '24px'
  		},
  		boxShadow: {
  			card: '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
  			'card-hover': '0 8px 24px rgba(16, 24, 40, 0.10)',
  			soft: '0 4px 16px rgba(16, 24, 40, 0.06)',
  			nav: '0 1px 2px rgba(0, 0, 0, 0.04)',
  			modal: '0 12px 40px rgba(16, 24, 40, 0.16)',
  			'glass-card': '0 16px 40px rgba(0, 0, 0, 0.06), inset 0 1px 1px 0 rgba(255, 255, 255, 0.50)',
  			'glass-card-dark': '0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)',
  			'glass-modal': '0 24px 60px rgba(0, 0, 0, 0.14), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.60)',
  		},
  		backdropBlur: {
  			glass: '28px',
  			'glass-panel': '32px',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [
    require('flowbite/plugin'),
    require('tailwindcss-animate'),
  ],
}
