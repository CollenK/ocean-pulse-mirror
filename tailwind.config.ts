import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Balean Brand Colors
        balean: {
          navy: {
            DEFAULT: '#002557',
            dark: '#001a3d',
            light: '#003875',
          },
          yellow: {
            DEFAULT: '#FBD872',
            light: '#FCE4A0',
            dark: '#E5C35A',
          },
          cyan: {
            DEFAULT: '#00B5E2',
            light: '#4DD0F0',
            dark: '#0095BD',
          },
          coral: {
            DEFAULT: '#FF585D',
            light: '#FF8A8D',
            dark: '#E04347',
          },
          white: '#FFFFFF',
          'off-white': '#F8FAFC',
          gray: {
            50: '#F1F5F9',
            100: '#E2E8F0',
            200: '#CBD5E1',
            300: '#94A3B8',
            400: '#64748B',
            500: '#475569',
            600: '#334155',
          },
        },
        // Semantic Colors
        healthy: {
          DEFAULT: '#10B981',
          light: '#34D399',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
        },
        critical: {
          DEFAULT: '#EF4444',
          light: '#F87171',
        },
        info: '#3B82F6',
        // Legacy mappings for backward compatibility
        navy: {
          700: '#001a3d',
          600: '#002557',
        },
        cyan: {
          600: '#00ACC1',
          500: '#00BCD4',
        },
        ocean: {
          deep: '#002557',
          primary: '#00B5E2',
          accent: '#4DD0F0',
          100: '#E0F7FA',
          500: '#0288D1',
        },
        health: {
          high: '#10B981',
          medium: '#F59E0B',
          low: '#EF4444',
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 37, 87, 0.04)',
        'md': '0 4px 12px rgba(0, 37, 87, 0.08)',
        'lg': '0 8px 24px rgba(0, 37, 87, 0.12)',
        'xl': '0 16px 48px rgba(0, 37, 87, 0.16)',
        'glow-cyan': '0 0 32px rgba(0, 181, 226, 0.3)',
        'glow-coral': '0 0 32px rgba(255, 88, 93, 0.3)',
        'glow-yellow': '0 0 32px rgba(251, 216, 114, 0.4)',
      },
      fontFamily: {
        display: ['Acumin Variable', 'Lato', 'system-ui', 'sans-serif'],
        body: ['Lato', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.4s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 181, 226, 0.4)' },
          '50%': { boxShadow: '0 0 20px 10px rgba(0, 181, 226, 0.1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
