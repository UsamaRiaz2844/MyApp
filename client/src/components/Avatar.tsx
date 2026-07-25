interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  isOnline?: boolean;
  showStatus?: boolean;
}

export default function Avatar({ name, color, size = 44, isOnline, showStatus }: AvatarProps) {
  const initial = name?.[0]?.toUpperCase() || '?';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white shadow-inner"
        style={{ backgroundColor: color, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-[#0b0c10] ${
            isOnline ? 'bg-emerald-400' : 'bg-slate-400 dark:bg-slate-600'
          }`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
