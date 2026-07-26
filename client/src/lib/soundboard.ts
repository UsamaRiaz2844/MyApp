// A tiny soundboard synthesized with the Web Audio API — no audio files, so it
// costs nothing in the bundle. Sounds play locally and are broadcast so both
// phones hear them (best-effort; the receiver must have interacted with the page,
// which they have if the chat is open).

let ctx: AudioContext | null = null;
function ac(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.2) {
  const c = ac();
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(start: number, dur: number, gain = 0.2, freq = 1000, highpass = false) {
  const c = ac();
  const t0 = c.currentTime + start;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = highpass ? 'highpass' : 'lowpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

const PLAYERS: Record<string, () => void> = {
  airhorn() {
    for (const s of [0, 0.22, 0.44]) {
      tone(233, s, 0.18, 'sawtooth', 0.22);
      tone(311, s, 0.18, 'sawtooth', 0.15);
    }
  },
  rimshot() {
    tone(200, 0, 0.12, 'sine', 0.3);
    tone(150, 0.13, 0.12, 'sine', 0.3);
    noise(0.28, 0.5, 0.18, 6000, true); // tss
  },
  applause() {
    for (let i = 0; i < 22; i++) noise(Math.random() * 1.1, 0.05, 0.06, 5000, true);
  },
  ding() {
    tone(1046, 0, 0.5, 'sine', 0.3);
    tone(1568, 0, 0.4, 'sine', 0.12);
  },
  boo() {
    tone(160, 0, 0.7, 'sawtooth', 0.22);
    tone(120, 0.1, 0.7, 'sawtooth', 0.18);
  },
  drumroll() {
    for (let i = 0; i < 18; i++) noise(i * 0.05, 0.05, 0.14, 2500);
    noise(0.95, 0.4, 0.2, 6000, true);
  },
  bruh() {
    tone(196, 0, 0.35, 'square', 0.18);
    tone(147, 0.18, 0.4, 'square', 0.18);
  },
};

export interface Sound {
  id: string;
  label: string;
  emoji: string;
}
export const SOUNDS: Sound[] = [
  { id: 'airhorn', label: 'Airhorn', emoji: '📣' },
  { id: 'rimshot', label: 'Ba-dum-tss', emoji: '🥁' },
  { id: 'applause', label: 'Applause', emoji: '👏' },
  { id: 'ding', label: 'Ding', emoji: '🔔' },
  { id: 'boo', label: 'Boo', emoji: '👎' },
  { id: 'drumroll', label: 'Drumroll', emoji: '🥁' },
  { id: 'bruh', label: 'Bruh', emoji: '💀' },
];

export function playSound(id: string) {
  try {
    PLAYERS[id]?.();
  } catch {
    /* audio not available */
  }
}
