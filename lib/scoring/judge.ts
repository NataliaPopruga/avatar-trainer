import { z } from 'zod';
import { retrieveChunks } from '@/lib/providers/retrieval';
import { ScenarioPlan } from '@/lib/types';

const evaluationSchema = z.object({
  scores: z.object({
    correctness: z.number(),
    compliance: z.number(),
    softSkills: z.number(),
    deEscalation: z.number(),
  }),
  flags: z.array(z.string()),
  positives: z.array(z.string()),
  mistakes: z.array(z.string()),
  suggested: z.string(),
  evidence: z.array(
    z.object({
      chunkId: z.number().optional(),
      docId: z.number().optional(),
      text: z.string(),
      title: z.string().optional(),
      score: z.number().optional(),
      source: z.string().optional(),
    })
  ),
  total: z.number(),
  pass: z.boolean(),
});

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

const bannedPatterns = [/\b\d{4} \d{4} \d{4} \d{4}\b/, /cvv/i, /pin/i, /otp/i];

function complianceScore(answer: string) {
  let score = 90;
  const flags: string[] = [];
  if (bannedPatterns.some((r) => r.test(answer))) {
    score = 35;
    flags.push('PII_DETECTED');
  }
  if (/обещаю|гарантирую/i.test(answer)) {
    score -= 15;
    flags.push('OVERPROMISE');
  }
  if (!/не (видит|запрашиваем|нужны) данные/i.test(answer)) {
    score -= 5;
  }
  return { score: clamp(score), flags };
}

function softSkillsScore(answer: string) {
  let score = 70;
  if (/понимаю|вижу|сожалею|простите|давайте/i.test(answer)) score += 10;
  if (/пожалуйста|можете|готов/i.test(answer)) score += 5;
  if (answer.length < 40) score -= 10;
  return clamp(score);
}

function deEscalationScore(answer: string, plan: ScenarioPlan) {
  let score = 60;
  if (plan.difficulty === 'intolerant') score -= 10;
  if (/давайте.*решим|я помогу|держу вас в курсе|сейчас проверю/i.test(answer)) score += 15;
  if (/успокойтесь|тише/i.test(answer)) score -= 10;
  return clamp(score);
}

export async function judgeAnswer(answer: string, plan: ScenarioPlan) {
  const evidence = await retrieveChunks(answer, 3);
  const hasEvidence = evidence.length > 0;
  let correctness = hasEvidence ? 70 + Math.min(20, evidence[0]?.score ?? 0) : 35;
  if (/не знаю|затрудняюсь/i.test(answer)) correctness -= 15;
  correctness = clamp(correctness);

  const compliance = complianceScore(answer);
  const softSkills = softSkillsScore(answer);
  const deEscalation = deEscalationScore(answer, plan);

  const total = clamp(Math.round(correctness * 0.35 + compliance.score * 0.35 + softSkills * 0.2 + deEscalation * 0.1));
  const pass = compliance.score >= 85 && total >= 70 && !compliance.flags.includes('PII_DETECTED');

  const positives: string[] = [];
  if (softSkills >= 75) positives.push('Хорошая эмпатия и структура ответа');
  if (hasEvidence) positives.push('Ссылается на регламент');

  const mistakes: string[] = [];
  if (!hasEvidence) {
    mistakes.push('Недостаточно ссылок на базу знаний');
    compliance.flags.push('INSUFFICIENT_EVIDENCE');
  }
  if (compliance.flags.includes('PII_DETECTED')) mistakes.push('Запрос конфиденциальных данных недопустим');

  const suggested = `Сошлитесь на регламент (${plan.facts[0] || 'правила сервиса'}), предложите шаги и предупредите, что не запрашиваете коды/карты.`;

  const result = {
    scores: {
      correctness,
      compliance: compliance.score,
      softSkills,
      deEscalation,
    },
    flags: compliance.flags,
    positives,
    mistakes,
    suggested,
    evidence,
    total,
    pass,
  };

  return evaluationSchema.parse(result);
}
