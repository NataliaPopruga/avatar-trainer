import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/api/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseISO, isValid } from 'date-fns';

export const dynamic = 'force-dynamic';

type Search = { [key: string]: string | string[] | undefined };

export default async function ReportsPage({ searchParams }: { searchParams: Search }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin');

  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : '';
  const sort = searchParams.sort === 'asc' ? 'asc' : 'desc';
  const fromStr = typeof searchParams.from === 'string' ? searchParams.from : '';
  const toStr = typeof searchParams.to === 'string' ? searchParams.to : '';
  const fromDate = fromStr ? parseISO(fromStr) : null;
  const toDate = toStr ? parseISO(toStr) : null;

  const where: any = { AND: [] as any[] };
  if (q) where.AND.push({ traineeName: { contains: q } }); // SQLite: нет mode, будем добирать кейс-инсенситив позже
  if (fromDate && isValid(fromDate)) where.AND.push({ startedAt: { gte: fromDate } });
  if (toDate && isValid(toDate)) where.AND.push({ startedAt: { lte: toDate } });
  if (where.AND.length === 0) delete where.AND;

  const reportsRaw = await prisma.traineeSession.findMany({
    where,
    orderBy: { startedAt: sort },
  });
  const qLower = q.toLocaleLowerCase();
  const reports = q
    ? reportsRaw.filter((r) => (r.traineeName || '').toLocaleLowerCase().includes(qLower))
    : reportsRaw;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-16 pt-10">
      <div>
        <p className="text-sm uppercase tracking-wide text-brand-700">Отчёты</p>
        <h1 className="text-3xl font-semibold text-slate-900">Список всех сессий</h1>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Поиск по имени</label>
              <Input name="q" defaultValue={q} placeholder="Напр. Иванов" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">С даты</label>
              <Input type="date" name="from" defaultValue={fromStr} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">По дату</label>
              <Input type="date" name="to" defaultValue={toStr} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Сортировка</label>
              <select
                name="sort"
                defaultValue={sort}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
              >
                <option value="desc">Новые сверху</option>
                <option value="asc">Старые сверху</option>
              </select>
            </div>
            <Button type="submit">Применить</Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/admin/reports">Сбросить</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
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
