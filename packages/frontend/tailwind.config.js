/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#163A63',
          700: '#0F2A4A',
          800: '#0A1E35',
        },
        'civic-blue': {
          DEFAULT: '#2463A6',
          light: '#E8F1FB',
        },
        'page-bg': '#F4F7FB',
        surface: '#FFFFFF',
        'text-primary': '#1B2735',
        'text-secondary': '#586779',
        border: '#DCE4ED',
        success: '#197447',
        warning: '#986000',
        danger: '#B42318',
        info: '#1769AA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
