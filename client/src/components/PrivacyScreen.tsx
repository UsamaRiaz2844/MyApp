import { useEffect, useState } from 'react';

// Frosts the whole app whenever it loses focus or goes to the background, so the
// contents aren't visible in the app switcher or when peeking. Independent of
// the PIN lock (which, if set, sits above this and is required to get back in).
export default function PrivacyScreen() {
  const [obscured, setObscured] = useState(false);

  useEffect(() => {
    const show = () => setObscured(true);
    const hide = () => setObscured(false);
    const onVis = () => (document.visibilityState === 'hidden' ? show() : hide());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', show);
    window.addEventListener('focus', hide);
    window.addEventListener('pagehide', show);
    window.addEventListener('pageshow', hide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', show);
      window.removeEventListener('focus', hide);
      window.removeEventListener('pagehide', show);
      window.removeEventListener('pageshow', hide);
    };
  }, []);

  if (!obscured) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-white/50 backdrop-blur-2xl dark:bg-black/50">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-pink-500 text-3xl shadow-lg">
        🔒
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Pronto — hidden for privacy</p>
    </div>
  );
}
