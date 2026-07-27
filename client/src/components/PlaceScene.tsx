// High-quality, self-contained SVG "place" scenes used as chat backgrounds.
// Layered flat illustrations (gradients + silhouettes) sized to cover the chat,
// with lightweight CSS animations (drifting clouds, waves, rain/snow, flicker,
// twinkle, steam). A dusk/night dim is applied in dark mode. No external images.

import type { ReactNode } from 'react';

interface Props {
  scene: string;
  dark: boolean;
}

const VB = '0 0 400 800';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      {children}
    </svg>
  );
}

// --- reusable animated bits ------------------------------------------------
function Cloud({ x, y, s = 1, delay = '0s', dur = '48s', fill = '#ffffff', opacity = 0.85 }: any) {
  return (
    <g className="animate-drift" style={{ animationDelay: delay, animationDuration: dur }} opacity={opacity} fill={fill}>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx="0" cy="0" rx="46" ry="20" />
        <ellipse cx="30" cy="-10" rx="34" ry="18" />
        <ellipse cx="-28" cy="-6" rx="30" ry="16" />
      </g>
    </g>
  );
}

function Stars({ count = 14, w = 400, h = 300, fill = '#ffffff' }: any) {
  return (
    <g fill={fill}>
      {[...Array(count)].map((_, i) => (
        <circle
          key={i}
          className="animate-twinkle"
          style={{ animationDelay: `${(i % 5) * 0.6}s` }}
          cx={(i * 61) % w}
          cy={(i * 37) % h}
          r={i % 3 === 0 ? 1.8 : 1.2}
        />
      ))}
    </g>
  );
}

function Rain({ color = '#bcd4e6', count = 26 }: any) {
  return (
    <g stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7">
      {[...Array(count)].map((_, i) => (
        <line
          key={i}
          className="animate-rain-fall"
          style={{ animationDelay: `${(i % 7) * 0.1}s`, animationDuration: `${0.55 + (i % 5) * 0.07}s` }}
          x1={(i * 33) % 400}
          y1={(i * 53) % 800}
          x2={((i * 33) % 400) - 6}
          y2={((i * 53) % 800) + 18}
        />
      ))}
    </g>
  );
}

function Snow({ count = 26 }: any) {
  return (
    <g fill="#ffffff">
      {[...Array(count)].map((_, i) => (
        <circle
          key={i}
          className="animate-snow-fall"
          style={{ animationDelay: `${(i % 8) * 0.5}s`, animationDuration: `${3 + (i % 5)}s` }}
          cx={(i * 41) % 400}
          cy={(i * 67) % 800}
          r={i % 3 === 0 ? 3 : 2}
          opacity="0.9"
        />
      ))}
    </g>
  );
}

// ===========================================================================
function Bedroom() {
  return (
    <Svg>
      <defs>
        <linearGradient id="bd-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2a52" />
          <stop offset="1" stopColor="#6d4c74" />
        </linearGradient>
        <linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#20204d" />
          <stop offset="1" stopColor="#c8709a" />
        </linearGradient>
        <radialGradient id="bd-lamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe6a8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffe6a8" stopOpacity="0" />
        </radialGradient>
        <clipPath id="bd-win">
          <rect x="228" y="70" width="150" height="200" rx="8" />
        </clipPath>
      </defs>
      <rect width="400" height="800" fill="url(#bd-wall)" />
      <g clipPath="url(#bd-win)">
        <rect x="228" y="70" width="150" height="200" fill="url(#bd-sky)" />
        <circle cx="330" cy="120" r="20" fill="#fef3d0" />
        <circle cx="322" cy="114" r="18" fill="#3a2a5a" />
        <Stars count={10} w={150} h={200} />
        <g transform="translate(228 70)">
          <Stars count={8} w={150} h={200} />
        </g>
      </g>
      <rect x="222" y="64" width="162" height="212" rx="10" fill="none" stroke="#2a1e3a" strokeWidth="8" />
      <line x1="303" y1="70" x2="303" y2="270" stroke="#2a1e3a" strokeWidth="6" />
      <rect y="600" width="400" height="200" fill="#3a2a1e" />
      <rect x="-10" y="560" width="250" height="60" rx="10" fill="#5b4636" />
      <rect x="-10" y="470" width="250" height="110" rx="16" fill="#e8e2f0" />
      <rect x="-10" y="470" width="250" height="60" rx="16" fill="#f5f1fb" />
      <rect x="10" y="486" width="90" height="46" rx="12" fill="#fff" />
      <rect x="110" y="486" width="90" height="46" rx="12" fill="#f0d0dc" />
      <path d="M-10 520 h250 v60 a16 16 0 0 1 -16 16 h-218 a16 16 0 0 1 -16 -16 z" fill="#b56d8c" />
      <circle className="animate-glow-pulse" cx="300" cy="470" r="120" fill="url(#bd-lamp)" />
      <rect x="270" y="560" width="70" height="60" rx="6" fill="#5b4636" />
      <rect x="298" y="500" width="14" height="60" fill="#caa15b" />
      <path d="M285 480 h40 l10 24 h-60 z" fill="#ffd77a" />
    </Svg>
  );
}

