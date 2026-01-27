'use client';

import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  avatarUrl: string;
  speechText?: string;
  personaLabel?: string;
};

// Placeholder for future streaming/video integration.
export function HeygenAvatarClient({ avatarUrl, speechText, personaLabel }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-soft">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-white" />
      <div className="relative flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>Клиент · {personaLabel || 'persona'}</span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-semibold text-indigo-700">Heygen (beta soon)</span>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-indigo-50 bg-indigo-50/50 p-6 text-center text-sm text-slate-700">
          <Image src={avatarUrl} alt="avatar placeholder" width={120} height={120} className="rounded-2xl object-cover opacity-80" />
          <p>Видео-аватар появится после подключения ключа HeyGen Streaming.</p>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-indigo-700 shadow-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Поставьте AVATAR_PROVIDER=heygen, когда добавите токен.</span>
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
