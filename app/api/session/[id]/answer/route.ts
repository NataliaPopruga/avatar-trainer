import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { judgeAnswer } from '@/lib/scoring/judge';
import { nextClientMessage } from '@/lib/scenario/engine';
import { ZOOMER_SCRIPT } from '@/lib/demo/zoomerScript';
import { CARD_BLOCKED_PLAN, CARD_BLOCKED_SCRIPT } from '@/lib/demo/cardBlockedScript';
import { generateSpeech } from '@/lib/audio/tts';
import { Persona, ScenarioPlan } from '@/lib/types';
import { detectAbuse } from '@/lib/moderation/profanity';

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

const deriveEmotion = (persona?: Persona, turnIdx = 0) => {
  const bump = Math.min(0.2, turnIdx * 0.05);
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  switch (persona) {
    case 'aggressive':
      return { emotionTag: 'angry', intensity: clamp(0.9 + bump) };
    case 'impatient':
    case 'zoomer':
      return { emotionTag: 'impatient', intensity: clamp(0.9 + bump) };
    case 'anxious':
      return { emotionTag: 'irritated', intensity: clamp(0.75 + bump) };
    case 'gopnik':
      return { emotionTag: 'irritated', intensity: clamp(0.8 + bump) };
    case 'slangy':
      return { emotionTag: 'neutral', intensity: clamp(0.6 + bump) };
    case 'corporate':
      return { emotionTag: 'neutral', intensity: clamp(0.5 + bump) };
    case 'elderly':
      return { emotionTag: 'neutral', intensity: clamp(0.4 + bump) };
    default:
      return { emotionTag: 'neutral', intensity: clamp(0.4 + bump) };
  }
};

const useLLM = process.env.USE_LLM === 'true' && !!process.env.OPENAI_API_KEY;

const piiPatterns = [
  /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/i, // card number
  /\bпаспорт\b/i,
  /\bсерия\b.*\bномер\b.*паспорт/i,
  /\bтелефон\b|\bномер[а-я]*\s*тел/i,
  /cvv/i,
  /pin/i,
  /otp|смс код|sms код/i,
];

function containsPiiRequest(text: string) {
  return piiPatterns.some((r) => r.test(text));
}

function placeholderPiiReply() {
  return 'Я не передаю паспортные и телефонные данные в чате. Давайте решим без этого. [паспорт скрыт] [телефон скрыт]';
}

