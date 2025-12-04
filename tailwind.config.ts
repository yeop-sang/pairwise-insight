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
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				display: ['Space Grotesk', 'Inter', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					muted: 'hsl(var(--primary-muted))'
				},
				metallic: {
					silver: 'hsl(var(--metallic-silver))',
					dark: 'hsl(var(--metallic-dark))',
					light: 'hsl(var(--metallic-light))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
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
					foreground: 'hsl(var(--card-foreground))'
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
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			spacing: {
				'xs': 'var(--space-xs)',
				'sm': 'var(--space-sm)', 
				'md': 'var(--space-md)',
				'lg': 'var(--space-lg)',
				'xl': 'var(--space-xl)',
				'2xl': 'var(--space-2xl)'
			},
			fontSize: {
				'xs': 'var(--text-xs)',
				'sm': 'var(--text-sm)',
				'base': 'var(--text-base)',
				'lg': 'var(--text-lg)',
				'xl': 'var(--text-xl)',
				'2xl': 'var(--text-2xl)',
				'3xl': 'var(--text-3xl)',
				'4xl': 'var(--text-4xl)'
			},
			boxShadow: {
				'soft': 'var(--shadow-soft)',
				'medium': 'var(--shadow-medium)',
				'strong': 'var(--shadow-strong)',
				'glow': 'var(--shadow-glow)',
				'metallic': 'var(--shadow-metallic)'
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-metallic': 'var(--gradient-metallic)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-subtle': 'var(--gradient-subtle)'
			},
			transitionDuration: {
				'fast': 'var(--transition-fast)',
				'normal': 'var(--transition-normal)',
				'slow': 'var(--transition-slow)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'zoom-in-bounce': {
					'0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
					'50%': { transform: 'scale(1.2) rotate(5deg)', opacity: '1' },
					'100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' }
				},
				'sparkle': {
					'0%, 100%': { opacity: '1', transform: 'scale(1)' },
					'50%': { opacity: '0.5', transform: 'scale(1.2)' }
				},
				'rise-up': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'medal-swing': {
					'0%, 100%': { transform: 'rotate(-8deg)' },
					'50%': { transform: 'rotate(8deg)' }
				},
				'golden-glow': {
					'0%, 100%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)' },
					'50%': { boxShadow: '0 0 60px rgba(255, 215, 0, 0.9)' }
				},
				'confetti': {
					'0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
					'100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' }
				},
				'particle': {
					'0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
					'100%': { transform: 'translate(var(--x, 50px), var(--y, -50px)) scale(0)', opacity: '0' }
				},
				'bounce-slow': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'mega-zoom-in': {
					'0%': { transform: 'scale(0) rotate(-20deg)', opacity: '0' },
					'40%': { transform: 'scale(1.4) rotate(10deg)', opacity: '1' },
					'60%': { transform: 'scale(0.9) rotate(-5deg)' },
					'80%': { transform: 'scale(1.1) rotate(2deg)' },
					'100%': { transform: 'scale(1) rotate(0deg)' }
				},
				'bell-swing': {
					'0%, 100%': { transform: 'rotate(-20deg)' },
					'50%': { transform: 'rotate(20deg)' }
				},
				'screen-flash': {
					'0%': { backgroundColor: 'rgba(255, 255, 255, 0)' },
					'10%': { backgroundColor: 'rgba(255, 255, 255, 0.8)' },
					'100%': { backgroundColor: 'rgba(255, 255, 255, 0)' }
				},
				'spin-slow': {
					'0%': { transform: 'rotate(0deg)' },
					'100%': { transform: 'rotate(360deg)' }
				},
				'pulse-glow': {
					'0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
					'50%': { opacity: '1', transform: 'scale(1.1)' }
				},
				'bounce-dramatic': {
					'0%, 100%': { transform: 'translateY(0) scale(1)' },
					'30%': { transform: 'translateY(-30px) scale(1.1)' },
					'50%': { transform: 'translateY(-15px) scale(1.05)' },
					'70%': { transform: 'translateY(-20px) scale(1.08)' }
				},
				'name-glow': {
					'0%, 100%': { textShadow: '0 0 20px currentColor, 0 0 40px currentColor' },
					'50%': { textShadow: '0 0 40px currentColor, 0 0 80px currentColor, 0 0 120px currentColor' }
				},
				'score-pop': {
					'0%': { transform: 'scale(0)', opacity: '0' },
					'50%': { transform: 'scale(1.3)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'golden-pulse': {
					'0%, 100%': { boxShadow: '0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.1)' },
					'50%': { boxShadow: '0 0 60px rgba(255, 215, 0, 0.8), inset 0 0 40px rgba(255, 215, 0, 0.2)' }
				},
				'podium-rise': {
					'0%': { transform: 'translateY(200px)', opacity: '0' },
					'60%': { transform: 'translateY(-20px)', opacity: '1' },
					'100%': { transform: 'translateY(0)' }
				},
				'ribbon-fall': {
					'0%': { transform: 'translateY(-100px) rotate(0deg)', opacity: '1' },
					'100%': { transform: 'translateY(100vh) rotate(360deg)', opacity: '0.5' }
				},
				'confetti-fall': {
					'0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
					'100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' }
				},
				'firework': {
					'0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
					'50%': { transform: 'translateY(-300px) scale(1.5)', opacity: '1' },
					'100%': { transform: 'translateY(-400px) scale(0)', opacity: '0' }
				},
				'shooting-star': {
					'0%': { transform: 'translateX(0) translateY(0)', opacity: '1' },
					'100%': { transform: 'translateX(200px) translateY(200px)', opacity: '0' }
				},
				'explode-out': {
					'0%': { transform: 'translate(-50%, -50%) rotate(var(--angle)) translateY(0)', opacity: '1' },
					'100%': { transform: 'translate(-50%, -50%) rotate(var(--angle)) translateY(var(--distance))', opacity: '0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'zoom-in-bounce': 'zoom-in-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
				'sparkle': 'sparkle 1.5s ease-in-out infinite',
				'rise-up': 'rise-up 0.8s ease-out forwards',
				'medal-swing': 'medal-swing 1.5s ease-in-out infinite',
				'golden-glow': 'golden-glow 2s ease-in-out infinite',
				'confetti': 'confetti 4s linear forwards',
				'particle': 'particle 1s ease-out forwards',
				'bounce-slow': 'bounce-slow 2s ease-in-out infinite',
				'fade-in': 'fade-in 0.5s ease-out forwards',
				'mega-zoom-in': 'mega-zoom-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
				'bell-swing': 'bell-swing 0.5s ease-in-out infinite',
				'screen-flash': 'screen-flash 0.5s ease-out forwards',
				'spin-slow': 'spin-slow 20s linear infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'bounce-dramatic': 'bounce-dramatic 1.5s ease-in-out infinite',
				'name-glow': 'name-glow 2s ease-in-out infinite',
				'score-pop': 'score-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
				'golden-pulse': 'golden-pulse 2s ease-in-out infinite',
				'podium-rise': 'podium-rise 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
				'ribbon-fall': 'ribbon-fall 4s linear infinite',
				'confetti-fall': 'confetti-fall 3s linear infinite',
				'firework': 'firework 1.5s ease-out infinite',
				'shooting-star': 'shooting-star 2s linear infinite',
				'explode-out': 'explode-out 0.8s ease-out forwards'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
