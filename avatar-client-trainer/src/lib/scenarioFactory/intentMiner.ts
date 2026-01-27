type QuestionInput = {
  question: string;
  count: number;
  domain?: string | null;
};

export type MinedIntent = {
  title: string;
  exampleQuestions: string[];
  frequencyScore: number;
  domain?: string | null;
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function similarity(a: string, b: string) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  const intersection = [...aTokens].filter((t) => bTokens.has(t)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return intersection / union;
}

export function mineIntents(questions: QuestionInput[]): MinedIntent[] {
  const intents: MinedIntent[] = [];
  for (const q of questions) {
    let matched: MinedIntent | null = null;
    for (const intent of intents) {
      const score = similarity(q.question, intent.title);
      if (score >= 0.4) {
        matched = intent;
        break;
      }
    }

    if (!matched) {
      intents.push({
        title: q.question,
        exampleQuestions: [q.question],
        frequencyScore: q.count,
        domain: q.domain ?? undefined,
      });
    } else {
      matched.exampleQuestions.push(q.question);
      matched.frequencyScore += q.count;
    }
  }

  return intents.sort((a, b) => b.frequencyScore - a.frequencyScore);
}
