import { loadArchetypes } from '@/lib/scenario/archetypes';
import { Difficulty, Persona, ScenarioPlan } from '@/lib/types';
import { randomFrom } from '@/lib/utils';

const personaVoices: Record<Persona, string> = {
  calm: 'Спокойный тон',
  anxious: 'Взволнованный голос',
  aggressive: 'Резкий голос',
  slangy: 'Сленговый голос',
  elderly: 'Неторопливый голос',
  corporate: 'Официальный тон',
  impatient: 'Торопливый голос',
};

const escalationLines = [
  'Вы мне можете конкретно объяснить, что вы сейчас сделаете?',
  'Почему это не было сказано сразу? Это несерьезно.',
  'У меня нет времени слушать общие слова, отвечайте по делу.',
];

function tonePrefix(persona: Persona, difficulty: Difficulty) {
  const base = personaVoices[persona];
  const suffix = difficulty === 'intolerant' ? ' и нетерпеливый' : difficulty === 'hard' ? ' и требовательный' : '';
  return `${base}${suffix}`;
}

export function initialClientMessage(plan: ScenarioPlan) {
  const archetype = loadArchetypes().find((a) => a.id === plan.archetypeId);
  const first = archetype?.sampleQuestions[0] ?? 'У меня есть проблема, помогите разобраться.';
  const factHint = plan.facts[0] ? ` В регламенте у вас написано: "${plan.facts[0].slice(0, 120)}"` : '';
  return `${tonePrefix(plan.persona, plan.difficulty)}: ${plan.opener} ${first}${factHint}`;
}

export function nextClientMessage(plan: ScenarioPlan, step: number, evaluationScore: number) {
  const archetype = loadArchetypes().find((a) => a.id === plan.archetypeId);
  const followUps = archetype?.sampleQuestions ?? [];
  const safetyLine = 'Только давайте без лишних данных — мне не нужны номера карт или коды.';
  const personaTone = tonePrefix(plan.persona, plan.difficulty);

  if (evaluationScore < 55) {
    const escalation = randomFrom(escalationLines);
    return `${personaTone}: ${escalation} ${randomFrom(plan.escalationTriggers)} ${safetyLine}`;
  }

  const question = followUps[(step + 1) % followUps.length] || 'И что вы предлагаете сделать дальше?';
  const fact = plan.facts[(step + 1) % plan.facts.length];
  const factLine = fact ? ` Учтите, что по правилам: ${fact.slice(0, 140)}.` : '';
  return `${personaTone}: ${question}${factLine} ${safetyLine}`;
}