function Bathroom() {
  return (
    <Svg>
      <defs>
        <linearGradient id="ba-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8f0f4" />
          <stop offset="1" stopColor="#a9dde6" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#ba-wall)" />
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2">
        {[...Array(9)].map((_, r) => (
          <line key={`h${r}`} x1="0" y1={r * 60} x2="400" y2={r * 60} />
        ))}
        {[...Array(8)].map((_, c) => (
          <line key={`v${c}`} x1={c * 57} y1="0" x2={c * 57} y2="540" />
        ))}
      </g>
      <rect y="540" width="400" height="260" fill="#cfe7ec" />
      <rect x="30" y="470" width="250" height="120" rx="52" fill="#ffffff" />
      <rect x="46" y="486" width="218" height="88" rx="40" fill="#dff3fb" />
      <ellipse cx="155" cy="520" rx="90" ry="18" fill="#bfe6f5" />
      <rect x="300" y="120" width="14" height="150" rx="6" fill="#9fb6bd" />
      <circle cx="307" cy="110" r="26" fill="#cdd9dc" />
      <circle cx="307" cy="110" r="18" fill="#eef4f5" />
      <Rain color="#bfe6f5" count={10} />
      <rect x="60" y="120" width="120" height="150" rx="12" fill="#eafaff" stroke="#ffffff" strokeWidth="8" />
      <rect x="330" y="500" width="44" height="60" rx="6" fill="#e08d6b" />
      <path d="M352 500 q-30 -60 -12 -96 q26 30 12 96 z" fill="#5aa36b" />
      <path d="M352 500 q34 -50 20 -92 q-30 34 -20 92 z" fill="#69b87c" />
    </Svg>
  );
}

function Kitchen() {
  return (
    <Svg>
      <defs>
        <linearGradient id="k-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe7c6" />
          <stop offset="1" stopColor="#f3d29b" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#k-wall)" />
      <rect y="60" width="400" height="150" fill="#8c5a3a" />
      {[40, 150, 260].map((x) => (
        <rect key={x} x={x} y="74" width="96" height="122" rx="6" fill="#a06b45" stroke="#7a4c30" strokeWidth="3" />
      ))}
      <g fill="#fff5e6">
        {[...Array(10)].map((_, i) => (
          <rect key={i} x={(i % 5) * 82 + 6} y={220 + Math.floor(i / 5) * 40} width="74" height="32" rx="4" />
        ))}
      </g>
      <rect y="470" width="400" height="30" fill="#3a2b22" />
      <rect y="500" width="400" height="300" fill="#b07a4f" />
      {[70, 200, 330].map((x) => (
        <rect key={x} x={x} y="510" width="60" height="90" rx="6" fill="#96633c" stroke="#7a4c30" strokeWidth="3" />
      ))}
      <rect x="150" y="430" width="100" height="44" rx="8" fill="#4b4b52" />
      <ellipse cx="200" cy="430" rx="46" ry="12" fill="#5c5c66" />
      {/* steam from the pot */}
      <g fill="#ffffff">
        <ellipse className="animate-steam-rise" style={{ animationDelay: '0s' }} cx="188" cy="418" rx="7" ry="10" opacity="0" />
        <ellipse className="animate-steam-rise" style={{ animationDelay: '1s' }} cx="205" cy="418" rx="6" ry="9" opacity="0" />
        <ellipse className="animate-steam-rise" style={{ animationDelay: '2s' }} cx="215" cy="418" rx="7" ry="10" opacity="0" />
      </g>
      <rect x="150" y="250" width="100" height="120" rx="6" fill="#bfe3ff" stroke="#7a4c30" strokeWidth="6" />
      <rect x="150" y="360" width="100" height="14" fill="#8c5a3a" />
      <circle cx="176" cy="356" r="9" fill="#5aa36b" />
      <circle cx="224" cy="356" r="9" fill="#69b87c" />
    </Svg>
  );
}

