import { getLLMProvider } from "@/lib/providers/llm";
import { getRetrievalProvider } from "@/lib/providers/retrieval";

export type ScenarioJson = {
  persona: string;
  channel: string;
  context: string;
  steps: Array<{
    role: "client" | "manager";
    text: string;
    trigger?: string;
  }>;
  expectedActions: string[];
  complianceTraps: string[];
  evidencePack: Array<{ chunkId: string; docTitle: string; snippet: string }>;
};

const PERSONAS = ["calm", "anxious", "impatient"] as const;
const CHANNELS = ["chat", "call"] as const;
const CONTEXTS = ["first_time", "already_tried", "urgent"] as const;

const TEMPLATES = [
  "Hello, I have a question about {intent}.",
  "I urgently need help with {intent}.",
  "I already tried to resolve {intent}, but it did not work.",
];

export async function generateScenario(params: {
  intentTitle: string;
  difficulty: "simple" | "hard" | "intolerant";
  seed: number;
}) {
  const persona = PERSONAS[params.seed % PERSONAS.length];
  const channel = CHANNELS[(params.seed + 1) % CHANNELS.length];
  const context = CONTEXTS[(params.seed + 2) % CONTEXTS.length];
  const template = TEMPLATES[params.seed % TEMPLATES.length];
  const baseLine = template.replace("{intent}", params.intentTitle);

  const llm = getLLMProvider();
  const clientLine = await llm.paraphrase({
    text: baseLine,
    persona,
    channel,
  });

  const expectedActions = ["clarify", "check", "explain", "offer"];

  const complianceTraps =
    params.difficulty === "intolerant"
      ? ["client asks for a code", "client pressures for a promise"]
      : ["client is rushing", "client asks for an exception"];

  const retrieval = getRetrievalProvider();
  const evidencePack = await retrieval.search(params.intentTitle, undefined, 3);

  const scenario: ScenarioJson = {
    persona,
    channel,
    context,
    steps: [
      { role: "client", text: clientLine },
      { role: "manager", text: "" },
    ],
    expectedActions,
    complianceTraps,
    evidencePack: evidencePack.map((chunk) => ({
      chunkId: chunk.id,
      docTitle: chunk.docTitle,
      snippet: chunk.snippet,
    })),
  };

  return scenario;
}
