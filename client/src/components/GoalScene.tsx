// Penalty-shootout goal scene. Shows the keeper's dive and the ball on the last
// kick, plus a GOAL!/SAVED! banner. Zones: 0..5 = a 3x2 grid of the goal.
const ZONE_X = [130, 200, 270];
const ZONE_Y = [72, 132];
const zx = (z: number) => ZONE_X[z % 3];
const zy = (z: number) => ZONE_Y[Math.floor(z / 3)];

export default function GoalScene({ last }: { last?: { aim: number; dive: number; goal: boolean } | null }) {
  return (
    <svg viewBox="0 0 400 260" className="w-full max-w-[min(92vw,440px)] rounded-2xl shadow-xl">
      <defs>
        <linearGradient id="gl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a4a8a" />
          <stop offset="1" stopColor="#6d8fce" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#gl-sky)" />
      <rect y="185" width="400" height="75" fill="#2f8a3c" />
      <rect y="185" width="400" height="6" fill="#3fa04c" />

      {/* goal frame */}
      <rect x="60" y="30" width="280" height="155" fill="#ffffff" opacity="0.06" />
      {/* net */}
      <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1">
        {[...Array(13)].map((_, i) => (
          <line key={`v${i}`} x1={60 + i * 23} y1="30" x2={60 + i * 23} y2="185" />
        ))}
        {[...Array(8)].map((_, i) => (
          <line key={`h${i}`} x1="60" y1={30 + i * 22} x2="340" y2={30 + i * 22} />
        ))}
      </g>
      <g stroke="#eef1f5" strokeWidth="7" strokeLinecap="round">
        <line x1="60" y1="30" x2="340" y2="30" />
        <line x1="60" y1="30" x2="60" y2="185" />
        <line x1="340" y1="30" x2="340" y2="185" />
      </g>

      {/* keeper at dive zone (or centre at rest) */}
      {(() => {
        const dz = last ? last.dive : 4;
        const x = last ? zx(dz) : 200;
        const y = last ? zy(dz) : 120;
        return (
          <g transform={`translate(${x} ${y})`}>
            <circle cx="0" cy="-14" r="8" fill="#f0c088" />
            <rect x="-11" y="-8" width="22" height="26" rx="7" fill="#ffd23f" />
            <line x1="-11" y1="-4" x2="-26" y2="-14" stroke="#ffd23f" strokeWidth="7" strokeLinecap="round" />
            <line x1="11" y1="-4" x2="26" y2="-14" stroke="#ffd23f" strokeWidth="7" strokeLinecap="round" />
          </g>
        );
      })()}

      {/* ball at aim zone */}
      {last && (
        <g transform={`translate(${zx(last.aim)} ${zy(last.aim)})`}>
          <circle r="9" fill="#fff" stroke="#111" strokeWidth="1.5" />
          <path d="M0 -9 l3 6 -6 0 z" fill="#111" />
        </g>
      )}

      {last && (
        <text x="200" y="220" textAnchor="middle" fontSize="30" fontWeight="900" fill={last.goal ? '#ffe14a' : '#ff6b6b'}>
          {last.goal ? 'GOAL! ⚽' : 'SAVED! 🧤'}
        </text>
      )}
    </svg>
  );
}
