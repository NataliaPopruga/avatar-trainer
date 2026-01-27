import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ResultPage({ params }: { params: { id: string } }) {
  const sessionId = Number(params.id);
  const session = await prisma.traineeSession.findUnique({
    where: { id: sessionId },
    include: { evaluations: true, turns: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) return notFound();
  const evals = session.evaluations;
  const avg = (key: string) =>
    Math.round(
      evals.reduce((acc, e) => {
        const scores = JSON.parse(e.scoresJson as any);
        return acc + (scores?.[key] ?? 0);
      }, 0) / Math.max(1, evals.length)
    );
  const total = session.totalScore ?? avg('total');
  const compliance = avg('compliance');
  const pass = session.passFail ? session.passFail === 'PASS' : total >= 70 && compliance >= 85;
  const positives = Array.from(new Set(evals.flatMap((e) => JSON.parse((e.positivesJson as any) || '[]'))));
  const mistakes = Array.from(new Set(evals.flatMap((e) => JSON.parse((e.mistakesJson as any) || '[]'))));
  const evidence = evals.flatMap((e) => JSON.parse((e.evidenceJson as any) || '[]'));
  const suggested = evals[evals.length - 1]?.suggestedAnswer || 'Добавьте ссылку на регламент и конкретные шаги.';

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-brand-700">Отчёт по сессии #{session.id}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{session.traineeName}</h1>
          <p className="text-slate-600">Режим: {session.mode === 'exam' ? 'Экзамен' : 'Тренировка'}</p>
        </div>
        <Badge className={pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
          {pass ? 'PASS' : 'FAIL'} · {total}%
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[{ label: 'Correctness', value: avg('correctness') }, { label: 'Compliance', value: compliance }, { label: 'Soft skills', value: avg('softSkills') }, { label: 'De-escalation', value: avg('deEscalation') }].map((item) => (
          <Card key={item.label}>
            <CardContent className="space-y-3 p-5">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="text-2xl font-semibold text-slate-900">{item.value}%</div>
              <Progress value={item.value} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Что получилось</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Сильные ответы</p>
            {positives.length === 0 ? <p className="text-sm text-slate-600">Нет явных плюсов</p> : positives.map((p) => <p key={p} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{p}</p>)}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-rose-700">Ошибки</p>
            {mistakes.length === 0 ? <p className="text-sm text-slate-600">Ошибки не зафиксированы</p> : mistakes.map((m) => <p key={m} className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{m}</p>)}
          </div>
          <div className="space-y-2 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-brand-700">Как можно лучше</p>
            <p className="rounded-xl bg-brand-50 px-3 py-3 text-sm text-slate-800">{suggested}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evidence (RAG + web)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {evidence.length === 0 && <p className="text-sm text-slate-600">Нет ссылок на документы</p>}
          {evidence.map((ev: any, idx: number) => (
            <details key={idx} className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">{ev.title || 'Chunk'} — score {ev.score ?? 0}</summary>
              <p className="pt-2 text-sm text-slate-600">{ev.text}</p>
            </details>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href="/trainee">Запустить новую сессию</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/admin/reports/${session.id}`}>Открыть в админке</Link>
        </Button>
      </div>
    </main>
  );
}
