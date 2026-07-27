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
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'cat-bob': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-6px) rotate(-1deg)' },
        },
        'cat-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '30%': { transform: 'translateY(-14px) scale(1.08)' },
          '55%': { transform: 'translateY(0) scale(0.96)' },
          '75%': { transform: 'translateY(-5px) scale(1.02)' },
        },
        'cat-shake': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-7deg)' },
          '40%': { transform: 'rotate(6deg)' },
          '60%': { transform: 'rotate(-5deg)' },
          '80%': { transform: 'rotate(4deg)' },
        },
        sparkle: {
          '0%': { opacity: '0', transform: 'scale(0.3) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.2) rotate(20deg)' },
          '100%': { opacity: '0', transform: 'scale(0.4) rotate(0deg)' },
        },
        'pet-float': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.6)' },
          '25%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-34px) scale(1.1)' },
        },
        'screen-shake': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '15%': { transform: 'translate(-9px, 5px) rotate(-1.5deg)' },
          '30%': { transform: 'translate(8px, -6px) rotate(1.5deg)' },
          '45%': { transform: 'translate(-7px, 4px) rotate(-1deg)' },
          '60%': { transform: 'translate(6px, -3px) rotate(1deg)' },
          '75%': { transform: 'translate(-4px, 2px) rotate(-0.5deg)' },
        },
        'punch-hit': {
          '0%': { opacity: '0', transform: 'scale(0.2) rotate(-25deg)' },
          '40%': { opacity: '1', transform: 'scale(1.5) rotate(6deg)' },
          '70%': { opacity: '1', transform: 'scale(1.1) rotate(-3deg)' },
          '100%': { opacity: '0', transform: 'scale(1.3) rotate(0deg)' },
        },
        // ---- scene animations ----
        drift: {
          from: { transform: 'translateX(-160px)' },
          to: { transform: 'translateX(560px)' },
        },
        'wave-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-18px)' },
        },
        'tv-flicker': {
          '0%, 100%': { opacity: '0.85' },
          '42%': { opacity: '0.62' },
          '48%': { opacity: '1' },
          '54%': { opacity: '0.7' },
          '60%': { opacity: '0.95' },
        },
        'rain-fall': {
          from: { transform: 'translateY(-40px)' },
          to: { transform: 'translateY(120px)' },
        },
        'snow-fall': {
          from: { transform: 'translateY(-30px) translateX(0)' },
          to: { transform: 'translateY(160px) translateX(18px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '1' },
        },
        'steam-rise': {
          '0%': { opacity: '0', transform: 'translateY(0) scale(1)' },
          '30%': { opacity: '0.7' },
          '100%': { opacity: '0', transform: 'translateY(-48px) scale(1.6)' },
        },
        'dice-roll': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '25%': { transform: 'rotate(-18deg) scale(1.12)' },
          '50%': { transform: 'rotate(16deg) scale(1.12)' },
          '75%': { transform: 'rotate(-8deg) scale(1.06)' },
          '100%': { transform: 'rotate(0deg) scale(1)' },
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
        'page-in': 'page-in 0.24s ease-out',
        'sheet-up': 'sheet-up 0.26s cubic-bezier(0.22,1,0.36,1)',
        'cat-bob': 'cat-bob 3s ease-in-out infinite',
        'cat-bounce': 'cat-bounce 0.7s ease-out',
        'cat-shake': 'cat-shake 0.5s ease-in-out infinite',
        'pet-float': 'pet-float 1.6s ease-in forwards',
        'screen-shake': 'screen-shake 0.55s ease-in-out',
        'punch-hit': 'punch-hit 0.6s ease-out forwards',
        drift: 'drift 48s linear infinite',
        'wave-x': 'wave-x 5s ease-in-out infinite',
        'tv-flicker': 'tv-flicker 4s ease-in-out infinite',
        'rain-fall': 'rain-fall 0.7s linear infinite',
        'snow-fall': 'snow-fall 4s linear infinite',
        twinkle: 'twinkle 3s ease-in-out infinite',
        'steam-rise': 'steam-rise 3.2s ease-in-out infinite',
        'dice-roll': 'dice-roll 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
};
