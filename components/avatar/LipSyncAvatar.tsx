'use client';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const MOUTH_SHAPES: Record<string, { width: number; height: number; ry: number }> = {
  A: { width: 110, height: 34, ry: 16 },
  B: { width: 120, height: 60, ry: 26 },
  C: { width: 90, height: 22, ry: 10 },
  D: { width: 110, height: 48, ry: 22 },
  E: { width: 80, height: 18, ry: 8 },
  F: { width: 70, height: 14, ry: 6 },
  G: { width: 95, height: 36, ry: 16 },
  H: { width: 100, height: 40, ry: 20 },
  X: { width: 0, height: 0, ry: 0 },
};

export interface MouthCue {
  start: number;
  end: number;
  value: string;
}

interface Props {
  avatarUrl: string;
  audioSrc?: string;
  mouthCues?: MouthCue[];
}

export function LipSyncAvatar({ avatarUrl, audioSrc, mouthCues = [] }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [viseme, setViseme] = useState<string>('X');
  const [playing, setPlaying] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioSrc) return;
    const audio = new Audio(audioSrc);
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
        setViseme(cue.value);
      } else if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(data);
        const amp = data.reduce((a, b) => a + Math.abs(b - 128), 0) / data.length;
        setViseme(amp > 8 ? 'D' : 'X');
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

  const mouthShape = useMemo(() => {
    return MOUTH_SHAPES[viseme] || MOUTH_SHAPES['X'];
  }, [viseme]);

  const bobClass = playing ? 'animate-[bob_1.6s_ease-in-out_infinite]' : '';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-100/40 via-white to-white" />
      <div className={cn('relative p-6 transition-transform', bobClass)}>
        <Image
          src={avatarUrl}
          alt="avatar"
          width={320}
          height={380}
          className="mx-auto h-80 w-72 rounded-3xl object-cover"
        />
        <svg className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-72 -translate-x-1/2 -translate-y-1/2" viewBox="0 0 320 380">
          {mouthShape.width > 0 && (
            <ellipse
              cx="160"
              cy="240"
              rx={mouthShape.width / 2}
              ry={mouthShape.height / 2}
              fill="#e75c74"
              opacity="0.92"
            />
          )}
          <rect x="120" y="90" width="80" height="20" rx="10" fill="#000" opacity="0.08">
            <animate attributeName="opacity" values="0.08;0;0.08" dur="6s" repeatCount="indefinite" />
          </rect>
        </svg>
      </div>
      <style jsx global>{`
        @keyframes bob { 0% { transform: translateY(0); } 50% { transform: translateY(-6px); } 100% { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
