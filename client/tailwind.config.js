/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        blink: {
          '0%, 80%, 100%': { opacity: '0.2' },
          '40%': { opacity: '1' },
        },
        'float-up': {
          '0%': { opacity: '0', transform: 'translateY(0) scale(0.6)' },
          '15%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-90vh) scale(1.3)' },
        },
        'confetti-fall': {
          '0%': { opacity: '1', transform: 'translateY(-10vh) rotate(0deg)' },
          '100%': { opacity: '0.9', transform: 'translateY(100vh) rotate(720deg)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.25)' },
          '30%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.25)' },
          '60%': { transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.85' },
        },
        'reaction-pop': {
          '0%': { transform: 'scale(0)' },
          '70%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.18s ease-out',
        blink: 'blink 1.4s infinite',
        'float-up': 'float-up 3.2s ease-in forwards',
        'confetti-fall': 'confetti-fall 2.8s linear forwards',
        heartbeat: 'heartbeat 0.9s ease-in-out',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'reaction-pop': 'reaction-pop 0.28s ease-out',
      },
    },
  },
  plugins: [],
};
