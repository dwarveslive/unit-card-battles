import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
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
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					green: 'hsl(var(--card-green))',
					blue: 'hsl(var(--card-blue))',
					red: 'hsl(var(--card-red))',
					black: 'hsl(var(--card-black))',
					white: 'hsl(var(--card-white))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-table': 'var(--gradient-table)',
				'gradient-card': 'var(--gradient-card)'
			},
			boxShadow: {
				'card': 'var(--shadow-card)',
				'glow': 'var(--shadow-glow)',
				'battle': 'var(--shadow-battle)'
			},
			transitionProperty: {
				'card': 'var(--transition-card)',
				'smooth': 'var(--transition-smooth)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
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
				},
				'card-draw': {
					'0%': {
						transform: 'translateY(20px) rotateX(90deg)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0) rotateX(0deg)',
						opacity: '1'
					}
				},
				'card-play': {
					'0%': {
						transform: 'scale(1) rotate(0deg)',
						opacity: '1'
					},
					'50%': {
						transform: 'scale(1.1) rotate(5deg)',
						opacity: '0.8'
					},
					'100%': {
						transform: 'scale(1) rotate(0deg)',
						opacity: '1'
					}
				},
				'card-battle': {
					'0%': {
						transform: 'translateX(0) scale(1)',
						filter: 'brightness(1)'
					},
					'50%': {
						transform: 'translateX(10px) scale(1.05)',
						filter: 'brightness(1.2)'
					},
					'100%': {
						transform: 'translateX(0) scale(1)',
						filter: 'brightness(1)'
					}
				},
				'pulse-glow': {
					'0%, 100%': {
						boxShadow: '0 0 20px hsl(var(--primary-glow) / 0.4)'
					},
					'50%': {
						boxShadow: '0 0 40px hsl(var(--primary-glow) / 0.8)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'card-draw': 'card-draw 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
				'card-play': 'card-play 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
				'card-battle': 'card-battle 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
