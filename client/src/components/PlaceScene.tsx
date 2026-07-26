// High-quality, self-contained SVG "place" scenes used as chat backgrounds.
// Each scene is a layered flat illustration (gradients + silhouettes) sized to
// cover the chat area. A dusk/night dim is applied in dark mode. No external
// images, so it stays crisp at any size and adds nothing to network load.

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

// ---------------------------------------------------------------------------
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
      </defs>
      <rect width="400" height="800" fill="url(#bd-wall)" />
      {/* window with night sky + moon */}
      <rect x="228" y="70" width="150" height="200" rx="8" fill="url(#bd-sky)" />
      <circle cx="330" cy="120" r="20" fill="#fef3d0" />
      <circle cx="322" cy="114" r="18" fill="url(#bd-sky)" />
      {[...Array(12)].map((_, i) => (
        <circle key={i} cx={245 + ((i * 37) % 120)} cy={90 + ((i * 53) % 150)} r={1.4} fill="#fff" opacity="0.8" />
      ))}
      <rect x="222" y="64" width="162" height="212" rx="10" fill="none" stroke="#2a1e3a" strokeWidth="8" />
      <line x1="303" y1="70" x2="303" y2="270" stroke="#2a1e3a" strokeWidth="6" />
      {/* floor */}
      <rect y="600" width="400" height="200" fill="#3a2a1e" />
      {/* bed */}
      <rect x="-10" y="560" width="250" height="60" rx="10" fill="#5b4636" />
      <rect x="-10" y="470" width="250" height="110" rx="16" fill="#e8e2f0" />
      <rect x="-10" y="470" width="250" height="60" rx="16" fill="#f5f1fb" />
      <rect x="10" y="486" width="90" height="46" rx="12" fill="#fff" />
      <rect x="110" y="486" width="90" height="46" rx="12" fill="#f0d0dc" />
      <path d="M-10 520 h250 v60 a16 16 0 0 1 -16 16 h-218 a16 16 0 0 1 -16 -16 z" fill="#b56d8c" />
      {/* nightstand + lamp */}
      <circle cx="300" cy="470" r="120" fill="url(#bd-lamp)" />
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
      {/* tiles */}
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2">
        {[...Array(9)].map((_, r) => (
          <line key={`h${r}`} x1="0" y1={r * 60} x2="400" y2={r * 60} />
        ))}
        {[...Array(8)].map((_, c) => (
          <line key={`v${c}`} x1={c * 57} y1="0" x2={c * 57} y2="540" />
        ))}
      </g>
      {/* floor */}
      <rect y="540" width="400" height="260" fill="#cfe7ec" />
      <g stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2">
        {[...Array(6)].map((_, i) => (
          <line key={i} x1={i * 80} y1="540" x2={i * 80 + 40} y2="800" />
        ))}
      </g>
      {/* bathtub */}
      <rect x="30" y="470" width="250" height="120" rx="52" fill="#ffffff" />
      <rect x="46" y="486" width="218" height="88" rx="40" fill="#dff3fb" />
      <ellipse cx="155" cy="520" rx="90" ry="18" fill="#bfe6f5" />
      {/* faucet + shower */}
      <rect x="300" y="120" width="14" height="150" rx="6" fill="#9fb6bd" />
      <circle cx="307" cy="110" r="26" fill="#cdd9dc" />
      <circle cx="307" cy="110" r="18" fill="#eef4f5" />
      {[...Array(5)].map((_, i) => (
        <line key={i} x1={293 + i * 7} y1="128" x2={289 + i * 7} y2="230" stroke="#bfe6f5" strokeWidth="3" strokeLinecap="round" />
      ))}
      {/* mirror + plant */}
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
      {/* upper cabinets */}
      <rect y="60" width="400" height="150" fill="#8c5a3a" />
      {[40, 150, 260].map((x) => (
        <rect key={x} x={x} y="74" width="96" height="122" rx="6" fill="#a06b45" stroke="#7a4c30" strokeWidth="3" />
      ))}
      {/* backsplash tiles */}
      <g fill="#fff5e6">
        {[...Array(10)].map((_, i) => (
          <rect key={i} x={(i % 5) * 82 + 6} y={220 + Math.floor(i / 5) * 40} width="74" height="32" rx="4" />
        ))}
      </g>
      {/* counter */}
      <rect y="470" width="400" height="30" fill="#3a2b22" />
      <rect y="500" width="400" height="300" fill="#b07a4f" />
      {[70, 200, 330].map((x) => (
        <rect key={x} x={x} y="510" width="60" height="90" rx="6" fill="#96633c" stroke="#7a4c30" strokeWidth="3" />
      ))}
      {/* pot + stove */}
      <rect x="150" y="430" width="100" height="44" rx="8" fill="#4b4b52" />
      <ellipse cx="200" cy="430" rx="46" ry="12" fill="#5c5c66" />
      <path d="M180 420 q20 -26 40 0 z" fill="#d9d9de" opacity="0.6" />
      {/* window with herbs */}
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
      <circle cx="200" cy="220" r="220" fill="url(#tv-glow)" />
      {/* TV */}
      <rect x="70" y="110" width="260" height="150" rx="10" fill="#0a0d1a" stroke="#000" strokeWidth="4" />
      <rect x="82" y="122" width="236" height="126" rx="4" fill="#2b6fd6" />
      <rect x="82" y="122" width="236" height="126" rx="4" fill="url(#tv-glow)" />
      <rect x="180" y="260" width="40" height="26" fill="#0a0d1a" />
      <rect x="150" y="286" width="100" height="8" rx="4" fill="#0a0d1a" />
      {/* console */}
      <rect y="300" width="400" height="40" rx="6" fill="#2a2036" />
      {/* floor */}
      <rect y="560" width="400" height="240" fill="#241a2e" />
      {/* sofa */}
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
      {/* garage door panels */}
      <g fill="#7c828c" stroke="#565b63" strokeWidth="3">
        {[...Array(4)].map((_, r) => (
          <rect key={r} x="20" y={90 + r * 70} width="360" height="60" rx="4" />
        ))}
      </g>
      {/* pegboard tools */}
      <g stroke="#d7a13a" strokeWidth="6" strokeLinecap="round">
        <line x1="40" y1="60" x2="70" y2="30" />
        <line x1="90" y1="55" x2="90" y2="20" />
      </g>
      {/* floor */}
      <rect y="560" width="400" height="240" fill="#3a3f45" />
      <line x1="0" y1="560" x2="400" y2="560" stroke="#ffd23f" strokeWidth="5" strokeDasharray="24 16" />
      {/* car */}
      <rect x="40" y="470" width="320" height="70" rx="24" fill="#c0392b" />
      <path d="M100 470 q30 -50 100 -50 q70 0 100 50 z" fill="#e05545" />
      <rect x="120" y="432" width="160" height="42" rx="14" fill="#bfe3ff" opacity="0.85" />
      <circle cx="120" cy="545" r="34" fill="#1b1b1f" />
      <circle cx="120" cy="545" r="15" fill="#9aa0a6" />
      <circle cx="290" cy="545" r="34" fill="#1b1b1f" />
      <circle cx="290" cy="545" r="15" fill="#9aa0a6" />
      <circle cx="352" cy="500" r="9" fill="#ffe9a8" />
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
      {/* buildings */}
      {[
        { x: 0, y: 220, w: 90, h: 380, c: '#2b2450' },
        { x: 95, y: 150, w: 80, h: 450, c: '#332a5c' },
        { x: 180, y: 260, w: 70, h: 340, c: '#2b2450' },
        { x: 255, y: 120, w: 70, h: 480, c: '#3a3068' },
        { x: 330, y: 210, w: 80, h: 390, c: '#2b2450' },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} />
          {[...Array(24)].map((_, k) => (
            <rect
              key={k}
              x={b.x + 10 + (k % 3) * 24}
              y={b.y + 16 + Math.floor(k / 3) * 40}
              width="12"
              height="18"
              fill={(k * 7 + i * 13) % 10 > 4 ? '#ffe08a' : '#3d3566'}
            />
          ))}
        </g>
      ))}
      {/* road */}
      <rect y="600" width="400" height="200" fill="#2a2a30" />
      <rect y="600" width="400" height="10" fill="#4a4a52" />
      <line x1="200" y1="620" x2="200" y2="800" stroke="#ffd23f" strokeWidth="6" strokeDasharray="26 22" />
      {/* street lamp */}
      <rect x="60" y="470" width="8" height="140" fill="#1b1b22" />
      <path d="M64 470 h60" stroke="#1b1b22" strokeWidth="8" />
      <circle cx="124" cy="474" r="10" fill="#ffe08a" />
      <circle cx="124" cy="474" r="26" fill="#ffe08a" opacity="0.25" />
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
      {/* distant hills */}
      <path d="M0 420 q100 -50 200 -10 q100 40 200 -6 v40 H0 z" fill="#b64f5a" opacity="0.6" />
      {/* road converging to horizon */}
      <path d="M150 420 L250 420 L400 800 L0 800 Z" fill="url(#hw-road)" />
      {[...Array(7)].map((_, i) => {
        const t = i / 7;
        const y = 430 + t * 360;
        const w = 3 + t * 22;
        return <rect key={i} x={200 - w / 2} y={y} width={w} height={16 + t * 26} fill="#ffd23f" />;
      })}
      {/* guard posts */}
      {[...Array(5)].map((_, i) => {
        const t = i / 5;
        const y = 440 + t * 340;
        const x = 150 - t * 130;
        return <rect key={i} x={x} y={y} width={4 + t * 6} height={20 + t * 30} fill="#d8d8dc" />;
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
      {/* sun rays */}
      <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="30">
        <line x1="120" y1="-20" x2="60" y2="500" />
        <line x1="220" y1="-20" x2="200" y2="520" />
      </g>
      {/* layered trees */}
      {[
        { c: '#3f7d54', s: 1 },
        { c: '#2f6b47', s: 0.8 },
      ].map((layer, li) => (
        <g key={li} fill={layer.c} opacity={li ? 0.95 : 0.8}>
          {[...Array(6)].map((_, i) => {
            const x = i * 75 + (li ? 30 : 0);
            const h = 300 * layer.s + (i % 2) * 60;
            const base = 620 + li * 30;
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
      {/* ground */}
      <rect y="640" width="400" height="160" fill="#5b7d3f" />
      <ellipse cx="90" cy="700" rx="60" ry="14" fill="#6f9150" />
      <ellipse cx="320" cy="740" rx="70" ry="16" fill="#6f9150" />
      {/* fireflies */}
      {[...Array(6)].map((_, i) => (
        <circle key={i} cx={40 + i * 60} cy={520 + ((i * 47) % 120)} r="3" fill="#fff6b0" opacity="0.8" />
      ))}
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
      {/* back range */}
      <path d="M0 460 L110 300 L210 440 L300 320 L400 470 V800 H0 Z" fill="#6b86ad" />
      {/* mid range with snow caps */}
      <path d="M0 560 L90 360 L180 540 L280 380 L400 560 V800 H0 Z" fill="#3f5c85" />
      <path d="M90 360 L60 420 L120 420 Z" fill="#eef6fb" />
      <path d="M280 380 L250 440 L312 440 Z" fill="#eef6fb" />
      {/* front hills */}
      <path d="M0 660 L140 520 L280 660 L400 580 V800 H0 Z" fill="#28405f" />
      {/* pines */}
      {[40, 90, 340, 300].map((x, i) => (
        <path key={i} d={`M${x} 640 L${x - 16} 690 L${x + 16} 690 Z`} fill="#1c2f45" />
      ))}
      {/* lake */}
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
      <circle cx="200" cy="260" r="66" fill="#fff2c2" />
      <circle cx="200" cy="260" r="90" fill="#fff2c2" opacity="0.3" />
      {/* sea */}
      <rect y="360" width="400" height="240" fill="url(#be-sea)" />
      <g stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3" fill="none">
        <path d="M0 420 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0" />
        <path d="M0 470 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0" />
        <path d="M0 520 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0" />
      </g>
      {/* sand */}
      <path d="M0 560 q200 -40 400 0 V800 H0 Z" fill="#f4dcae" />
      {/* palm */}
      <path d="M64 640 q-10 -110 6 -170" stroke="#7a4b2b" strokeWidth="12" fill="none" strokeLinecap="round" />
      <g fill="#3f9d5a">
        <path d="M70 470 q-70 -18 -96 20 q54 -6 96 6 z" />
        <path d="M70 470 q70 -18 96 20 q-54 -6 -96 6 z" />
        <path d="M70 470 q-30 -70 -78 -78 q26 46 78 84 z" />
        <path d="M70 470 q30 -70 78 -78 q-26 46 -78 84 z" />
      </g>
      {/* starfish + ball */}
      <circle cx="320" cy="690" r="22" fill="#ff6b6b" />
      <path d="M320 668 a22 22 0 0 1 0 44" fill="#fff" opacity="0.85" />
    </Svg>
  );
}

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
      {/* readability + dusk/night dim */}
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
