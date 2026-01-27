import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/api/auth';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sessionId = Number(params.id);
  const session = await prisma.traineeSession.findUnique({
    where: { id: sessionId },
    include: {
      evaluations: true,
      turns: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(session);
}
