import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { judgeAnswer } from '@/lib/scoring/judge';
import { nextClientMessage } from '@/lib/scenario/engine';
import { ZOOMER_SCRIPT } from '@/lib/demo/zoomerScript';
import { generateSpeech } from '@/lib/audio/tts';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = Number(params.id);
  const body = await req.json();
  const answer = (body?.answer as string)?.trim();
  if (!answer) return NextResponse.json({ error: 'Ответ пустой' }, { status: 400 });

  const session = await prisma.traineeSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: 'Сессия не найдена' }, { status: 404 });

  const meta = session.scenarioMetaJson ? JSON.parse(session.scenarioMetaJson as any) : {};
  const plan = meta.plan;
  const stepsTotal = meta.stepsTotal || 8;
  const isZoomerDemo = sessionId === 4;
  if (!plan && !isZoomerDemo) {
    return NextResponse.json({ error: 'Сценарий не найден для этой сессии' }, { status: 400 });
  }

  const traineeTurn = await prisma.turn.create({
    data: { sessionId, role: 'trainee', text: answer },
  });

  const evaluation = plan ? await judgeAnswer(answer, plan) : null;
  if (evaluation) {
    await prisma.evaluation.create({
      data: {
        sessionId,
        turnId: traineeTurn.id,
        scoresJson: JSON.stringify({ ...evaluation.scores, total: evaluation.total }),
        flagsJson: JSON.stringify({ flags: evaluation.flags, pass: evaluation.pass }),
        positivesJson: JSON.stringify(evaluation.positives),
        mistakesJson: JSON.stringify(evaluation.mistakes),
        suggestedAnswer: evaluation.suggested,
        evidenceJson: JSON.stringify(evaluation.evidence),
      },
    });
  }

  const traineeTurnCount = await prisma.turn.count({ where: { sessionId, role: 'trainee' } });
  const currentStep = traineeTurnCount;
  const maxSteps = isZoomerDemo ? ZOOMER_SCRIPT.length : stepsTotal;

  if (currentStep >= maxSteps) {
    const evals = await prisma.evaluation.findMany({ where: { sessionId } });
    const averageTotal = evals.length
      ? Math.round(
          evals.reduce((acc, item) => {
            const scores = JSON.parse(item.scoresJson as any);
            return acc + (scores?.total ?? 0);
          }, 0) / Math.max(1, evals.length)
        )
      : 80;
    const averageCompliance = evals.length
      ? Math.round(
          evals.reduce((acc, item) => {
            const scores = JSON.parse(item.scoresJson as any);
            return acc + (scores?.compliance ?? 0);
          }, 0) / Math.max(1, evals.length)
        )
      : 90;
    const pass = averageCompliance >= 60 && averageTotal >= 60;
    await prisma.traineeSession.update({
      where: { id: sessionId },
      data: {
        finishedAt: new Date(),
        totalScore: averageTotal,
        passFail: pass ? 'PASS' : 'FAIL',
        scenarioMetaJson: JSON.stringify({ ...meta, currentStep }),
      },
    });
    return NextResponse.json({ done: true, totalScore: averageTotal, pass });
  }

  let nextText = '';
  if (isZoomerDemo) {
    nextText = ZOOMER_SCRIPT[currentStep] || ZOOMER_SCRIPT[ZOOMER_SCRIPT.length - 1];
  } else {
    nextText = nextClientMessage(plan, currentStep, evaluation?.total ?? 70);
  }
  const clientTurn = await prisma.turn.create({ data: { sessionId, role: 'client', text: nextText } });

  await prisma.traineeSession.update({
    where: { id: sessionId },
    data: { scenarioMetaJson: JSON.stringify({ ...meta, currentStep }) },
  });

  let clientAudio: any = null;
  if (isZoomerDemo) {
    try {
      clientAudio = await generateSpeech(nextText);
    } catch (err) {
      console.error('demo tts failed', err);
    }
  }

  return NextResponse.json({
    done: false,
    clientTurn: { id: clientTurn.id, text: clientTurn.text },
    evaluation,
    step: currentStep,
    clientAudio,
  });
}
