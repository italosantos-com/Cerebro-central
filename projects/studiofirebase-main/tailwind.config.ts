import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        body: ['var(--font-sans)', 'sans-serif'],
        headline: ['var(--font-sans)', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        'accent-shadow': 'hsla(var(--accent) / 0.5)',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      backgroundImage: {
        'gradient-silver': 'linear-gradient(135deg, #bdc1ca 0%, #e2e6f0 50%, #9aa0b1 100%)',
        'gradient-carbon': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
        'glass-premium': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
        'border-gradient': 'linear-gradient(45deg, #24272e 0%, #454a59 100%)',
      },
      boxShadow: {
        'neon-red-light': '0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--primary) / 0.5)',
        'neon-red-strong': '0 0 15px hsl(var(--primary)), 0 0 25px hsl(var(--primary) / 0.7)',
        'neon-white': '0 0 15px rgba(255, 255, 255, 0.8), 0 0 25px rgba(255, 255, 255, 0.6)',
        'silver-glow': '0 0 15px -5px rgba(189, 193, 202, 0.3)',
        'premium-inner': 'inset 0 1px 1px rgba(255,255,255,0.05)',
        'premium-card': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      textShadow: {
        'neon-red-light': '0 0 5px hsl(var(--primary) / 0.8)',
        'neon-red': '0 0 8px hsl(var(--primary))',
        'neon-white': '0 0 16px rgba(255, 255, 255, 0.9), 0 0 32px rgba(255, 255, 255, 0.7)',
        'neon-red-strong': '0 0 15px hsl(var(--primary)), 0 0 25px hsl(var(--primary) / 0.7)',
        DEFAULT: '0 0 5px hsl(var(--primary) / 0.8)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'pulse-glow': {
          '0%, 100%': { 
            opacity: '1',
            textShadow: '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary))'
          },
          '50%': { 
            opacity: '0.8',
            textShadow: '0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary)), 0 0 40px hsl(var(--primary))'
          },
        },
        'pulse-green-glow': {
          '0%, 100%': {
            boxShadow: '0 0 15px #22c55e, 0 0 25px #22c55e'
          },
          '50%': {
            boxShadow: '0 0 25px #22c55e, 0 0 40px #22c55e'
          }
        },
        'pulse-red-glow': {
            '0%, 100%': {
              boxShadow: '0 0 15px hsl(var(--primary)), 0 0 25px hsl(var(--primary))'
            },
            '50%': {
              boxShadow: '0 0 25px hsl(var(--primary)), 0 0 40px hsl(var(--primary))'
            }
        },
        'marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-green-glow': 'pulse-green-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-red-glow': 'pulse-red-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 25s linear infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Plugin customizado para text-shadow
    plugin(function({ matchUtilities, theme }) {
      matchUtilities(
        {
          'text-shadow': (value) => ({
            textShadow: value,
          }),
        },
        { values: theme('textShadow') }
      )
    }),
  ],
};

export default config;