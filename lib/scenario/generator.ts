import { loadArchetypes } from './archetypes';
import { Difficulty, Persona, ScenarioPlan } from '@/lib/types';
import { randomFrom } from '@/lib/utils';
import { retrieveChunks } from '@/lib/providers/retrieval';

const personas: Persona[] = ['calm', 'anxious', 'aggressive', 'slangy', 'elderly', 'corporate', 'impatient'];
const difficulties: Difficulty[] = ['simple', 'hard', 'intolerant'];

function buildOpener(archetypeTitle: string, persona: Persona, difficulty: Difficulty) {
  const personaTone: Record<Persona, string> = {
    calm: 'говорит спокойно и вежливо',
    anxious: 'нервничает и переживает, но готов слушать',
    aggressive: 'говорит резко, перебивает и обвиняет',
    slangy: 'использует молодежный сленг и шуточки',
    elderly: 'говорит медленно, иногда отвлекается на детали',
    corporate: 'держится официально, требует регламентов',
    impatient: 'торопится, не любит долгих объяснений',
  };
  const difficultyHint: Record<Difficulty, string> = {
    simple: 'начинает с простой формулировки проблемы',
    hard: 'задает уточняющие вопросы, ищет несостыковки',
    intolerant: 'реагирует жестко на малейшие ошибки, может обострять диалог',
  };
  return `Сценарий: ${archetypeTitle}. Клиент ${personaTone[persona]}, ${difficultyHint[difficulty]}.`;
}

export async function generateScenario(mode: string): Promise<ScenarioPlan> {
  const archetypes = loadArchetypes();
  const fallbackArchetype = {
    id: 'fallback',
    title: 'Generic angry customer',
    summary: 'Клиент недоволен комиссией и скоростью ответа',
    topics: ['комиссии', 'поддержка', 'обслуживание'],
    sampleQuestions: ['Почему взяли комиссию?', 'Сколько ждать решения?', 'Кто отвечает за ошибку?'],
    gotchas: ['требует конкретные сроки', 'недоволен отсутствием прозрачности', 'перебивает оператора'],
    outcomes: ['объяснить комиссию и дать срок решения', 'извиниться и предложить компенсацию'],
  };
  const archetype = archetypes.length > 0 ? randomFrom(archetypes) : fallbackArchetype;
  const persona = randomFrom(personas);
  const difficulty = (mode === 'exam' ? randomFrom(['hard', 'intolerant']) : randomFrom(difficulties)) as Difficulty;
  const factsQuery = `${archetype.title} ${archetype.topics.join(' ')}`;
  const facts = (await retrieveChunks(factsQuery, 3)).map((c) => c.text.slice(0, 300));

  const plan: ScenarioPlan = {
    archetypeId: archetype.id,
    persona,
    difficulty,
    facts,
    opener: buildOpener(archetype.title, persona, difficulty),
    goal: randomFrom(archetype.outcomes),
    escalationTriggers: archetype.gotchas.slice(0, 3),
    pitfalls: archetype.gotchas.slice(0, 3),
  };
  return plan;
}
