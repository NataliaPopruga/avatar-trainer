'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  avatarUrl: string;
  speechText?: string;
  personaLabel?: string;
};

// Simple mock lip-sync driver that ties mouth motion to the browser SpeechSynthesis lifecycle.
export function MockAvatarClient({ avatarUrl, speechText, personaLabel }: Props) {
  const [muted, setMuted] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [mouthValue, setMouthValue] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const mouthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopMouthLoop = useCallback(() => {
    if (mouthTimerRef.current) {
      clearInterval(mouthTimerRef.current);
      mouthTimerRef.current = null;
    }
    setMouthValue(0);
  }, []);

  const startMouthLoop = useCallback(() => {
    stopMouthLoop();
    mouthTimerRef.current = setInterval(() => {
      setMouthValue(() => 0.35 + Math.random() * 0.55);
    }, 120);
  }, [stopMouthLoop]);

  const stopSpeech = useCallback(() => {
    stopMouthLoop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsTalking(false);
  }, [stopMouthLoop]);

  // Kick off speech + mouth animation whenever client text changes.
  useEffect(() => {
    if (!speechText || muted) {
      stopSpeech();
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'ru-RU';
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsTalking(true);
      startMouthLoop();
    };

    utterance.onboundary = () => {
      // On every word boundary briefly spike the mouth openness for a more lively effect.
      setMouthValue(0.9);
    };

    utterance.onend = () => {
      setIsTalking(false);
      stopMouthLoop();
      setMouthValue(0);
    };

    utterance.onerror = () => {
      setIsTalking(false);
      stopMouthLoop();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => stopSpeech();
  }, [speechText, muted, startMouthLoop, stopSpeech, stopMouthLoop]);

  // Gentle random blinking loop independent from speech.
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2400 + Math.random() * 2200;
      blinkTimerRef.current = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 140);
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-white" />
      <div className="relative flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>Клиент · {personaLabel || 'persona'}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">Mock avatar</span>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="relative h-56 w-56">
            <Image src={avatarUrl} alt="avatar" fill priority className="rounded-2xl object-cover shadow-md" />

            {/* Subtle face tint for depth */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent via-white/5 to-slate-900/5 mix-blend-soft-light" />

            {/* Eyes blink overlay */}
            <div
              className={cn('absolute left-1/2 top-[34%] h-2 w-16 -translate-x-1/2 rounded-full bg-slate-800/80 transition-all duration-100', {
                'scale-y-0': !blinking,
                'scale-y-100': blinking,
              })}
            />

            {/* Mouth / lip-sync overlay (neutral tint, no red) */}
            <div
              className="absolute left-1/2 top-[68%] h-5 w-16 -translate-x-1/2 rounded-full bg-black/18 shadow-md transition-transform duration-120 ease-out"
              style={{ transform: `translateX(-50%) scaleX(${1 + mouthValue * 0.35}) scaleY(${0.4 + mouthValue})` }}
            />

            {/* Cheek / breathing effect when idle */}
            <div
              className={cn('absolute inset-0 rounded-2xl ring-2 ring-brand-200/0 transition duration-500', {
                'ring-brand-200/80': isTalking,
              })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="line-clamp-2 pr-2 leading-relaxed">
            {speechText ? speechText : 'Ожидаем реплику клиента…'}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Включить звук' : 'Выключить звук'}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
