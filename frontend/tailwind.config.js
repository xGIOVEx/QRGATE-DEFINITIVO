/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: [
		"./src/**/*.{js,jsx,ts,tsx}",
		"./public/index.html"
	],
	theme: {
		extend: {
			colors: {
				background: 'var(--bg)',
				foreground: 'hsl(var(--foreground))', // Added foreground
				primary: {
					DEFAULT: 'hsl(var(--primary))', // Moved and updated
					foreground: 'hsl(var(--primary-foreground))' // Moved
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))', // Moved and updated
					foreground: 'hsl(var(--secondary-foreground))' // Moved
				},
				success: 'var(--success)',
				error: 'var(--error)',
				muted: {
					DEFAULT: 'hsl(var(--muted))', // Moved
					foreground: 'hsl(var(--muted-foreground))' // Moved
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))', // Moved
					foreground: 'hsl(var(--accent-foreground))' // Moved
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))', // Moved
					foreground: 'hsl(var(--destructive-foreground))' // Moved
				},
				border: 'hsl(var(--border))', // Moved
				input: 'hsl(var(--input))', // Moved
				ring: 'hsl(var(--ring))', // Moved
				popover: { // Added popover
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: { // Added card
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			fontFamily: {
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				serif: ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
			},
			boxShadow: {
				'card': '0 4px 6px -1px var(--shadow-color), 0 2px 4px -2px var(--shadow-color)',
				'elevated': '0 20px 25px -5px var(--shadow-color), 0 8px 10px -6px var(--shadow-color)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
}