function Lounge() {
  return (
    <Svg>
      <defs>
        <linearGradient id="tv-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2440" />
          <stop offset="1" stopColor="#39406b" />
        </linearGradient>
        <radialGradient id="tv-glow" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#6ea8ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#6ea8ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="800" fill="url(#tv-wall)" />
      <circle className="animate-tv-flicker" cx="200" cy="220" r="220" fill="url(#tv-glow)" />
      <rect x="70" y="110" width="260" height="150" rx="10" fill="#0a0d1a" stroke="#000" strokeWidth="4" />
      <rect x="82" y="122" width="236" height="126" rx="4" fill="#2b6fd6" />
      <rect className="animate-tv-flicker" x="82" y="122" width="236" height="126" rx="4" fill="#bcd7ff" opacity="0.5" />
      <rect x="180" y="260" width="40" height="26" fill="#0a0d1a" />
      <rect x="150" y="286" width="100" height="8" rx="4" fill="#0a0d1a" />
      <rect y="300" width="400" height="40" rx="6" fill="#2a2036" />
      <rect y="560" width="400" height="240" fill="#241a2e" />
      <rect x="30" y="470" width="340" height="120" rx="20" fill="#7a4b6b" />
      <rect x="30" y="440" width="340" height="70" rx="18" fill="#8f5a7d" />
      <rect x="46" y="452" width="150" height="60" rx="14" fill="#a06a8d" />
      <rect x="204" y="452" width="150" height="60" rx="14" fill="#a06a8d" />
      <rect x="70" y="420" width="80" height="60" rx="12" fill="#c98fb0" />
      <rect x="250" y="420" width="80" height="60" rx="12" fill="#c98fb0" />
    </Svg>
  );
}

function Garage() {
  return (
    <Svg>
      <defs>
        <linearGradient id="g-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4f57" />
          <stop offset="1" stopColor="#6b7079" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#g-wall)" />
      <g fill="#7c828c" stroke="#565b63" strokeWidth="3">
        {[...Array(4)].map((_, r) => (
          <rect key={r} x="20" y={90 + r * 70} width="360" height="60" rx="4" />
        ))}
      </g>
      <g stroke="#d7a13a" strokeWidth="6" strokeLinecap="round">
        <line x1="40" y1="60" x2="70" y2="30" />
        <line x1="90" y1="55" x2="90" y2="20" />
      </g>
      <rect y="560" width="400" height="240" fill="#3a3f45" />
      <line x1="0" y1="560" x2="400" y2="560" stroke="#ffd23f" strokeWidth="5" strokeDasharray="24 16" />
      <rect x="40" y="470" width="320" height="70" rx="24" fill="#c0392b" />
      <path d="M100 470 q30 -50 100 -50 q70 0 100 50 z" fill="#e05545" />
      <rect x="120" y="432" width="160" height="42" rx="14" fill="#bfe3ff" opacity="0.85" />
      <circle cx="120" cy="545" r="34" fill="#1b1b1f" />
      <circle cx="120" cy="545" r="15" fill="#9aa0a6" />
      <circle cx="290" cy="545" r="34" fill="#1b1b1f" />
      <circle cx="290" cy="545" r="15" fill="#9aa0a6" />
      <circle className="animate-glow-pulse" cx="352" cy="500" r="12" fill="#ffe9a8" />
    </Svg>
  );
}

function Street() {
  return (
    <Svg>
      <defs>
        <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241a44" />
          <stop offset="1" stopColor="#e58a6a" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#st-sky)" />
      <Stars count={12} w={400} h={200} />
      {[
        { x: 0, y: 220, w: 90, h: 380, c: '#2b2450' },
        { x: 95, y: 150, w: 80, h: 450, c: '#332a5c' },
        { x: 180, y: 260, w: 70, h: 340, c: '#2b2450' },
        { x: 255, y: 120, w: 70, h: 480, c: '#3a3068' },
        { x: 330, y: 210, w: 80, h: 390, c: '#2b2450' },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} />
          {[...Array(24)].map((_, k) => {
            const lit = (k * 7 + i * 13) % 10 > 4;
            return (
              <rect
                key={k}
                className={lit && k % 4 === 0 ? 'animate-twinkle' : undefined}
                style={lit && k % 4 === 0 ? { animationDelay: `${(k % 5) * 0.7}s` } : undefined}
                x={b.x + 10 + (k % 3) * 24}
                y={b.y + 16 + Math.floor(k / 3) * 40}
                width="12"
                height="18"
                fill={lit ? '#ffe08a' : '#3d3566'}
              />
            );
          })}
        </g>
      ))}
      <rect y="600" width="400" height="200" fill="#2a2a30" />
      <rect y="600" width="400" height="10" fill="#4a4a52" />
      <line x1="200" y1="620" x2="200" y2="800" stroke="#ffd23f" strokeWidth="6" strokeDasharray="26 22" />
      <rect x="60" y="470" width="8" height="140" fill="#1b1b22" />
      <path d="M64 470 h60" stroke="#1b1b22" strokeWidth="8" />
      <circle cx="124" cy="474" r="10" fill="#ffe08a" />
      <circle className="animate-glow-pulse" cx="124" cy="474" r="26" fill="#ffe08a" opacity="0.25" />
    </Svg>
  );
}

