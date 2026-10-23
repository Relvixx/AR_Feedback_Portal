/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1B302E',
          light: '#2E524E',
        },
        navy: {
          DEFAULT: '#1B302E',
          light: '#2E524E',
        },
        terracotta: {
          DEFAULT: '#B6654D',
          light: '#F7EAE5',
        },
        ink: '#1B302E',
        muted: '#536B68',
        blue: '#B6654D',
        border: '#E2DDD5',
        panel: '#ffffff',
        ground: '#F7F5F0',
        soft: '#EFECE6',
        green: '#166534',
        red: '#C00000',
        gold: '#B6654D',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        'xl': '16px',
      },
      boxShadow: {
        'soft': '0 10px 30px rgba(19,46,70,.045)',
      },
    },
  },
  plugins: [],
};