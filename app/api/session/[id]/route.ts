import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ZOOMER_SCRIPT } from '@/lib/demo/zoomerScript';
import { CARD_BLOCKED_PLAN, CARD_BLOCKED_SCRIPT } from '@/lib/demo/cardBlockedScript';

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
  if (sessionId === 5) {
    session.scenarioMetaJson = JSON.stringify({
      plan: { ...CARD_BLOCKED_PLAN, channel: 'call' },
      stepsTotal: CARD_BLOCKED_SCRIPT.length,
      currentStep: 0,
    });
  }
  return NextResponse.json(session);
}
