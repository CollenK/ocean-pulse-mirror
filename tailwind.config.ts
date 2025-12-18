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
        navy: {
          700: '#001a3d',
          600: '#002557',
        },
        cyan: {
          600: '#00ACC1',
          500: '#00BCD4',
        },
        ocean: {
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
    },
  },
  plugins: [],
};

export default config;
