import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wing: {
          // Modern Minimal palette (matching iOS app)
          background: '#FAFAFA',
          card: '#FFFFFF',
          primary: '#F97316',      // Orange
          accent: '#8B5CF6',       // Purple
          success: '#22C55E',      // Green
          text: '#18181B',         // Charcoal
          textSecondary: '#71717A', // Gray
          textLight: '#A1A1AA',    // Light gray
          border: '#E4E4E7',
          borderLight: '#F4F4F5',
          error: '#EF4444',
          shadow: 'rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
  plugins: [],
};
export default config;
