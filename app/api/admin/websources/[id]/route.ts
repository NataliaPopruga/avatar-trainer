import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/api/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  const body = await req.json();
  const enabled = body?.enabled;
  const label = body?.label as string | undefined;
  const domain = body?.domain as string | undefined;
  const priority = body?.priority;
  const updated = await prisma.webSource.update({
    where: { id },
    data: {
      enabled: typeof enabled === 'boolean' ? enabled : undefined,
      label: label?.trim() || undefined,
      domain: domain?.trim() || undefined,
      priority: Number.isFinite(Number(priority)) ? Number(priority) : undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  await prisma.webSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