function Highway() {
  return (
    <Svg>
      <defs>
        <linearGradient id="hw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7b267" />
          <stop offset="0.5" stopColor="#f4845f" />
          <stop offset="1" stopColor="#e05a5a" />
        </linearGradient>
        <linearGradient id="hw-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a5560" />
          <stop offset="1" stopColor="#2b2830" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#hw-sky)" />
      <circle cx="200" cy="360" r="70" fill="#ffe3a0" opacity="0.95" />
      <Cloud x={90} y={150} s={0.9} delay="0s" dur="60s" fill="#ffd9b0" opacity={0.6} />
      <Cloud x={260} y={110} s={0.7} delay="-25s" dur="60s" fill="#ffcaa0" opacity={0.55} />
      <path d="M0 420 q100 -50 200 -10 q100 40 200 -6 v40 H0 z" fill="#b64f5a" opacity="0.6" />
      <path d="M150 420 L250 420 L400 800 L0 800 Z" fill="url(#hw-road)" />
      {[...Array(7)].map((_, i) => {
        const t = i / 7;
        const y = 430 + t * 360;
        const w = 3 + t * 22;
        return <rect key={i} x={200 - w / 2} y={y} width={w} height={16 + t * 26} fill="#ffd23f" />;
      })}
    </Svg>
  );
}

function Forest() {
  return (
    <Svg>
      <defs>
        <linearGradient id="f-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe3c0" />
          <stop offset="1" stopColor="#e9f3d6" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#f-sky)" />
      <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="30">
        <line x1="120" y1="-20" x2="60" y2="500" />
        <line x1="220" y1="-20" x2="200" y2="520" />
      </g>
      {[
        { c: '#3f7d54', o: 0.8, off: 0 },
        { c: '#2f6b47', o: 0.95, off: 30 },
      ].map((layer, li) => (
        <g key={li} fill={layer.c} opacity={layer.o}>
          {[...Array(6)].map((_, i) => {
            const x = i * 75 + (li ? 30 : 0);
            const h = 300 * (li ? 0.8 : 1) + (i % 2) * 60;
            const base = 620 + layer.off;
            return (
              <g key={i}>
                <rect x={x - 8} y={base - 40} width="16" height="80" fill="#5b3d24" />
                <path d={`M${x} ${base - h} L${x - 60} ${base} L${x + 60} ${base} Z`} />
                <path d={`M${x} ${base - h - 40} L${x - 48} ${base - h + 80} L${x + 48} ${base - h + 80} Z`} />
              </g>
            );
          })}
        </g>
      ))}
      <rect y="640" width="400" height="160" fill="#5b7d3f" />
      <ellipse cx="90" cy="700" rx="60" ry="14" fill="#6f9150" />
      <ellipse cx="320" cy="740" rx="70" ry="16" fill="#6f9150" />
      <g fill="#fff6b0">
        {[...Array(7)].map((_, i) => (
          <circle
            key={i}
            className="animate-twinkle"
            style={{ animationDelay: `${(i % 5) * 0.5}s` }}
            cx={40 + i * 55}
            cy={520 + ((i * 47) % 120)}
            r="3"
          />
        ))}
      </g>
    </Svg>
  );
}

function Mountains() {
  return (
    <Svg>
      <defs>
        <linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a6ea5" />
          <stop offset="1" stopColor="#cfe8f5" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#m-sky)" />
      <circle cx="310" cy="120" r="40" fill="#fff4d6" opacity="0.9" />
      <Cloud x={120} y={130} s={0.8} delay="0s" dur="55s" opacity={0.85} />
      <Cloud x={280} y={90} s={0.6} delay="-30s" dur="55s" opacity={0.8} />
      <path d="M0 460 L110 300 L210 440 L300 320 L400 470 V800 H0 Z" fill="#6b86ad" />
      <path d="M0 560 L90 360 L180 540 L280 380 L400 560 V800 H0 Z" fill="#3f5c85" />
      <path d="M90 360 L60 420 L120 420 Z" fill="#eef6fb" />
      <path d="M280 380 L250 440 L312 440 Z" fill="#eef6fb" />
      <path d="M0 660 L140 520 L280 660 L400 580 V800 H0 Z" fill="#28405f" />
      {[40, 90, 340, 300].map((x, i) => (
        <path key={i} d={`M${x} 640 L${x - 16} 690 L${x + 16} 690 Z`} fill="#1c2f45" />
      ))}
      <ellipse cx="200" cy="740" rx="200" ry="40" fill="#5b8fb8" opacity="0.7" />
    </Svg>
  );
}

