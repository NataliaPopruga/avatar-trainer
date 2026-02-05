import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateScenario } from '@/lib/scenario/generator';
import { initialClientMessage } from '@/lib/scenario/engine';
import { performWebSearch } from '@/lib/providers/web';
import { generateSpeech } from '@/lib/audio/tts';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const traineeName = (body?.name as string)?.trim();
  const mode = (body?.mode as string) || 'training';

  if (!traineeName) {
    return NextResponse.json({ error: 'Имя обязательно' }, { status: 400 });
  }

  const plan = await generateScenario(mode);
  const stepsTotal = mode === 'exam' ? randomInt(9, 12) : randomInt(6, 10);
  const scenarioMeta = { plan, stepsTotal, currentStep: 0 };

  const session = await prisma.traineeSession.create({
    data: {
      traineeName,
      mode,
      scenarioMetaJson: JSON.stringify(scenarioMeta),
    },
  });

  const firstText = initialClientMessage(plan);
  const firstTurn = await prisma.turn.create({ data: { sessionId: session.id, role: 'client', text: firstText } });

  let clientAudio: any = null;
  try {
    clientAudio = await generateSpeech(firstText);
  } catch (err) {
    console.error('first turn tts failed', err);
  }

  const snippets = await performWebSearch(plan.goal);
  await prisma.$transaction(
    snippets.map((s) =>
      prisma.webSnippet.create({
        data: { sessionId: session.id, title: s.title, url: s.url, snippet: s.snippet },
      })
    )
  );

  return NextResponse.json({
    sessionId: session.id,
    firstTurn: { role: 'client', text: firstText, id: firstTurn.id, clientAudio },
    scenario: scenarioMeta,
  });
}
