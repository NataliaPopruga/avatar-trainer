type ParaphraseInput = {
  text: string;
  persona: string;
  channel: string;
};

type JudgeInput = {
  answer: string;
  context: string;
};

export type LLMProvider = {
  paraphrase(input: ParaphraseInput): Promise<string>;
  judgeSoftSkills(input: JudgeInput): Promise<{
    softSkillsScore: number;
    deEscalationScore: number;
    positives: string[];
    improvements: string[];
    suggestedAnswer?: string;
  }>;
};

const useLLM =
  process.env.USE_LLM === "true" && !!process.env.OPENAI_API_KEY;

async function callOpenAI(messages: Array<{ role: string; content: string }>) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

const mockProvider: LLMProvider = {
  async paraphrase({ text }) {
    return text;
  },
  async judgeSoftSkills() {
    return {
      softSkillsScore: 65,
      deEscalationScore: 60,
      positives: ["Keeps a calm tone"],
      improvements: ["Add empathy and structure"],
      suggestedAnswer: "",
    };
  },
};

const openAIProvider: LLMProvider = {
  async paraphrase({ text, persona, channel }) {
    const content = await callOpenAI([
      {
        role: "system",
        content:
          "You paraphrase bank client lines. No PII. 1-3 sentences only.",
      },
      {
        role: "user",
        content: `Paraphrase for persona "${persona}" in channel "${channel}". Line: ${text}`,
      },
    ]);
    return content || text;
  },
  async judgeSoftSkills({ answer, context }) {
    const content = await callOpenAI([
      {
        role: "system",
        content:
          "Score soft skills and de-escalation (0-100). Return JSON with fields: softSkillsScore, deEscalationScore, positives (array), improvements (array), suggestedAnswer.",
      },
      {
        role: "user",
        content: `Context: ${context}\nManager answer: ${answer}`,
      },
    ]);
    try {
      const parsed = JSON.parse(content);
      return {
        softSkillsScore: Number(parsed.softSkillsScore ?? 60),
        deEscalationScore: Number(parsed.deEscalationScore ?? 60),
        positives: parsed.positives ?? [],
        improvements: parsed.improvements ?? [],
        suggestedAnswer: parsed.suggestedAnswer ?? "",
      };
    } catch {
      return {
        softSkillsScore: 60,
        deEscalationScore: 60,
        positives: [],
        improvements: [],
        suggestedAnswer: "",
      };
    }
  },
};

export function getLLMProvider(): LLMProvider {
  return useLLM ? openAIProvider : mockProvider;
}
