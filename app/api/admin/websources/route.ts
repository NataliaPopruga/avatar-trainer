import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/api/auth';
import { prisma } from '@/lib/prisma';
import { getWebConfig } from '@/lib/web-config';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sources = await prisma.webSource.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] });
  const cfg = await getWebConfig();
  return NextResponse.json({ sources, webEnabled: cfg.webEnabled });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const label = (body?.label as string)?.trim() || 'Custom source';
  const domain = (body?.domain as string)?.trim();
  const priority = Number(body?.priority ?? 0) || 0;
  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 });
  const created = await prisma.webSource.create({ data: { label, domain, priority, enabled: true } });
  return NextResponse.json(created);
}
