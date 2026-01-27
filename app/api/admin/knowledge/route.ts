import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/api/auth';
import { prisma } from '@/lib/prisma';
import { saveKnowledgeDocument } from '@/lib/providers/retrieval';
import mammoth from 'mammoth';

async function fileToText(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const res = await mammoth.extractRawText({ buffer });
    return res.value;
  }
  return await file.text();
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const docs = await prisma.knowledgeDoc.findMany({ include: { _count: { select: { chunks: true } } }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Нет файла' }, { status: 400 });

  const content = await fileToText(file);
  if (!content || content.length < 10) return NextResponse.json({ error: 'Пустой файл' }, { status: 400 });

  const title = (form.get('title') as string) || file.name;
  await saveKnowledgeDocument(title, content, { uploadedBy: 'admin' });
  return NextResponse.json({ ok: true });
}