async function generateClientLLM(plan: ScenarioPlan, turns: any[], evaluationScore: number) {
  const history = turns.slice(-6).map((t: any) => `${t.role === 'client' ? 'Клиент' : 'Агент'}: ${t.text}`).join('\n');
  const facts = Array.isArray(plan.facts) ? plan.facts.slice(0, 3).join('\n- ') : '';

  const messages = [
    {
      role: 'system',
      content: [
        'Ты играешь роль клиента банка в тренировочном диалоге.',
        'Отвечай 1-2 предложениями, без ПДн, без внутренних пометок.',
        `Персона: ${plan.persona || 'neutral'}, сложность: ${plan.difficulty || 'simple'}.`,
        `Цель сценария: ${plan.goal || 'получить решение вопроса'}.`,
        plan.escalationTriggers?.length ? `Триггеры эскалации: ${plan.escalationTriggers.join(', ')}` : '',
        facts ? `Контекст регламента:\n- ${facts}` : '',
        evaluationScore < 55
          ? 'Оцени работу агента низко: говори требовательно и укажи, что нужно конкретное действие.'
          : 'Сохраняй тон персоны, задавай уточняющие вопросы по теме.',
        'Не придумывай новые требования, опирайся на тему сценария.',
      ]
        .filter(Boolean)
        .join('\n'),
    },
    {
      role: 'user',
      content: `Предыдущий диалог:\n${history}\n\nСледующий ход клиента:`,
    },
  ];

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = Number(params.id);
  const body = await req.json();
  const answer = (body?.answer as string)?.trim();
  if (!answer) return NextResponse.json({ error: 'Ответ пустой' }, { status: 400 });

  const session = await prisma.traineeSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: 'Сессия не найдена' }, { status: 404 });
  let metaBase: any = {};
  try {
    metaBase = session.scenarioMetaJson ? JSON.parse(session.scenarioMetaJson as any) : {};
  } catch {
    metaBase = {};
  }
  if (metaBase.status === 'TERMINATED_FAIL') {
    return NextResponse.json({ done: true, pass: false, terminated: true, reason: metaBase.terminationReason || 'TERMINATED_FAIL' });
  }

  const abuse = detectAbuse(answer);
  if (abuse.isAbusive) {
    const traineeTurn = await prisma.turn.create({
      data: { sessionId, role: 'trainee', text: answer },
    });
    await prisma.evaluation.create({
      data: {
        sessionId,
        turnId: traineeTurn.id,
        scoresJson: JSON.stringify({ correctness: 0, compliance: 0, softSkills: 0, deEscalation: 0, total: 0 }),
        flagsJson: JSON.stringify({ flags: ['ABUSE', ...abuse.categories], pass: false }),
        positivesJson: JSON.stringify([]),
        mistakesJson: JSON.stringify(['Недопустимый тон/хамство', 'Оскорбления/ненормативная лексика']),
        suggestedAnswer: 'В клиентском сервисе недопустимы оскорбления. Используйте нейтральный тон и деэскалацию.',
        evidenceJson: JSON.stringify([]),
        explainJson: JSON.stringify({ abuse }),
      },
    });
    await prisma.traineeSession.update({
      where: { id: sessionId },
      data: {
        finishedAt: new Date(),
        totalScore: 0,
        passFail: 'FAIL',
        scenarioMetaJson: JSON.stringify({
          ...metaBase,
          status: 'TERMINATED_FAIL',
          terminated: true,
          terminationReason: 'ABUSE',
          terminationMeta: abuse,
        }),
      },
    });
    return NextResponse.json({
      done: true,
      pass: false,
      terminated: true,
      reason: 'ABUSE',
      categories: abuse.categories,
    });
  }

  const meta = metaBase;
  const plan = meta.plan;
  const stepsTotal = meta.stepsTotal || 8;
  const isZoomerDemo = sessionId === 4;
  const isGopnikDemo = sessionId === 5;
  if (!plan && !isZoomerDemo && !isGopnikDemo) {
    return NextResponse.json({ error: 'Сценарий не найден для этой сессии' }, { status: 400 });
  }

  const traineeTurn = await prisma.turn.create({
    data: { sessionId, role: 'trainee', text: answer },
  });

  const effectivePlan = plan || (isGopnikDemo ? { ...CARD_BLOCKED_PLAN, channel: 'call' } : null);
  const evaluation = effectivePlan ? await judgeAnswer(answer, effectivePlan) : null;
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
        explainJson: JSON.stringify(evaluation.explain ?? {}),
      },
    });
  }

  const traineeTurnCount = await prisma.turn.count({ where: { sessionId, role: 'trainee' } });
  const currentStep = traineeTurnCount;
  const maxSteps = isZoomerDemo ? ZOOMER_SCRIPT.length : isGopnikDemo ? CARD_BLOCKED_SCRIPT.length : stepsTotal;

  const profanity = evaluation?.flags?.includes('PROFANITY');
  const resolved = evaluation?.flags?.includes('RESOLVED');

  const finalizeSession = async (pass: boolean, totalScore: number, metaPatch: any = {}) => {
    await prisma.traineeSession.update({
      where: { id: sessionId },
      data: {
        finishedAt: new Date(),
        totalScore,
        passFail: pass ? 'PASS' : 'FAIL',
        scenarioMetaJson: JSON.stringify({ ...meta, currentStep, ...metaPatch }),
      },
    });
    return NextResponse.json({ done: true, totalScore, pass });
  };

  if (profanity) {
    const threatText = 'Если будете продолжать в таком тоне, я подам жалобу и заканчиваю разговор.';
    const clientTurn = await prisma.turn.create({
      data: { sessionId, role: 'client', text: threatText },
    });
    return finalizeSession(false, Math.max(40, evaluation?.total ?? 50), { currentStep });
  }

  if (resolved) {
    const totalScore = evaluation?.total ?? 80;
    return finalizeSession(true, totalScore, { currentStep });
  }

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
  let emotionTag: string | undefined;
  let intensity: number | undefined;
  if (containsPiiRequest(answer)) {
    nextText = placeholderPiiReply();
    const emo = deriveEmotion(effectivePlan?.persona, currentStep);
    emotionTag = emo.emotionTag;
    intensity = emo.intensity;
  } else if (isZoomerDemo) {
    nextText = ZOOMER_SCRIPT[currentStep] || ZOOMER_SCRIPT[ZOOMER_SCRIPT.length - 1];
    const emo = deriveEmotion('zoomer', currentStep);
    emotionTag = emo.emotionTag;
    intensity = emo.intensity;
  } else if (isGopnikDemo) {
    const cue = CARD_BLOCKED_SCRIPT[currentStep] || CARD_BLOCKED_SCRIPT[CARD_BLOCKED_SCRIPT.length - 1];
    nextText = cue.text;
    emotionTag = cue.emotionTag;
    intensity = cue.intensity;
  } else {
    if (useLLM) {
      try {
        const turns = await prisma.turn.findMany({ where: { sessionId }, orderBy: { id: 'asc' } });
        nextText = await generateClientLLM(effectivePlan!, turns, evaluation?.total ?? 70);
      } catch (err) {
        console.error('llm client gen failed, fallback to scripted', err);
        nextText = nextClientMessage(effectivePlan!, currentStep, evaluation?.total ?? 70);
      }
    } else {
      nextText = nextClientMessage(effectivePlan!, currentStep, evaluation?.total ?? 70);
    }
    const emo = deriveEmotion(effectivePlan?.persona, currentStep);
    emotionTag = emo.emotionTag;
    intensity = emo.intensity;
  }
  const clientTurn = await prisma.turn.create({
    data: {
      sessionId,
      role: 'client',
      text: nextText,
    },
  });

  const updatedMeta = { ...meta, currentStep };
  if (isGopnikDemo) {
    updatedMeta.plan = updatedMeta.plan || { ...CARD_BLOCKED_PLAN, channel: 'call' };
    updatedMeta.stepsTotal = updatedMeta.stepsTotal || CARD_BLOCKED_SCRIPT.length;
  }
  await prisma.traineeSession.update({
    where: { id: sessionId },
    data: { scenarioMetaJson: JSON.stringify(updatedMeta) },
  });

  let clientAudio: any = null;
  try {
    clientAudio = await generateSpeech(nextText);
  } catch (err) {
    console.error('tts failed', err);
  }

  return NextResponse.json({
    done: false,
    clientTurn: { id: clientTurn.id, text: clientTurn.text, emotionTag, intensity, persona: effectivePlan?.persona },
    evaluation,
    step: currentStep,
    clientAudio,
  });
}
