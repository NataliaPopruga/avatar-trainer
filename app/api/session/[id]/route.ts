import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ZOOMER_SCRIPT } from '@/lib/demo/zoomerScript';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const sessionId = Number(params.id);
  const session = await prisma.traineeSession.findUnique({
    where: { id: sessionId },
    include: {
      turns: { orderBy: { createdAt: 'asc' } },
      evaluations: true,
      webSnippets: true,
    },
  });
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (sessionId === 4) {
    session.scenarioMetaJson = JSON.stringify({
      plan: { persona: 'zoomer', difficulty: 'hard', goal: 'slang faq', archetypeId: 'demo' },
      stepsTotal: ZOOMER_SCRIPT.length,
      currentStep: 0,
    });
  }
  return NextResponse.json(session);
}
