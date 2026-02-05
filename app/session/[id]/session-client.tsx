'use client';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LipSyncAvatar } from '@/components/avatar/LipSyncAvatar';
import { ChatBubble } from '@/components/shared/ChatBubble';
import { VoiceInput } from '@/components/shared/VoiceInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CARD_BLOCKED_SCRIPT } from '@/lib/demo/cardBlockedScript';
import { Persona } from '@/lib/types';
import dynamic from 'next/dynamic';
import { currentAvatarProvider } from '@/lib/providers/avatar';

const VrmAvatar = dynamic(() => import('@/components/avatar/VrmAvatar').then((m) => m.VrmAvatar), { ssr: false });

const VOICE_PROFILES: Record<string, { rate: number; pitch: number; volume: number; pause: number }> = {
  irritated: { rate: 1.15, pitch: 0.85, volume: 1.0, pause: 180 },
  impatient: { rate: 1.25, pitch: 0.9, volume: 1.0, pause: 120 },
  angry: { rate: 1.1, pitch: 0.75, volume: 1.0, pause: 90 },
  neutral: { rate: 1.0, pitch: 0.95, volume: 0.9, pause: 220 },
};

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
  const [clientAudio, setClientAudio] = useState<{ audioBase64: string; mouthCues: any[] } | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const spokenTurnIdsRef = useRef<Set<string | number>>(new Set());
  const lastAudioTurnIdRef = useRef<string | number | null>(null);
  const [terminated, setTerminated] = useState(meta.status === 'TERMINATED_FAIL');
  const [terminationReason, setTerminationReason] = useState<string | null>(meta.terminationReason || null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const isGopnik = meta.plan?.persona === 'gopnik';
  const persona = meta.plan?.persona as Persona | undefined;
  const markSpoken = useCallback((id?: string | number) => {
    if (id === undefined || id === null) return;
    spokenTurnIdsRef.current.add(id);
  }, []);
  const avatarProvider = useMemo(() => currentAvatarProvider(), []);

  const deriveEmotion = (p?: Persona, turnIdx = 0) => {
    const bump = Math.min(0.2, turnIdx * 0.05);
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    switch (p) {
      case 'aggressive':
        return { emotionTag: 'angry', intensity: clamp(0.9 + bump) };
      case 'impatient':
      case 'zoomer':
        return { emotionTag: 'impatient', intensity: clamp(0.9 + bump) };
      case 'anxious':
        return { emotionTag: 'irritated', intensity: clamp(0.75 + bump) };
      case 'gopnik':
        return { emotionTag: 'irritated', intensity: clamp(0.8 + bump) };
      case 'slangy':
        return { emotionTag: 'neutral', intensity: clamp(0.6 + bump) };
      case 'corporate':
        return { emotionTag: 'neutral', intensity: clamp(0.5 + bump) };
      case 'elderly':
        return { emotionTag: 'neutral', intensity: clamp(0.4 + bump) };
      default:
        return { emotionTag: 'neutral', intensity: clamp(0.4 + bump) };
    }
  };

  const speakClient = useCallback(
    (text: string, emotionTag = 'neutral', intensity = 0.5) => {
      if (typeof window === 'undefined') return;
      const synth = (window as any).speechSynthesis;
      if (!synth) return;
      const profile = VOICE_PROFILES[emotionTag] || VOICE_PROFILES.neutral;
      const utter = new SpeechSynthesisUtterance(text);
      const rateBase = Math.max(0.8, Math.min(1.6, profile.rate + (intensity - 0.5) * 0.2));
      utter.rate = Math.max(0.7, rateBase * 0.9);
      utter.pitch = Math.max(0.5, Math.min(1.4, profile.pitch + (0.5 - intensity) * 0.3));
      utter.volume = Math.max(0.6, Math.min(1.0, profile.volume + (intensity - 0.5) * 0.15));
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      try {
        synth.cancel();
        synth.speak(utter);
      } catch {
        setSpeaking(false);
      }
    },
    []
  );

  // Озвучиваем только первое сообщение при загрузке страницы (если оно еще не было озвучено)
  useEffect(() => {
    if (!clientAudio?.audioBase64) return;
    if (avatarProvider === 'vrm') {
      try {
        if (audioElRef.current) {
          audioElRef.current.pause();
        }
        const audio = new Audio(clientAudio.audioBase64);
        audio.playbackRate = 0.92;
        audio.onplay = () => setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        audioElRef.current = audio;
        audio.play().catch(() => setSpeaking(false));
      } catch {
        setSpeaking(false);
      }
    } else {
      setSpeaking(!!clientAudio);
    }
  }, [clientAudio, avatarProvider]);

  useEffect(() => {
    if (terminated) return;
    const latestClient = [...turns].reverse().find((t: any) => t.role === 'client');
    if (!latestClient?.id) return;
    if (spokenTurnIdsRef.current.has(latestClient.id)) return;

    // Cancel any ongoing speech before starting new one
    if (typeof window !== 'undefined') {
      try {
        (window as any).speechSynthesis?.cancel();
      } catch {}
    }
    setClientAudio(null);

    const clientTurns = turns.filter((t: any) => t.role === 'client').length;
    const cue = isGopnik
      ? CARD_BLOCKED_SCRIPT[Math.max(0, Math.min(clientTurns - 1, CARD_BLOCKED_SCRIPT.length - 1))]
      : deriveEmotion(persona, clientTurns - 1);
    const synthAvailable = typeof window !== 'undefined' && (window as any).speechSynthesis;

    if (lastAudioTurnIdRef.current === latestClient.id) {
      markSpoken(latestClient.id);
      return;
    }

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: latestClient.text }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setClientAudio(data);
          markSpoken(latestClient.id);
          lastAudioTurnIdRef.current = latestClient.id;
        } else {
          const cue = isGopnik
            ? CARD_BLOCKED_SCRIPT[Math.max(0, Math.min(turns.filter((t: any) => t.role === 'client').length - 1, CARD_BLOCKED_SCRIPT.length - 1))]
            : deriveEmotion(persona, turns.filter((t: any) => t.role === 'client').length - 1);
          speakClient(latestClient.text, cue.emotionTag, cue.intensity);
          markSpoken(latestClient.id);
        }
      })
      .catch(() => {
        const cue = isGopnik
          ? CARD_BLOCKED_SCRIPT[Math.max(0, Math.min(turns.filter((t: any) => t.role === 'client').length - 1, CARD_BLOCKED_SCRIPT.length - 1))]
          : deriveEmotion(persona, turns.filter((t: any) => t.role === 'client').length - 1);
        speakClient(latestClient.text, cue.emotionTag, cue.intensity);
        markSpoken(latestClient.id);
      });
  }, [turns, persona, isGopnik, speakClient, markSpoken]);

  const handleAnswer = async (text: string) => {
    if (terminated) return;
    setLoading(true);
    let data: any = null;
    try {
      const res = await fetch(`/api/session/${session.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: text }),
      });
      if (!res.ok) {
        let errText = '';
        try {
          errText = (await res.text()) || '';
          data = JSON.parse(errText);
        } catch {
          /* ignore */
        }
        throw new Error(data?.error || errText || 'Не удалось отправить ответ');
      }
      data = await res.json();
    } catch (e: any) {
      setLoading(false);
      alert(e?.message || 'Не удалось отправить ответ');
      return;
    }
    setLoading(false);
    if (data.terminated) {
      setTerminated(true);
      setTerminationReason('Недопустимый тон общения. Экзамен не сдан.');
      if (typeof window !== 'undefined') {
        try {
          (window as any).speechSynthesis?.cancel();
        } catch {}
      }
      if (audioElRef.current) {
        try {
          audioElRef.current.pause();
        } catch {}
      }
      router.push(`/result/${session.id}`);
      return;
    }
    const newTurns = [...turns, { role: 'trainee', text }, data.clientTurn ? { role: 'client', text: data.clientTurn.text, id: data.clientTurn.id } : null].filter(Boolean);
    setTurns(newTurns);

    if (data.clientTurn && data.clientAudio) {
      lastAudioTurnIdRef.current = data.clientTurn.id;
      setClientAudio(data.clientAudio);
      markSpoken(data.clientTurn.id);
    }

    if (data.done) {
      router.push(`/result/${session.id}`);
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
          {avatarProvider === 'vrm' ? (
            <VrmAvatar isSpeaking={speaking} audioEl={audioElRef.current} emotion={(meta.plan?.persona as any) || 'neutral'} />
          ) : (
            <LipSyncAvatar
              avatarUrl={avatarUrl}
              audioSrc={clientAudio?.audioBase64}
              mouthCues={clientAudio?.mouthCues}
              speaking={speaking}
            />
          )}
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
            {terminated && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Сессия завершена: {terminationReason}
              </div>
            )}
          </div>
          <VoiceInput onSubmit={handleAnswer} disabled={loading || terminated} />
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
