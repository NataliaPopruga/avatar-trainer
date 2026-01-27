import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/api/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KnowledgeManager } from './knowledge-manager';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin');
  const docs = await prisma.knowledgeDoc.findMany({ include: { _count: { select: { chunks: true } } }, orderBy: { createdAt: 'desc' } });
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-16 pt-10">
      <div>
        <p className="text-sm uppercase tracking-wide text-brand-700">База знаний</p>
        <h1 className="text-3xl font-semibold text-slate-900">Загрузка и переиндексация</h1>
        <p className="text-slate-600">Поддерживаем .md, .txt, .docx. Чанки ~1000 символов с оверлапом 120.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Загрузить файл</CardTitle>
          <CardDescription>Документы приоритетнее web-источников при противоречиях.</CardDescription>
        </CardHeader>
        <CardContent>
          <KnowledgeManager initialDocs={JSON.parse(JSON.stringify(docs))} />
        </CardContent>
      </Card>
    </main>
  );
}
