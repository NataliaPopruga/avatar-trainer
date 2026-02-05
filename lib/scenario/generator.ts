import { loadArchetypes } from './archetypes';
import { Difficulty, Persona, ScenarioPlan } from '@/lib/types';
import { randomFrom } from '@/lib/utils';
import { retrieveChunks } from '@/lib/providers/retrieval';

const personas: Persona[] = ['calm', 'anxious', 'aggressive', 'slangy', 'elderly', 'corporate', 'impatient', 'gopnik'];
const difficulties: Difficulty[] = ['simple', 'hard', 'intolerant'];
const useLLM = process.env.USE_LLM === 'true' && !!process.env.OPENAI_API_KEY;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 2000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

function buildOpener(archetypeTitle: string, persona: Persona, difficulty: Difficulty) {
  const personaTone: Record<Persona, string> = {
    calm: 'говорит спокойно и вежливо',
    anxious: 'нервничает и переживает, но готов слушать',
    aggressive: 'говорит резко, перебивает и обвиняет',
    slangy: 'использует молодежный сленг и шуточки',
    elderly: 'говорит медленно, иногда отвлекается на детали',
    corporate: 'держится официально, требует регламентов',
    impatient: 'торопится, не любит долгих объяснений',
    zoomer: 'говорит коротко, молодежно, но по делу',
    gopnik: 'коротко, холодно, без лишних извинений',
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
  
  // Улучшаем запрос к базе знаний: используем более специфичные ключевые слова из архетипа
  const factsQuery = `${archetype.title} ${archetype.topics.join(' ')} ${archetype.summary || ''}`;
  const allFacts = await retrieveChunks(factsQuery, 5);
  
  // Функция для очистки текста от markdown и обрезки по предложениям
  const cleanAndTrimFact = (text: string, maxLength: number): string => {
    // Убираем markdown
    let cleaned = text
      .replace(/^#+\s*/gm, '') // Заголовки
      .replace(/^-\s*/gm, '') // Списки
      .replace(/\*\*/g, '') // Жирный текст
      .replace(/\*/g, '') // Курсив
      .replace(/`/g, '') // Код
      .replace(/\n{2,}/g, ' ') // Множественные переносы
      .trim();
    
    // Обрезаем по границам предложений, если текст длиннее maxLength
    if (cleaned.length > maxLength) {
      const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
      let result = '';
      for (const sentence of sentences) {
        if ((result + sentence).length <= maxLength) {
          result += sentence;
        } else {
          break;
        }
      }
      // Если не нашли предложения или результат слишком короткий, обрезаем по словам
      if (result.length < maxLength * 0.5) {
        const words = cleaned.split(/\s+/);
        result = words.slice(0, Math.floor(maxLength / 10)).join(' ');
        if (result.length < cleaned.length) {
          result += '...';
        }
      }
      return result.trim();
    }
    return cleaned;
  };
  
  // Фильтруем факты по релевантности: они должны содержать ключевые слова из архетипа
  const archetypeKeywords = [
    ...archetype.topics.map(t => t.toLowerCase()),
    ...archetype.title.toLowerCase().split(' ').filter(w => w.length > 4), // Только слова длиннее 4 символов
  ];
  
  const relevantFacts = allFacts
    .filter(chunk => {
      // Требуем более высокий score для релевантности
      if (chunk.score < 0.5) return false;
      
      const chunkText = chunk.text.toLowerCase();
      // Проверяем, что факт содержит хотя бы одно ключевое слово
      const hasKeyword = archetypeKeywords.some(keyword => 
        keyword.length > 4 && chunkText.includes(keyword)
      );
      
      // Исключаем факты, которые явно не релевантны (содержат общие инструкции)
      const isInstruction = /рекомендации|кросс-функциональные|для злых|уменьшить скорость/i.test(chunkText);
      
      return hasKeyword && !isInstruction;
    })
    .map((c) => cleanAndTrimFact(c.text, 200)); // Очищаем и обрезаем до 200 символов
  
  // Если нет релевантных фактов, не используем факты вообще
  const facts = relevantFacts;

  const generatePlanLLM = async () => {
    const messages = [
      {
        role: 'system',
        content:
          'Ты создаёшь план сценария диалога (не сам диалог). Верни JSON с ключами: opener, goal, escalationTriggers (3 элемента), pitfalls (3 элемента). Коротко, по-русски. Сценарий должен проверять: представился ли сотрудник, вежливость, решение вопроса по сути, отсутствие мата/грубости.',
      },
      {
        role: 'user',
        content: [
          `Архетип: ${archetype.title} — ${archetype.summary}`,
          `Темы: ${archetype.topics?.join(', ')}`,
          `Сложность: ${difficulty}, персона: ${persona}`,
          facts.length ? `Факты: ${facts.join(' | ')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ];
    const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.6, messages }),
    });
    if (!res.ok) throw new Error(`LLM scenario error: ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '{}';
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

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
  if (useLLM) {
    try {
      const llmPlan = await generatePlanLLM();
      return {
        ...plan,
        opener: llmPlan.opener || plan.opener,
        goal: llmPlan.goal || plan.goal,
        escalationTriggers: llmPlan.escalationTriggers || plan.escalationTriggers,
        pitfalls: llmPlan.pitfalls || plan.pitfalls,
      };
    } catch (err) {
      console.error('scenario LLM fallback', err);
    }
  }
  return plan;
}
