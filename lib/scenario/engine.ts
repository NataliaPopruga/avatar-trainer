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
  zoomer: 'Молодёжный тон',
  gopnik: 'Холодный, слегка раздраженный голос',
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
  
  // Факты из базы знаний не добавляются в сообщения клиента
  return first;
}

export function nextClientMessage(plan: ScenarioPlan, step: number, evaluationScore: number) {
  const archetype = loadArchetypes().find((a) => a.id === plan.archetypeId);
  const followUps = archetype?.sampleQuestions ?? [];

  if (evaluationScore < 55) {
    const escalation = randomFrom(escalationLines);
    return `${escalation} ${randomFrom(plan.escalationTriggers)}`.trim();
  }

  const question = followUps[(step + 1) % followUps.length] || 'И что вы предлагаете сделать дальше?';
  
  // Факты из базы знаний не добавляются в сообщения клиента
  return question;
}
