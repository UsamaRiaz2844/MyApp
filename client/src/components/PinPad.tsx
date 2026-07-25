import { useState } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  onSubmit: (pin: string) => void;
  onCancel?: () => void;
  error?: string;
}

// Reusable 4-digit numeric keypad, used both to set and to enter the app PIN.
export default function PinPad({ title, subtitle, onSubmit, onCancel, error }: Props) {
  const [pin, setPin] = useState('');

  function press(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        onSubmit(next);
        setPin('');
      }, 120);
    }
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center">
      <div className="mb-1 text-lg font-bold text-slate-900 dark:text-white">{title}</div>
      {subtitle && <div className="mb-5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}

      <div className="mb-6 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full transition ${
              i < pin.length ? 'bg-brand-500' : 'bg-slate-300 dark:bg-white/15'
            }`}
          />
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-16 w-16 rounded-full bg-slate-100 text-2xl font-semibold text-slate-800 transition active:scale-90 dark:bg-white/10 dark:text-white"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press('0')}
          className="h-16 w-16 rounded-full bg-slate-100 text-2xl font-semibold text-slate-800 transition active:scale-90 dark:bg-white/10 dark:text-white"
        >
          0
        </button>
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="h-16 w-16 rounded-full text-2xl text-slate-500 transition active:scale-90 dark:text-slate-300"
        >
          ⌫
        </button>
      </div>

      {onCancel && (
        <button onClick={onCancel} className="mt-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          Cancel
        </button>
      )}
    </div>
  );
}
