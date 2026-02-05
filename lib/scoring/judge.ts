import { z } from 'zod';
import { retrieveChunks } from '@/lib/providers/retrieval';
import { ScenarioPlan } from '@/lib/types';
import { applyRules, criticalPatterns, detectRegulationReference } from './rules';
import { detectAbuse } from '@/lib/moderation/profanity';

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
  // evidence может приходить как из RAG (chunkId/docId/score),
  // так и наши rule-based факты (id/ruleId/evidence[]). Даем более свободную схему.
  evidence: z.array(
    z.union([
      z.object({
        chunkId: z.number().optional(),
        docId: z.number().optional(),
        text: z.string().optional(),
        title: z.string().optional(),
        score: z.number().optional(),
        source: z.string().optional(),
      }),
      z.object({
        id: z.string().optional(),
        title: z.string().optional(),
        category: z.string().optional(),
        ruleId: z.string().optional(),
        evidence: z.any().optional(),
      }),
      z.record(z.any()),
    ])
  ),
  total: z.number(),
  pass: z.boolean(),
  explain: z.any(),
});

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

export async function judgeAnswer(answer: string, plan: ScenarioPlan) {
  const chunks = await retrieveChunks(answer, 3);
  const { abuse, result, percentage, signals } = applyRules(answer);
  const flags: string[] = [];

  const criticalPII = signals.pii;
  if (criticalPII) flags.push('PII_DETECTED_STRONG');
  if (abuse.isAbusive) flags.push('ABUSE_PROFANITY');

  const scores = {
    correctness: percentage('correctness'),
    compliance: percentage('compliance'),
    softSkills: percentage('softSkills'),
    deEscalation: percentage('deEscalation'),
  };

  if (abuse.isAbusive || criticalPII) {
    scores.compliance = 0;
    scores.softSkills = 0;
    scores.deEscalation = 0;
  }

  const total = clamp(Math.round(scores.correctness * 0.35 + scores.compliance * 0.35 + scores.softSkills * 0.2 + scores.deEscalation * 0.1));
  const pass = scores.compliance >= 85 && total >= 70 && !abuse.isAbusive && !criticalPII;

  const strengths: any[] = [];
  const mistakes: any[] = [];

  const addStrength = (id: string, title: string, metric: string) =>
    strengths.push({
      id,
      title,
      metric,
      category: 'strength',
      ruleId: id,
      evidence: [{ turnId: 'current', role: 'agent', quote: answer, reason: title }],
    });
  const addMistake = (id: string, title: string, metric: string, severity: 'minor' | 'major' | 'critical' = 'major') =>
    mistakes.push({
      id,
      title,
      metric,
      severity,
      category: 'mistake',
      ruleId: id,
      evidence: [{ turnId: 'current', role: 'agent', quote: answer, reason: title }],
    });

  if (signals.hasEmpathy) addStrength('EMPATHY', 'Есть эмпатия/признание проблемы', 'softSkills');
  if (signals.hasPlan) addStrength('PLAN', 'Есть конкретный следующий шаг', 'correctness');
  if (!criticalPII && !abuse.isAbusive) addStrength('COMPLIANCE_OK', 'Соблюдены правила безопасности', 'compliance');

  if (signals.noAnswer) addMistake('NO_ANSWER', 'Нет ответа по сути или уверенности', 'correctness');
  if (signals.noPlan) addMistake('NO_PLAN', 'Нет конкретного шага или действия', 'correctness');
  if (signals.noEmpathy) addMistake('NO_EMPATHY', 'Нет признания проблемы/эмпатии', 'softSkills', 'minor');
  if (criticalPII) addMistake('PII_REQUEST', 'Запрос конфиденциальных данных недопустим', 'compliance', 'critical');
  if (abuse.isAbusive) addMistake('ABUSE', 'Недопустимый тон/хамство', 'compliance', 'critical');
  if (signals.overpromise) addMistake('OVERPROMISE', 'Обещание результата без проверки', 'compliance', 'major');

  const regRef = detectRegulationReference(answer);

  const evidence = [
    ...chunks.map((c) => ({ ...c, category: 'source' as const })),
    ...strengths,
    ...mistakes,
  ];

  const topicText = (plan?.goal || '').toLowerCase();
  const scenarioHint =
    topicText.includes('накоп') || topicText.includes('вклад')
      ? 'Понимаю, сейчас подскажу. Уточните, нужен накопительный счёт с пополнением или вклад на срок? В приложении: «Счета и вклады» → «Открыть» → «Накопительный счёт», выберите сумму/условия. Процент зависит от тарифа и остатка; назову точнее, если скажете ваш тариф.'
      : 'Признайте проблему, уточните детали запроса, предложите конкретный шаг и срок решения.';
  const suggested = scenarioHint;

  const explain = {
    correctness: { ...result.correctness, percent: scores.correctness },
    compliance: { ...result.compliance, percent: scores.compliance },
    softSkills: { ...result.softSkills, percent: scores.softSkills },
    deEscalation: { ...result.deEscalation, percent: scores.deEscalation },
    signals,
    critical: { abuse: abuse.matched, pii: criticalPII },
  };

  const out = {
    scores,
    flags,
    positives: strengths.map((s) => s.title),
    mistakes: mistakes.map((m) => m.title),
    suggested,
    evidence: regRef
      ? [
          ...evidence,
          {
            id: 'ref-reg',
            title: 'Ссылка на регламент',
            category: 'strength',
            ruleId: 'reference_regulation',
            evidence: [{ turnId: 'current', role: 'agent', quote: regRef.quote, reason: regRef.reason }],
          },
        ]
      : evidence,
    total,
    pass,
    explain,
  };

  return evaluationSchema.parse(out);
}
