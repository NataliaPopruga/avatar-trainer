'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface MouthCue {
  start: number;
  end: number;
  value: string;
}

interface Props {
  avatarUrl: string; // kept for compatibility, not used now
  audioSrc?: string;
  mouthCues?: MouthCue[];
  speaking?: boolean;
}

// Simple audio visualizer: animated bars driven by analyser or speaking flag
export function LipSyncAvatar({ audioSrc, mouthCues = [], speaking = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [levels, setLevels] = useState<number[]>(() => Array(12).fill(2));
  const [playing, setPlaying] = useState(false);

  // Drive levels from audio or mouth cues
  useEffect(() => {
    if (!audioSrc) return;
    const audio = new Audio(audioSrc);
    audio.playbackRate = 0.92;
    audioRef.current = audio;
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    let raf: number;
    const loop = () => {
      if (!audioRef.current) return;
      const t = audioRef.current.currentTime;
      const cue = mouthCues.find((c) => t >= c.start && t <= c.end);

      if (cue) {
        const amp = Math.min(100, (cue.value.charCodeAt(0) % 10) * 10);
        setLevels((prev) => prev.map((_, i) => (i % 3 === 0 ? amp : Math.max(6, amp - i * 2))));
      } else if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(data);
        const amp = data.reduce((a, b) => a + Math.abs(b - 128), 0) / data.length;
        setLevels((_) => Array(12).fill(0).map((__, i) => Math.min(100, amp * (0.6 + i * 0.02))));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onEnd = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('play', onPlay);
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('play', onPlay);
      cancelAnimationFrame(raf);
      analyser.disconnect();
      source.disconnect();
      ctx.close();
    };
  }, [audioSrc, mouthCues]);

  // Idle speaking animation when no audioSrc (browser TTS path)
  useEffect(() => {
    if (audioSrc) return;
    if (!speaking) {
      setLevels(Array(12).fill(2));
      setPlaying(false);
      return;
    }
    setPlaying(true);
    const timer = setInterval(() => {
      setLevels((prev) =>
        prev.map(() => Math.max(4, 8 + Math.random() * 70))
      );
    }, 140);
    return () => {
      clearInterval(timer);
      setLevels(Array(12).fill(2));
      setPlaying(false);
    };
  }, [audioSrc, speaking]);

  const bobClass = playing ? 'animate-[bob_1.8s_ease-in-out_infinite]' : '';

  const bars = useMemo(
    () =>
      levels.map((h, idx) => ({
        height: Math.max(6, Math.min(100, h)),
        delay: `${(idx % 6) * 40}ms`,
      })),
    [levels]
  );

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white" />
      <div className={cn('relative p-8 transition-transform', bobClass)}>
        <div className="mx-auto flex h-48 w-full max-w-xs items-end justify-between gap-1">
          {bars.map((bar, i) => (
            <span
              key={i}
              className="block w-[10%] rounded-full bg-gradient-to-t from-brand-500 via-brand-400 to-brand-300"
              style={{
                height: `${bar.height}%`,
                transition: 'height 120ms ease',
                animation: playing ? `pulse 1.2s ease-in-out infinite` : undefined,
                animationDelay: bar.delay,
              }}
            />
          ))}
        </div>
        <p className="mt-4 text-center text-xs uppercase tracking-wide text-slate-500">Голос клиента</p>
      </div>
      <style jsx global>{`
        @keyframes bob { 0% { transform: translateY(0); } 50% { transform: translateY(-4px); } 100% { transform: translateY(0); } }
        @keyframes pulse { 0% { opacity: 0.9; } 50% { opacity: 0.5; } 100% { opacity: 0.9; } }
      `}</style>
    </div>
  );
}
