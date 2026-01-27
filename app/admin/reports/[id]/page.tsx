import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/api/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const dynamic = 'force-dynamic';

export default async function AdminReportDetail({ params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin');
  const sessionId = Number(params.id);
  const session = await prisma.traineeSession.findUnique({
    where: { id: sessionId },
    include: { evaluations: true, turns: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) redirect('/admin/reports');
  const evals = session.evaluations;
  const avg = (key: string) =>
    Math.round(
      evals.reduce((acc, e) => {
        const scores = JSON.parse(e.scoresJson as any);
        return acc + (scores?.[key] ?? 0);
      }, 0) / Math.max(1, evals.length)
    );
  const total = session.totalScore ?? avg('total');
  const pass = session.passFail ? session.passFail === 'PASS' : total >= 70;
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-16 pt-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-brand-700">Отчёт</p>
          <h1 className="text-3xl font-semibold text-slate-900">{session.traineeName}</h1>
          <p className="text-slate-600">Сессия #{session.id}</p>
        </div>
        <Badge className={pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
          {pass ? 'PASS' : 'FAIL'} {total ? `· ${total}%` : ''}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Диалог</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {session.turns.map((t) => (
            <div key={t.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">{t.role === 'client' ? 'Клиент:' : 'Сотрудник:'}</span> {t.text}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Оценка</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {[{ label: 'Correctness', value: avg('correctness') }, { label: 'Compliance', value: avg('compliance') }, { label: 'Soft skills', value: avg('softSkills') }, { label: 'De-escalation', value: avg('deEscalation') }].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-3">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="text-xl font-semibold text-slate-900">{item.value}%</p>
              <Progress value={item.value} />
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
