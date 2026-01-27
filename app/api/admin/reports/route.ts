import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/api/auth';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const reports = await prisma.traineeSession.findMany({
    orderBy: { startedAt: 'desc' },
    select: { id: true, traineeName: true, startedAt: true, totalScore: true, passFail: true },
  });
  return NextResponse.json(reports);
}
