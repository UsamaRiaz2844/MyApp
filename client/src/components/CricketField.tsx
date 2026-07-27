// A cricket stadium scene (SVG) for the Cricket mini-game. `swing` re-triggers a
// tiny bat/ball animation when a new ball is played.
export default function CricketField({ batting, lastText }: { batting: boolean; lastText?: string }) {
  return (
    <div className="relative w-full max-w-[min(92vw,440px)]">
      <svg viewBox="0 0 400 300" className="w-full rounded-2xl shadow-xl">
        <defs>
          <radialGradient id="cr-field" cx="0.5" cy="0.45" r="0.7">
            <stop offset="0" stopColor="#57b65a" />
            <stop offset="1" stopColor="#2f8a3c" />
          </radialGradient>
          <linearGradient id="cr-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fd0ff" />
            <stop offset="1" stopColor="#cdeaff" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#cr-sky)" />
        {/* stands */}
        <rect y="70" width="400" height="46" fill="#3a3f5a" />
        {[...Array(40)].map((_, i) => (
          <circle key={i} cx={8 + i * 10} cy={80 + (i % 3) * 10} r="3" fill={['#ffd23f', '#e5484d', '#2f7de1', '#fff'][i % 4]} />
        ))}
        {/* field */}
        <ellipse cx="200" cy="230" rx="230" ry="150" fill="url(#cr-field)" />
        <ellipse cx="200" cy="230" rx="205" ry="132" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" />
        {/* pitch */}
        <polygon points="176,150 224,150 244,300 156,300" fill="#c9a56a" />
        <polygon points="176,150 224,150 244,300 156,300" fill="none" stroke="#e8d0a0" strokeWidth="1" />
        {/* far stumps */}
        <g stroke="#f4f0e6" strokeWidth="2.5">
          <line x1="196" y1="150" x2="196" y2="164" />
          <line x1="200" y1="150" x2="200" y2="164" />
          <line x1="204" y1="150" x2="204" y2="164" />
        </g>
        {/* near stumps */}
        <g stroke="#f4f0e6" strokeWidth="3.5">
          <line x1="192" y1="270" x2="192" y2="292" />
          <line x1="200" y1="270" x2="200" y2="292" />
          <line x1="208" y1="270" x2="208" y2="292" />
        </g>
        {/* batsman (near) */}
        <g transform="translate(168 250)">
          <circle cx="0" cy="-26" r="7" fill="#e8b48a" />
          <rect x="-6" y="-20" width="12" height="22" rx="4" fill={batting ? '#2f7de1' : '#e5484d'} />
          <line x1="6" y1="-10" x2="22" y2="-24" stroke="#8a5a2a" strokeWidth="4" strokeLinecap="round" />
          <rect x="18" y="-30" width="6" height="16" rx="2" fill="#caa15b" transform="rotate(35 20 -22)" />
        </g>
        {/* bowler (far) */}
        <g transform="translate(214 150)">
          <circle cx="0" cy="-8" r="5" fill="#e8b48a" />
          <rect x="-4" y="-4" width="8" height="16" rx="3" fill={batting ? '#e5484d' : '#2f7de1'} />
          <circle cx="8" cy="0" r="3" fill="#c0392b" />
        </g>
      </svg>
      {lastText && (
        <div className="absolute inset-x-0 top-2 text-center">
          <span className="rounded-full bg-black/55 px-4 py-1 text-sm font-extrabold text-white">{lastText}</span>
        </div>
      )}
    </div>
  );
}
