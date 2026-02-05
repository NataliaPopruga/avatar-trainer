import Link from 'next/link';
import { getAdminSession } from '@/lib/api/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminLogin } from './admin-login';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { ArrowRight, FilePlus2, ListChecks } from 'lucide-react';
import { AdminLogout } from './admin-logout';
import nextDynamic from 'next/dynamic';
const WebSourcesPanelDynamic = nextDynamic(() => import('./web-sources-panel').then(m => m.WebSourcesPanel), { ssr: false });

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await getAdminSession();
  if (!admin) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-16 pt-12">
        <Card>
          <CardHeader>
            <CardTitle>Вход для админа</CardTitle>
            <CardDescription>Введите PIN (ENV ADMIN_PIN). После входа cookie сохранится на неделю.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLogin />
          </CardContent>
        </Card>
      </main>
    );
  }

  const docsCount = await prisma.knowledgeDoc.count();
  const reportsCount = await prisma.traineeSession.count();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-16 pt-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-brand-700">Админ-панель</p>
          <h1 className="text-3xl font-semibold text-slate-900">Контент и отчёты</h1>
          <p className="text-slate-600">Управляйте базой знаний, источниками и смотрите отчёты.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-100 text-emerald-700">PIN принят</Badge>
          <AdminLogout />
        </div>
      </div>
      <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="h-full">
          <CardContent className="flex h-full flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Документы в базе знаний</p>
                <p className="text-2xl font-semibold text-slate-900">{docsCount}</p>
              </div>
              <FilePlus2 className="h-5 w-5 text-brand-600" />
            </div>
            <div className="mt-auto">
              <Button asChild variant="ghost" className="w-full justify-between">
              <Link href="/admin/knowledge" className="flex items-center justify-between">
                Загрузить файлы <ArrowRight className="h-4 w-4" />
              </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardContent className="flex h-full flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Отчётов всего</p>
                <p className="text-2xl font-semibold text-slate-900">{reportsCount}</p>
              </div>
              <ListChecks className="h-5 w-5 text-brand-600" />
            </div>
            <div className="mt-auto">
              <Button asChild variant="ghost" className="w-full justify-between">
              <Link href="/admin/reports" className="flex items-center justify-between">
                Открыть отчёты <ArrowRight className="h-4 w-4" />
              </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <WebSourcesPanelDynamic />
        </div>
      </div>
    </main>
  );
}