function Beach() {
  return (
    <Svg>
      <defs>
        <linearGradient id="be-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd89b" />
          <stop offset="1" stopColor="#ff9a8b" />
        </linearGradient>
        <linearGradient id="be-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2aa9c9" />
          <stop offset="1" stopColor="#7fd3d8" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#be-sky)" />
      <circle className="animate-glow-pulse" cx="200" cy="260" r="90" fill="#fff2c2" opacity="0.3" />
      <circle cx="200" cy="260" r="66" fill="#fff2c2" />
      <Cloud x={90} y={140} s={0.7} delay="0s" dur="55s" opacity={0.7} />
      <Cloud x={300} y={110} s={0.55} delay="-28s" dur="55s" opacity={0.65} />
      <rect y="360" width="400" height="240" fill="url(#be-sea)" />
      <g className="animate-wave-x" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3" fill="none">
        <path d="M-20 420 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0" />
        <path d="M-20 470 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0" />
        <path d="M-20 520 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0" />
      </g>
      <path d="M0 560 q200 -40 400 0 V800 H0 Z" fill="#f4dcae" />
      <path d="M64 640 q-10 -110 6 -170" stroke="#7a4b2b" strokeWidth="12" fill="none" strokeLinecap="round" />
      <g fill="#3f9d5a">
        <path d="M70 470 q-70 -18 -96 20 q54 -6 96 6 z" />
        <path d="M70 470 q70 -18 96 20 q-54 -6 -96 6 z" />
        <path d="M70 470 q-30 -70 -78 -78 q26 46 78 84 z" />
        <path d="M70 470 q30 -70 78 -78 q-26 46 -78 84 z" />
      </g>
      <circle cx="320" cy="690" r="22" fill="#ff6b6b" />
      <path d="M320 668 a22 22 0 0 1 0 44" fill="#fff" opacity="0.85" />
    </Svg>
  );
}

