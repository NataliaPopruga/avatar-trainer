'use client';

import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  avatarUrl: string;
  speechText?: string;
  personaLabel?: string;
};

// Placeholder for Tavus video avatar integration.
export function TavusAvatarClient({ avatarUrl, speechText, personaLabel }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-soft">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-white" />
      <div className="relative flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>Клиент · {personaLabel || 'persona'}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">Tavus (beta soon)</span>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-50 bg-emerald-50/50 p-6 text-center text-sm text-slate-700">
          <Image src={avatarUrl} alt="avatar placeholder" width={120} height={120} className="rounded-2xl object-cover opacity-80" />
          <p>Видео-аватар появится после подключения Tavus Streaming API.</p>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-emerald-700 shadow-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Установите AVATAR_PROVIDER=tavus после добавления токена.</span>
          </div>
          <Button variant="outline" disabled>
            Ожидает интеграции
          </Button>
        </div>
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Последняя реплика: {speechText || '—'}
        </p>
      </div>
    </div>
  );
}
