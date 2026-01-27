export type LLMProvider = 'mock' | 'openai';

export function currentLLMProvider(): LLMProvider {
  const key = process.env.OPENAI_API_KEY;
  return key ? 'openai' : 'mock';
}

export function buildSystemPrompt() {
  return `Ты — аватар клиента. Не проси ПДн. Говори 1–3 предложения.`;
}
