import { useEffect, useRef, useState } from 'react';
import { formatClock } from '../utils/format';

interface Props {
  src: string;
  durationMs: number | null;
  mine: boolean;
}

// Compact voice-note player: play/pause, a scrub-free progress bar and a live
// time readout. Uses a single <audio> element driven imperatively.
export default function VoiceNote({ src, durationMs, mine }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(durationMs ? durationMs / 1000 : 0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => {
      // Some browsers report Infinity for MediaRecorder blobs until seeked.
      if (isFinite(a.duration) && a.duration > 0) setTotal(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const label = playing || current > 0 ? formatClock(current * 1000) : formatClock(total * 1000);
  const accent = mine ? 'bg-white/80' : 'bg-brand-500';
  const track = mine ? 'bg-white/25' : 'bg-slate-300 dark:bg-white/15';
  const btn = mine
    ? 'bg-white/20 text-white'
    : 'bg-brand-500/10 text-brand-600 dark:text-brand-300';

  return (
    <div className="flex min-w-[168px] items-center gap-2.5 py-0.5">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition active:scale-90 ${btn}`}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1">
        <div className={`h-1.5 w-full overflow-hidden rounded-full ${track}`}>
          <div className={`h-full rounded-full ${accent}`} style={{ width: `${pct}%` }} />
        </div>
        <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? 'text-white/80' : 'text-slate-400'}`}>
          <span>🎤</span>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
