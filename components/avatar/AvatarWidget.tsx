'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  avatarUrl: string;
  speechText?: string;
}

export function AvatarWidget({ avatarUrl, speechText }: Props) {
  const [muted, setMuted] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (muted || !speechText) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'ru-RU';
    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [speechText, muted]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-100/50 via-white to-white" />
      <div className="relative flex items-center justify-center p-6">
        <Image src={avatarUrl} alt="avatar" width={220} height={220} className="h-48 w-48 rounded-2xl object-cover shadow-lg" />
      </div>
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="text-sm text-slate-600">Голос клиента</div>
        <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Включить звук' : 'Выключить звук'}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
