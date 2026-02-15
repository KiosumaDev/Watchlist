/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        netflix: {
          bg: '#141414',
          secondary: '#1a1a1a',
          card: '#2a2a2a',
          accent: '#E50914',
          'accent-hover': '#f40612',
          border: '#3a3a3a',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Poppins', 'sans-serif'],
        body: ['"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
