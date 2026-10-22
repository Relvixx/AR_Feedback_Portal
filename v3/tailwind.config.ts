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
        navy: {
          DEFAULT: '#102a43',
          light: '#16324C',
        },
        ink: '#162c40',
        muted: '#718296',
        blue: '#246ba5',
        border: '#e3e9ef',
        panel: '#fff',
        ground: '#f4f7fa',
        soft: '#edf4fa',
        green: '#21837c',
        red: '#C00000',
        gold: '#e7a549',
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