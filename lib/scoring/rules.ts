import { detectAbuse } from '@/lib/moderation/profanity';

export type Metric = 'correctness' | 'compliance' | 'softSkills' | 'deEscalation';

export interface RuleOutcome {
  score: number;
  maxScore: number;
  hits: string[];
  misses: string[];
  penalties: string[];
}

export interface Signals {
  hasPlan: boolean;
  hasTimeline: boolean;
  hasClarify: boolean;
  hasEmpathy: boolean;
  hasPoliteness: boolean;
  hasCalming: boolean;
  noAnswer: boolean;
  noPlan: boolean;
  noEmpathy: boolean;
  pii: boolean;
  overpromise: boolean;
  abuse: ReturnType<typeof detectAbuse>;
}

const rePlan = /(сейчас|проверю|проверим|открою|создам|оформлю|отправлю|перезвоню|подскажу|помогу|запущу|запрос|оформим|решим)/i;
const reTimeline = /(минут|час(ов)?|день|срок|в течение|до конца)/i;
const reClarify = /(уточни|какой|что именно|когда|куда|какой тариф|какую карту)/i;
const reEmpathy = /(понимаю|сожалею|извин|вижу вашу ситуацию|могу помочь|постараюсь помочь)/i;
const rePolite = /(пожалуйста|будьте добры|не волнуйтесь|давайте|могу предложить)/i;
const reCalming = /(давайте я|сделаем так|возьму под контроль|открою обращение|зафиксирую|помогу решить)/i;
const reNoAnswer = /(не знаю|затрудняюсь|сложно сказать|обычно|как правило)/i;
const reOverpromise = /(гарантирую|точно|обещаю|без проблем решу)/i;
export const criticalPatterns = [/pin|cvv|otp|смс|sms|паспорт|полный номер карты/i];

export function detectSignals(text: string): Signals {
  const abuse = detectAbuse(text);
  const pii = criticalPatterns.some((r) => r.test(text));
  const hasPlan = rePlan.test(text);
  const hasTimeline = reTimeline.test(text);
  const hasClarify = reClarify.test(text);
  const hasEmpathy = reEmpathy.test(text);
  const hasPoliteness = rePolite.test(text);
  const hasCalming = reCalming.test(text);
  const noAnswer = reNoAnswer.test(text) && !hasPlan;
  const noPlan = !hasPlan;
  const noEmpathy = !hasEmpathy;
  const overpromise = reOverpromise.test(text);

  return { hasPlan, hasTimeline, hasClarify, hasEmpathy, hasPoliteness, hasCalming, noAnswer, noPlan, noEmpathy, pii, overpromise, abuse };
}

export function applyRules(answer: string) {
  const signals = detectSignals(answer);
  const mk = (): RuleOutcome => ({ score: 0, maxScore: 0, hits: [], misses: [], penalties: [] });
  const result: Record<Metric, RuleOutcome> = {
    correctness: mk(),
    compliance: mk(),
    softSkills: mk(),
    deEscalation: mk(),
  };

  // Correctness
  const correctnessRules = [
    { desc: 'Есть конкретный шаг', cond: signals.hasPlan, weight: 35 },
    { desc: 'Есть срок/таймлайн', cond: signals.hasTimeline, weight: 20 },
    { desc: 'Есть уточняющий вопрос', cond: signals.hasClarify, weight: 15 },
    { desc: 'Нет ответа "не знаю"', cond: !signals.noAnswer, weight: 30 },
  ];
  correctnessRules.forEach((r) => {
    result.correctness.maxScore += r.weight;
    if (r.cond) {
      result.correctness.score += r.weight;
      result.correctness.hits.push(r.desc);
    } else {
      result.correctness.misses.push(r.desc);
    }
  });

  // Compliance
  const complianceRules = [
    { desc: 'Не запрашивает ПДн/карты', cond: !signals.pii, weight: 40 },
    { desc: 'Нет хамства/оскорблений', cond: !signals.abuse.isAbusive, weight: 40 },
    { desc: 'Нет необоснованных обещаний', cond: !signals.overpromise, weight: 20 },
  ];
  complianceRules.forEach((r) => {
    result.compliance.maxScore += r.weight;
    if (r.cond) {
      result.compliance.score += r.weight;
      result.compliance.hits.push(r.desc);
    } else {
      result.compliance.misses.push(r.desc);
    }
  });

  // Soft skills
  const softRules = [
    { desc: 'Есть эмпатия/признание', cond: signals.hasEmpathy, weight: 45 },
    { desc: 'Вежливый тон', cond: signals.hasPoliteness, weight: 30 },
    { desc: 'Без грубости', cond: !signals.abuse.isAbusive, weight: 25 },
  ];
  softRules.forEach((r) => {
    result.softSkills.maxScore += r.weight;
    if (r.cond) {
      result.softSkills.score += r.weight;
      result.softSkills.hits.push(r.desc);
    } else {
      result.softSkills.misses.push(r.desc);
    }
  });

  // De-escalation
  const deRules = [
    { desc: 'Берёт на себя следующий шаг/контроль', cond: signals.hasPlan || signals.hasCalming, weight: 45 },
    { desc: 'Использует успокаивающие формулировки', cond: signals.hasCalming, weight: 30 },
    { desc: 'Не усугубляет конфликт', cond: !signals.abuse.isAbusive, weight: 25 },
  ];
  deRules.forEach((r) => {
    result.deEscalation.maxScore += r.weight;
    if (r.cond) {
      result.deEscalation.score += r.weight;
      result.deEscalation.hits.push(r.desc);
    } else {
      result.deEscalation.misses.push(r.desc);
    }
  });

  const percentage = (metric: Metric) =>
    result[metric].maxScore === 0 ? 0 : Math.round((result[metric].score / result[metric].maxScore) * 100);

  return { abuse: signals.abuse, result, percentage, signals };
}

export function detectRegulationReference(text: string) {
  const re = /(согласно|по|в)\s+(регламент|инструкц|правил|kb|баз[еы]\s+знан)/i;
  const m = text.match(re);
  if (!m) return null;
  return { quote: m[0], reason: 'Ссылка на регламент/KB' };
}
