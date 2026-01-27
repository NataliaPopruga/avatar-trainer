'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LipSyncAvatar } from '@/components/avatar/LipSyncAvatar';
import { ChatBubble } from '@/components/shared/ChatBubble';
import { VoiceInput } from '@/components/shared/VoiceInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  session: any;
  avatarUrl: string;
}

export function SessionClient({ session, avatarUrl }: Props) {
  const router = useRouter();
  const [turns, setTurns] = useState(session.turns || []);
  const [loading, setLoading] = useState(false);
  const meta = session.scenarioMetaJson || {};
  const totalSteps = meta.stepsTotal || 8;
  const traineeTurns = turns.filter((t: any) => t.role === 'trainee').length;
  const progress = Math.min(100, Math.round((traineeTurns / totalSteps) * 100));
  const [lastClientLine, setLastClientLine] = useState(turns[turns.length - 1]?.text || '');
  const [clientAudio, setClientAudio] = useState<{ audioBase64: string; mouthCues: any[] } | null>(null);

  useEffect(() => {
    const lastClient = [...turns].reverse().find((t: any) => t.role === 'client');
    if (lastClient) {
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lastClient.text }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setClientAudio(data);
        })
        .catch(() => {});
    }
  }, []);

  const handleAnswer = async (text: string) => {
    setLoading(true);
    const res = await fetch(`/api/session/${session.id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: text }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Не удалось отправить ответ');
      return;
    }
    const data = await res.json();
    setTurns((prev: any[]) => [...prev, { role: 'trainee', text }, data.clientTurn ? { role: 'client', text: data.clientTurn.text } : null].filter(Boolean));
    if (data.done) {
      router.push(`/result/${session.id}`);
    } else if (data.clientTurn) {
      setLastClientLine(data.clientTurn.text);
      if (data.clientAudio) {
        setClientAudio(data.clientAudio);
      } else {
        fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.clientTurn.text }),
        })
          .then((r) => r.json())
          .then((payload) => {
            if (!payload.error) setClientAudio(payload);
          })
          .catch(() => {});
      }
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-16 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-brand-700">Сессия #{session.id}</p>
          <h1 className="text-3xl font-semibold text-slate-900">Диалог с аватаром</h1>
          <p className="text-slate-600">Режим: {session.mode === 'exam' ? 'Экзамен' : 'Тренировка'} · {meta.plan?.persona}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500">Прогресс</p>
            <p className="text-lg font-semibold text-slate-900">{traineeTurns} / {totalSteps}</p>
          </div>
          <div className="w-48">
            <Progress value={progress} />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="flex flex-col gap-4">
          <LipSyncAvatar avatarUrl={avatarUrl} audioSrc={clientAudio?.audioBase64} mouthCues={clientAudio?.mouthCues} />
          <Card>
            <CardHeader>
              <CardTitle>Сценарий</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-brand-50 text-brand-700">{meta.plan?.persona}</Badge>
                <Badge className="bg-amber-50 text-amber-700">{meta.plan?.difficulty}</Badge>
                <Badge className="bg-emerald-50 text-emerald-700">{meta.plan?.goal}</Badge>
              </div>
              <p>{meta.plan?.opener}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Правила безопасности</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Не спрашивайте PIN, CVV, коды, полные номера карт. При нарушении — автоматический флаг.</p>
              <p>Держите ответы короткими: признание проблемы + конкретный шаг + срок.</p>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-[60vh] space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-soft scrollbar-hide">
            {turns.map((turn: any, idx: number) => (
              <ChatBubble key={idx} role={turn.role} text={turn.text} />
            ))}
            {loading && <div className="text-sm text-slate-500">Оцениваем ответ...</div>}
          </div>
          <VoiceInput onSubmit={handleAnswer} disabled={loading} />
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            В mock-режиме аватар использует фиксированные правила. Подключите TTS/STT провайдеры через ENV, чтобы включить реальные модели.
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => router.push(`/result/${session.id}`)}>
              Завершить и открыть отчёт
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
