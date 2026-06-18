/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', 'class'],
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
  			primary: {
  				'50': '#ecfdf5',
  				'100': '#d1fae5',
  				'200': '#a7f3d0',
  				'300': '#6ee7b7',
  				'400': '#34d399',
  				'500': '#10B981',
  				'600': '#059669',
  				'700': '#047857',
  				'800': '#065f46',
  				'900': '#064E3B'
  			},
  			accent: {
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
  				muted: '#eef0f0'
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
  			modal: '0 12px 40px rgba(16, 24, 40, 0.16)'
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
  ],
}
