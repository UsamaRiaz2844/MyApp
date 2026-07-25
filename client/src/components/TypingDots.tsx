export default function TypingDots() {
  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-200 px-3.5 py-2.5 dark:bg-white/10">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-blink rounded-full bg-slate-500 dark:bg-slate-300"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
