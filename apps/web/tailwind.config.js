/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #1D4ED8)',
        accent: 'var(--color-accent, #0EA5E9)',
      },
    },
  },
  plugins: [],
};
