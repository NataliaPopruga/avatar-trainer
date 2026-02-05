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
  const safeParse = (val: any, fb: any) => {
    try {
      return typeof val === 'string' ? JSON.parse(val) : fb;
    } catch {
      return fb;
    }
  };
  const evals = session.evaluations;
  const meta = (() => {
    try {
      return session.scenarioMetaJson ? JSON.parse(session.scenarioMetaJson as any) : {};
    } catch {
      return {};
    }
  })();
  const avg = (key: string) =>
    Math.round(
      evals.reduce((acc, e) => {
        const scores = safeParse(e.scoresJson as any, {});
        return acc + (scores?.[key] ?? 0);
      }, 0) / Math.max(1, evals.length)
    );
  const total = session.totalScore ?? avg('total');
  const compliance = avg('compliance');
  const pass = session.passFail ? session.passFail === 'PASS' : total >= 70 && compliance >= 85;
  const evidenceAll = evals.flatMap((e) => safeParse((e.evidenceJson as any) || '[]', []));
  const strengthsEvidence = evidenceAll.filter((ev: any) => ev?.category === 'strength' && ev?.evidence?.length);
  const mistakesEvidence = evidenceAll.filter((ev: any) => ev?.category === 'mistake' && ev?.evidence?.length);
  const sourceEvidence = evidenceAll.filter((ev: any) => ev?.category === 'source');
  const suggested =
    evals[evals.length - 1]?.suggestedAnswer ||
    (meta?.plan?.topic?.toLowerCase().includes('накоп') ? 'Уточните тип счёта, дайте шаги в приложении и срок: «Счета и вклады → Открыть → Накопительный счёт», назовите, от чего зависит процент.' : 'Признайте проблему, уточните детали, дайте конкретный шаг и срок.');
  const explain = evals.length ? safeParse((evals[evals.length - 1].explainJson as any) || '{}', {}) : {};

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
        {[{ key: 'correctness', label: 'Correctness', value: avg('correctness') }, { key: 'compliance', label: 'Compliance', value: compliance }, { key: 'softSkills', label: 'Soft skills', value: avg('softSkills') }, { key: 'deEscalation', label: 'De-escalation', value: avg('deEscalation') }].map((item) => (
          <Card key={item.label}>
            <CardContent className="space-y-3 p-5">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="text-2xl font-semibold text-slate-900">{item.value}%</div>
              <Progress value={item.value} />
              {explain?.[item.key] && (
                <details className="text-xs text-slate-600">
                  <summary className="cursor-pointer text-slate-700">Как считается</summary>
                  <div className="pt-2 space-y-1">
                    {(explain[item.key].hits || []).map((h: string, idx: number) => (
                      <div key={idx} className="text-emerald-700">+ {h}</div>
                    ))}
                    {(explain[item.key].misses || []).map((h: string, idx: number) => (
                      <div key={idx} className="text-amber-700">• {h}</div>
                    ))}
                  </div>
                </details>
              )}
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
            {strengthsEvidence.length === 0 ? <p className="text-sm text-slate-600">Нет явных плюсов</p> : strengthsEvidence.map((ev: any) => (
              <details key={ev.id} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <summary className="cursor-pointer font-semibold">{ev.title || 'Сильная сторона'}</summary>
                {ev.evidence?.map((item: any, idx: number) => (
                  <p key={idx} className="pt-1 text-emerald-700 text-xs">
                    «{item.quote}» — {item.reason}
                  </p>
                ))}
              </details>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-rose-700">Ошибки</p>
            {mistakesEvidence.length === 0 ? <p className="text-sm text-slate-600">Ошибки не зафиксированы</p> : mistakesEvidence.map((ev: any) => (
              <details key={ev.id} className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <summary className="cursor-pointer font-semibold">{ev.title || 'Ошибка'}</summary>
                {ev.evidence?.map((item: any, idx: number) => (
                  <p key={idx} className="pt-1 text-rose-700 text-xs">
                    «{item.quote}» — {item.reason}
                  </p>
                ))}
              </details>
            ))}
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
          {sourceEvidence.length === 0 && <p className="text-sm text-slate-600">Нет ссылок на документы</p>}
          {sourceEvidence.map((ev: any, idx: number) => (
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
          <Link href={`/admin?redirect=/admin/reports/${session.id}`}>В админку (нужен PIN)</Link>
        </Button>
      </div>
    </main>
  );
}
