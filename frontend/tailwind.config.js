/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta ÁBACO — escala de grises oscuros (inspirada en SpaceX)
        abaco: {
          50:  '#f5f5f5',
          100: '#e8e8e8',
          200: '#cccccc',
          300: '#a3a3a3',
          400: '#7a7a7a',
          500: '#555555',
          600: '#3a3a3a',
          700: '#282828',
          800: '#181818',
          900: '#0f0f0f',
          950: '#000000',
        },
        // Acento dorado — usado con moderación
        oro: {
          300: '#fcd34d',
          400: '#f59e0b',
          500: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.2em',
        widest3: '0.3em',
      },
      borderWidth: {
        DEFAULT: '1px',
      },
    },
  },
  plugins: [],
}
