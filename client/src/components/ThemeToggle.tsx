import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-lg shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:scale-105 active:scale-95 dark:bg-white/10 dark:ring-white/10 ${className}`}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
