'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { MouthCue } from '@/lib/lipsync/rhubarb';

type Props = {
  persona?: string;
  audioEl: HTMLAudioElement | null;
  isSpeaking: boolean;
  mouthCues?: MouthCue[];
};

const AVATAR_SRC: Record<string, string> = {
  calm: '/avatars/calm.png',
  anxious: '/avatars/anxious.png',
  impatient: '/avatars/impatient.png',
  aggressive: '/avatars/aggressive.png',
  slangy: '/avatars/slangy.png',
  elderly: '/avatars/elderly.png',
  corporate: '/avatars/corporate.png',
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export function TalkingPortrait({ persona, audioEl, isSpeaking, mouthCues }: Props) {
  const key = (persona || 'calm').toLowerCase().trim();
  const src = AVATAR_SRC[key] || AVATAR_SRC.calm;

  const [mouthOpen, setMouthOpen] = useState(0);
  const [headBob, setHeadBob] = useState(0);
  const [handPhase, setHandPhase] = useState(0);
  const cueIndexRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceLinkedRef = useRef<HTMLAudioElement | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothRef = useRef(0);

  // Persona-driven micro settings
  const personaSettings = {
    tilt: key === 'slangy' ? -4 : key === 'aggressive' ? -1 : 0,
    mouthWideBoost: key === 'aggressive' ? 0.18 : 0,
  };

  // Attach analyser once per audio element
  useEffect(() => {
    if (!audioEl) return;
    if (sourceLinkedRef.current === audioEl) return;
    try {
      const ctx = ctxRef.current || new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.55;
      const source = ctx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount * 2);
      sourceLinkedRef.current = audioEl;
    } catch (e) {
      // createMediaElementSource may throw if attached twice; ignore silently.
      sourceLinkedRef.current = audioEl;
    }
  }, [audioEl]);

  // Lip-sync loop
  useEffect(() => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!audioEl || !analyser || !data) return;

    const tick = () => {
      if (!analyserRef.current || !dataRef.current) return;
      const nowSpeaking = isSpeaking && !audioEl.paused;

      // Prefer Rhubarb mouth cues if available
      let open = 0;
      if (nowSpeaking && Array.isArray(mouthCues) && mouthCues.length > 0) {
        const t = audioEl.currentTime;
        let idx = cueIndexRef.current;
        if (idx >= mouthCues.length || t < mouthCues[idx].start) idx = 0;
        while (idx + 1 < mouthCues.length && mouthCues[idx + 1].start <= t) idx++;
        cueIndexRef.current = idx;
        const cue = mouthCues[idx];
        const shapes: Record<string, number> = {
          A: 0.05,
          B: 0.18,
          C: 0.35,
          D: 0.65,
          E: 0.45,
          F: 0.55,
          G: 0.25,
          H: 0.8,
          X: 0.05,
        };
        open = shapes[cue?.value] ?? 0.1;
        setMouthOpen((prev) => prev * 0.5 + open * 0.5);
      } else {
        // amplitude fallback
        if (nowSpeaking) {
          if (dataRef.current) {
            analyserRef.current.getByteTimeDomainData(dataRef.current as any);
            let sum = 0;
            for (let i = 0; i < dataRef.current.length; i++) {
              const v = (dataRef.current[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / dataRef.current.length);
            smoothRef.current = smoothRef.current * 0.8 + rms * 0.2;
          }
        } else {
          smoothRef.current = smoothRef.current * 0.82;
        }
        open = clamp((smoothRef.current - 0.02) / 0.12, 0, 1);
        const eased = clamp(open * 1.2 + personaSettings.mouthWideBoost, 0, 1.2);
        setMouthOpen((prev) => prev * 0.6 + eased * 0.4);
      }

      setHeadBob(Math.sin(performance.now() / 320) * 0.5 + open * 4);
      setHandPhase(performance.now());
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioEl, isSpeaking, personaSettings.mouthWideBoost, mouthCues]);

  const handOffset = Math.sin(handPhase / 420) * 6 + (isSpeaking ? mouthOpen * 12 : 0);
  const handOffsetY = Math.cos(handPhase / 530) * 4 + (isSpeaking ? 4 : 0);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-white" />
      <div className="relative flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>Client Avatar (Mock)</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">{key}</span>
        </div>
        <div
          className="relative mx-auto h-80 w-72 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-md transition-transform duration-150"
          style={{
            transform: `translateY(${headBob}px) rotate(${personaSettings.tilt}deg)`,
          }}
        >
          <Image src={src} alt={key} fill priority className="object-cover object-top" />

          {/* Subtle jaw shadow for lip motion (neutral tone) */}
          <div
            className="pointer-events-none absolute left-1/2 bottom-[24%] h-4 w-16 -translate-x-1/2 rounded-full bg-black/12 backdrop-blur-[1px] transition-transform duration-90 ease-out"
            style={{
              transform: `translateX(-50%) translateY(${mouthOpen * 8}px) scaleX(${1 + mouthOpen * 0.15}) scaleY(${0.4 + mouthOpen})`,
            }}
          />

          {/* Gesture blobs to hint hand movement */}
          <div
            className="pointer-events-none absolute bottom-[16%] left-[18%] h-10 w-16 rounded-full bg-white/65 blur-sm transition-transform duration-150"
            style={{ transform: `translate(${handOffset}px, ${handOffsetY}px) rotate(-6deg)` }}
          />
          <div
            className="pointer-events-none absolute bottom-[12%] right-[14%] h-10 w-16 rounded-full bg-white/55 blur-sm transition-transform duration-150"
            style={{ transform: `translate(${-handOffset}px, ${handOffsetY - 2}px) rotate(8deg)` }}
          />
        </div>
      </div>
    </div>
  );
}
