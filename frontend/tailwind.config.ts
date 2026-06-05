import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wing: {
          orange: '#E8722A',
          dark: '#1A0F0A',
          card: '#2A1A10',
          border: '#3D2618',
        },
      },
    },
  },
  plugins: [],
};
export default config;