// ===================== new places ==========================================
function Cafe() {
  return (
    <Svg>
      <defs>
        <linearGradient id="cf-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3b2a" />
          <stop offset="1" stopColor="#7a5238" />
        </linearGradient>
        <radialGradient id="cf-bulb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe6a8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe6a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="800" fill="url(#cf-wall)" />
      {/* chalkboard menu */}
      <rect x="40" y="90" width="150" height="150" rx="8" fill="#243027" stroke="#3a2a1c" strokeWidth="8" />
      <g stroke="#e8e2d0" strokeWidth="4" strokeLinecap="round" opacity="0.8">
        <line x1="60" y1="120" x2="150" y2="120" />
        <line x1="60" y1="145" x2="130" y2="145" />
        <line x1="60" y1="170" x2="160" y2="170" />
        <line x1="60" y1="195" x2="120" y2="195" />
      </g>
      {/* pendant lights */}
      {[240, 300, 360].map((x) => (
        <g key={x}>
          <line x1={x} y1="60" x2={x} y2="120" stroke="#2a1c12" strokeWidth="3" />
          <path d={`M${x - 16} 120 h32 l-6 22 h-20 z`} fill="#caa15b" />
          <circle className="animate-glow-pulse" cx={x} cy="150" r="34" fill="url(#cf-bulb)" />
        </g>
      ))}
      {/* counter */}
      <rect y="470" width="400" height="30" fill="#3a2b22" />
      <rect y="500" width="400" height="300" fill="#8c5a3a" />
      <rect y="500" width="400" height="16" fill="#a06b45" />
      {/* espresso machine */}
      <rect x="250" y="400" width="110" height="70" rx="8" fill="#b0b6bd" />
      <rect x="262" y="412" width="86" height="30" rx="4" fill="#7c828c" />
      <rect x="290" y="442" width="30" height="20" fill="#5c6066" />
      {/* coffee cups + steam */}
      {[80, 150].map((x, i) => (
        <g key={x}>
          <rect x={x} y="440" width="40" height="30" rx="6" fill="#efe6d6" />
          <rect x={x + 40} y="446" width="12" height="14" rx="6" fill="none" stroke="#efe6d6" strokeWidth="4" />
          <ellipse
            className="animate-steam-rise"
            style={{ animationDelay: `${i}s` }}
            cx={x + 20}
            cy="432"
            rx="6"
            ry="9"
            fill="#fff"
            opacity="0"
          />
        </g>
      ))}
    </Svg>
  );
}

function Office() {
  return (
    <Svg>
      <defs>
        <linearGradient id="of-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4658" />
          <stop offset="1" stopColor="#556274" />
        </linearGradient>
        <radialGradient id="of-glow" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#8fd0ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#8fd0ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="800" fill="url(#of-wall)" />
      {/* window with skyline */}
      <rect x="220" y="80" width="150" height="170" rx="6" fill="#bfe0f5" stroke="#2a333f" strokeWidth="8" />
      <g fill="#8fb2cc">
        <rect x="232" y="170" width="24" height="72" />
        <rect x="262" y="140" width="26" height="102" />
        <rect x="296" y="185" width="22" height="57" />
        <rect x="324" y="150" width="30" height="92" />
      </g>
      <Cloud x={250} y={120} s={0.4} delay="0s" dur="70s" opacity={0.8} />
      {/* wall clock */}
      <circle cx="110" cy="130" r="34" fill="#eef2f5" stroke="#2a333f" strokeWidth="5" />
      <line x1="110" y1="130" x2="110" y2="110" stroke="#2a333f" strokeWidth="4" strokeLinecap="round" />
      <line x1="110" y1="130" x2="126" y2="138" stroke="#2a333f" strokeWidth="4" strokeLinecap="round" />
      {/* desk */}
      <rect y="520" width="400" height="30" fill="#6b4a32" />
      <rect y="550" width="400" height="250" fill="#4a3423" />
      {/* monitor */}
      <circle className="animate-tv-flicker" cx="150" cy="470" r="120" fill="url(#of-glow)" />
      <rect x="70" y="400" width="160" height="100" rx="6" fill="#101820" stroke="#000" strokeWidth="3" />
      <rect x="80" y="410" width="140" height="80" rx="3" fill="#1e6fb0" />
      <rect x="140" y="500" width="20" height="20" fill="#101820" />
      <rect x="120" y="520" width="60" height="6" rx="3" fill="#101820" />
      {/* chair */}
      <rect x="280" y="470" width="70" height="80" rx="10" fill="#2a333f" />
      <rect x="290" y="550" width="50" height="60" rx="6" fill="#1f262f" />
      {/* plant */}
      <rect x="20" y="480" width="34" height="44" rx="4" fill="#c47a4a" />
      <path d="M37 480 q-26 -50 -8 -80 q22 26 8 80 z" fill="#4f9b64" />
      <path d="M37 480 q28 -44 12 -78 q-26 28 -12 78 z" fill="#5fb075" />
    </Svg>
  );
}

function Library() {
  return (
    <Svg>
      <defs>
        <radialGradient id="lb-lamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe1a0" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffe1a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="800" fill="#5b3f2a" />
      {/* shelves */}
      {[70, 210, 350, 490].map((y) => (
        <g key={y}>
          <rect x="0" y={y} width="400" height="120" fill="#4a3221" />
          <rect x="0" y={y + 110} width="400" height="14" fill="#3a281a" />
          {[...Array(13)].map((_, i) => {
            const colors = ['#a8433a', '#3a6b8a', '#5a8a4a', '#c9a24a', '#7a4a8a', '#c96a3a'];
            const h = 70 + ((i * 13) % 30);
            return (
              <rect
                key={i}
                x={8 + i * 30}
                y={y + 110 - h}
                width={22}
                height={h}
                rx="2"
                fill={colors[(i + y) % colors.length]}
              />
            );
          })}
        </g>
      ))}
      {/* ladder */}
      <g stroke="#2e2015" strokeWidth="8">
        <line x1="300" y1="60" x2="300" y2="620" />
        <line x1="340" y1="60" x2="340" y2="620" />
        {[120, 220, 320, 420, 520].map((y) => (
          <line key={y} x1="300" y1={y} x2="340" y2={y} strokeWidth="6" />
        ))}
      </g>
      {/* reading nook */}
      <circle className="animate-glow-pulse" cx="90" cy="700" r="90" fill="url(#lb-lamp)" />
      <rect x="30" y="700" width="120" height="80" rx="16" fill="#7a4a3a" />
      <rect x="40" y="670" width="30" height="60" fill="#c9a24a" />
      <path d="M40 660 h30 l8 16 h-46 z" fill="#ffd77a" />
    </Svg>
  );
}

function Gym() {
  return (
    <Svg>
      <defs>
        <linearGradient id="gy-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2f36" />
          <stop offset="1" stopColor="#3c424b" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#gy-wall)" />
      {/* mirror */}
      <rect x="220" y="70" width="150" height="240" rx="6" fill="#4a5560" opacity="0.6" stroke="#20242a" strokeWidth="6" />
      <line x1="240" y1="90" x2="300" y2="90" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="8" />
      {/* rack */}
      <rect x="20" y="90" width="150" height="220" rx="6" fill="#20242a" />
      {[130, 190, 250].map((y) => (
        <g key={y}>
          <rect x="30" y={y} width="130" height="10" rx="5" fill="#4a5560" />
          <circle cx="45" cy={y + 5} r="16" fill="#c0392b" />
          <circle cx="145" cy={y + 5} r="16" fill="#c0392b" />
        </g>
      ))}
      {/* floor */}
      <rect y="560" width="400" height="240" fill="#20242a" />
      <g stroke="#2f353d" strokeWidth="2">
        {[...Array(6)].map((_, i) => (
          <line key={i} x1={i * 70} y1="560" x2={i * 70} y2="800" />
        ))}
      </g>
      {/* bench */}
      <rect x="60" y="520" width="200" height="24" rx="8" fill="#c0392b" />
      <rect x="70" y="544" width="16" height="50" fill="#3c424b" />
      <rect x="234" y="544" width="16" height="50" fill="#3c424b" />
      {/* dumbbells on floor */}
      <g fill="#4a5560">
        <rect x="290" y="600" width="70" height="12" rx="6" />
        <circle cx="290" cy="606" r="18" fill="#1b1e23" />
        <circle cx="360" cy="606" r="18" fill="#1b1e23" />
      </g>
      {/* kettlebell */}
      <circle cx="120" cy="640" r="26" fill="#1b1e23" />
      <path d="M104 626 q16 -26 32 0" fill="none" stroke="#4a5560" strokeWidth="8" />
    </Svg>
  );
}

function Space() {
  return (
    <Svg>
      <defs>
        <radialGradient id="sp-neb" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#3b1f6b" />
          <stop offset="0.5" stopColor="#160a2e" />
          <stop offset="1" stopColor="#05030f" />
        </radialGradient>
        <radialGradient id="sp-planet" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#7ad0ff" />
          <stop offset="1" stopColor="#2a4a8a" />
        </radialGradient>
      </defs>
      <rect width="400" height="800" fill="url(#sp-neb)" />
      <Stars count={40} w={400} h={800} />
      {/* planet with ring */}
      <ellipse cx="270" cy="200" rx="150" ry="34" fill="none" stroke="#b58cff" strokeWidth="10" opacity="0.6" />
      <circle cx="270" cy="200" r="72" fill="url(#sp-planet)" />
      <ellipse cx="270" cy="200" rx="150" ry="34" fill="none" stroke="#d7c2ff" strokeWidth="4" opacity="0.8" />
      {/* small moon */}
      <circle cx="90" cy="360" r="26" fill="#c9c2d6" />
      <circle cx="82" cy="352" r="6" fill="#a79fb8" />
      <circle cx="98" cy="366" r="4" fill="#a79fb8" />
      {/* rocket */}
      <g transform="translate(150 560) rotate(-20)">
        <path d="M0 0 q18 -60 0 -110 q-18 50 0 110 z" fill="#e6ebf2" />
        <circle cx="0" cy="-60" r="10" fill="#7ad0ff" />
        <path d="M-16 -6 l-14 26 l16 -8 z" fill="#c0392b" />
        <path d="M16 -6 l14 26 l-16 -8 z" fill="#c0392b" />
        <path className="animate-tv-flicker" d="M-8 4 q8 40 8 40 q0 0 8 -40 z" fill="#ffb14a" />
      </g>
    </Svg>
  );
}

function Rooftop() {
  return (
    <Svg>
      <defs>
        <linearGradient id="rf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e1a3a" />
          <stop offset="1" stopColor="#7b3f6b" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#rf-sky)" />
      <Stars count={16} w={400} h={260} />
      <circle cx="320" cy="90" r="26" fill="#fdf0c8" />
      {/* skyline */}
      <g fill="#1b1f3a">
        <rect x="0" y="300" width="70" height="200" />
        <rect x="70" y="240" width="60" height="260" />
        <rect x="140" y="320" width="55" height="180" />
        <rect x="205" y="270" width="60" height="230" />
        <rect x="275" y="330" width="55" height="170" />
        <rect x="330" y="290" width="70" height="210" />
      </g>
      <g fill="#ffd98a" opacity="0.85">
        {[...Array(18)].map((_, i) => (
          <rect key={i} x={12 + i * 21} y={330 + ((i * 29) % 120)} width="8" height="10" />
        ))}
      </g>
      {/* rooftop deck */}
      <rect y="560" width="400" height="240" fill="#2a2036" />
      <rect y="556" width="400" height="10" fill="#3a2e48" />
      {/* string lights */}
      <path d="M0 470 q100 40 200 6 q100 -34 200 6" fill="none" stroke="#5a4a3a" strokeWidth="2" />
      {[...Array(9)].map((_, i) => {
        const x = 20 + i * 45;
        const y = 476 + Math.sin(i) * 10 + (i % 2) * 6;
        return (
          <circle
            key={i}
            className="animate-twinkle"
            style={{ animationDelay: `${(i % 4) * 0.5}s` }}
            cx={x}
            cy={y}
            r="5"
            fill="#ffe08a"
          />
        );
      })}
      {/* plants + railing */}
      <rect x="20" y="600" width="40" height="50" rx="4" fill="#7a4a3a" />
      <path d="M40 600 q-24 -50 -6 -84 q20 28 6 84 z" fill="#4f9b64" />
      <path d="M40 600 q26 -44 10 -80 q-24 26 -10 80 z" fill="#5fb075" />
      <g stroke="#4a4056" strokeWidth="5">
        <line x1="300" y1="600" x2="300" y2="660" />
        <line x1="340" y1="600" x2="340" y2="660" />
        <line x1="380" y1="600" x2="380" y2="660" />
        <line x1="290" y1="605" x2="390" y2="605" />
      </g>
    </Svg>
  );
}

function RainScene() {
  return (
    <Svg>
      <defs>
        <linearGradient id="rn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4658" />
          <stop offset="1" stopColor="#6b7a8c" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#rn-sky)" />
      {/* clouds */}
      <Cloud x={90} y={120} s={1} delay="0s" dur="50s" fill="#8a97a8" opacity={0.9} />
      <Cloud x={280} y={90} s={0.8} delay="-22s" dur="50s" fill="#78889a" opacity={0.9} />
      <Cloud x={200} y={170} s={0.9} delay="-38s" dur="50s" fill="#9aa7b8" opacity={0.85} />
      {/* rain */}
      <Rain color="#cddcec" count={34} />
      {/* wet street */}
      <rect y="620" width="400" height="180" fill="#2c3440" />
      <ellipse cx="120" cy="700" rx="80" ry="14" fill="#3d4a5a" opacity="0.7" />
      <ellipse cx="300" cy="740" rx="90" ry="16" fill="#3d4a5a" opacity="0.7" />
      {/* puddle ripples */}
      <g fill="none" stroke="#5a6a7c" strokeWidth="2" opacity="0.6">
        <circle className="animate-glow-pulse" cx="120" cy="700" r="18" />
        <circle className="animate-glow-pulse" style={{ animationDelay: '1s' }} cx="300" cy="740" r="20" />
      </g>
    </Svg>
  );
}

function SnowScene() {
  return (
    <Svg>
      <defs>
        <linearGradient id="sn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a6a8f" />
          <stop offset="1" stopColor="#bcd4e6" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#sn-sky)" />
      <circle cx="90" cy="110" r="34" fill="#fff8e0" opacity="0.9" />
      {/* snowy hills */}
      <path d="M0 560 q120 -70 220 -10 q100 50 180 -6 V800 H0 Z" fill="#e8f2fa" />
      <path d="M0 640 q140 -50 260 10 q80 30 140 -6 V800 H0 Z" fill="#ffffff" />
      {/* pines with snow */}
      {[60, 130, 320, 360].map((x, i) => (
        <g key={i}>
          <rect x={x - 5} y="600" width="10" height="40" fill="#5b3d24" />
          <path d={`M${x} 500 L${x - 34} 610 L${x + 34} 610 Z`} fill="#2f6b47" />
          <path d={`M${x} 470 L${x - 26} 560 L${x + 26} 560 Z`} fill="#3f7d54" />
          <path d={`M${x} 470 L${x - 12} 505 L${x + 12} 505 Z`} fill="#eaf5ff" opacity="0.9" />
        </g>
      ))}
      {/* falling snow */}
      <Snow count={30} />
    </Svg>
  );
}

// ===========================================================================
const SCENES: Record<string, () => JSX.Element> = {
  bedroom: Bedroom,
  bathroom: Bathroom,
  kitchen: Kitchen,
  lounge: Lounge,
  garage: Garage,
  street: Street,
  highway: Highway,
  forest: Forest,
  mountains: Mountains,
  beach: Beach,
  cafe: Cafe,
  office: Office,
  library: Library,
  gym: Gym,
  space: Space,
  rooftop: Rooftop,
  rain: RainScene,
  snow: SnowScene,
};

export function hasScene(scene?: string | null): boolean {
  return !!scene && scene in SCENES;
}

export default function PlaceScene({ scene, dark }: Props) {
  const Comp = SCENES[scene];
  if (!Comp) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Comp />
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? 'linear-gradient(180deg, rgba(6,8,18,0.55) 0%, rgba(6,8,18,0.68) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.28) 100%)',
        }}
      />
    </div>
  );
}
