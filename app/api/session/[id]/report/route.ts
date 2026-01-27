import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const sessionId = Number(params.id);
  const session = await prisma.traineeSession.findUnique({
    where: { id: sessionId },
    include: {
      evaluations: true,
      webSnippets: true,
      turns: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const evals = session.evaluations;
  const avg = (key: string) =>
    Math.round(
      evals.reduce((acc, e) => {
        const scores = JSON.parse(e.scoresJson as any);
        return acc + (scores?.[key] ?? 0);
      }, 0) / Math.max(1, evals.length)
    );
  const totalScore = session.totalScore ?? avg('total');
  const pass = session.passFail ? session.passFail === 'PASS' : totalScore >= 70;
  const positives = Array.from(new Set(evals.flatMap((e) => JSON.parse((e.positivesJson as any) || '[]'))));
  const mistakes = Array.from(new Set(evals.flatMap((e) => JSON.parse((e.mistakesJson as any) || '[]'))));
  const evidence = evals.flatMap((e) => JSON.parse((e.evidenceJson as any) || '[]'));

  return NextResponse.json({
    session,
    averages: {
      correctness: avg('correctness'),
      compliance: avg('compliance'),
      softSkills: avg('softSkills'),
      deEscalation: avg('deEscalation'),
      total: totalScore,
      pass,
    },
    positives,
    mistakes,
    evidence,
  });
}
