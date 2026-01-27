import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/api/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin');
  const reports = await prisma.traineeSession.findMany({ orderBy: { startedAt: 'desc' } });
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-16 pt-10">
      <div>
        <p className="text-sm uppercase tracking-wide text-brand-700">Отчёты</p>
        <h1 className="text-3xl font-semibold text-slate-900">Список всех сессий</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Сотрудники</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-900">{r.traineeName}</p>
                <p className="text-xs text-slate-500">{format(new Date(r.startedAt), 'd MMM HH:mm', { locale: ru })}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={r.passFail === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                  {r.passFail || '—'} {r.totalScore ? `· ${r.totalScore}%` : ''}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/reports/${r.id}`}>Открыть</Link>
                </Button>
              </div>
            </div>
          ))}
          {reports.length === 0 && <p className="text-sm text-slate-500">Пока нет сессий</p>}
        </CardContent>
      </Card>
    </main>
  );
}
