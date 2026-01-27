import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SessionClient } from './session-client';
import { avatarForPersona } from '@/lib/providers/avatar';

export const dynamic = 'force-dynamic';

export default async function SessionPage({ params }: { params: { id: string } }) {
  try {
    const sessionId = Number(params.id);
    if (!Number.isFinite(sessionId)) return notFound();
    const session = await prisma.traineeSession.findUnique({
      where: { id: sessionId },
      include: { turns: { orderBy: { createdAt: 'asc' } }, evaluations: true },
    });
    if (!session) return notFound();
    let meta: any = {};
    try {
      meta = session.scenarioMetaJson ? JSON.parse(session.scenarioMetaJson as any) : {};
    } catch {
      meta = {};
    }
    if (sessionId === 4) {
      meta = {
        plan: { persona: 'zoomer', difficulty: 'hard', goal: 'slang faq', archetypeId: 'demo' },
        stepsTotal: 7,
      };
    }
    const avatarUrl = meta.plan ? avatarForPersona(meta.plan.persona) : '/avatars/calm.png';
    const payload = JSON.parse(JSON.stringify({ ...session, scenarioMetaJson: meta }));
    return <SessionClient session={payload} avatarUrl={avatarUrl} />;
  } catch (err) {
    console.error('Session page error', err);
    return notFound();
  }
}
