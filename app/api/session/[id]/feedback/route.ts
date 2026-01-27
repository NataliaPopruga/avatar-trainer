import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = Number(params.id);
  const body = await req.json();
  const csat = body?.csat as number | undefined;
  const comment = (body?.comment as string) || '';

  await prisma.feedback.upsert({
    where: { sessionId },
    create: { sessionId, csat, comment },
    update: { csat, comment },
  });

  return NextResponse.json({ ok: true });
}
