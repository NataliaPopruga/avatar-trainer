import { getLLMProvider } from "@/lib/providers/llm";
import { getRetrievalProvider } from "@/lib/providers/retrieval";
import { EvaluationSchema, EvaluationResult } from "@/types/evaluation";

type ScenarioShape = {
  intentTitle: string;
  expectedActions: string[];
  complianceTraps: string[];
};

const PII_PATTERNS = [
  /passport/i,
  /card number/i,
  /cvv/i,
  /cvc/i,
  /pin/i,
  /password/i,
  /sms/i,
  /code/i,
];

const PROMISE_PATTERNS = [/guarantee/i, /promise/i, /certain/i, /no problem/i];

function containsAny(text: string, patterns: RegExp[]) {
  return patterns.some((p) => p.test(text));
}

function missingExpectedActions(answer: string, expected: string[]) {
  const lower = answer.toLowerCase();
  return expected.filter((item) => !lower.includes(item.toLowerCase()));
}

export async function scoreAnswer(params: {
  answer: string;
  scenario: ScenarioShape;
  mode: "exam" | "training";
  contextText: string;
}): Promise<EvaluationResult> {
  const { answer, scenario, contextText } = params;
  const flags: EvaluationResult["flags"] = [];
  const positives: string[] = [];
  const improvements: string[] = [];

  if (containsAny(answer, PII_PATTERNS)) {
    flags.push({
      code: "PII_REQUEST",
      severity: "high",
      message: "Potential PII request detected.",
      evidenceChunkIds: [],
    });
  }

  if (containsAny(answer, PROMISE_PATTERNS)) {
    flags.push({
      code: "PROMISE",
      severity: "med",
      message: "Inappropriate promise of outcome.",
      evidenceChunkIds: [],
    });
  }

  const missing = missingExpectedActions(answer, scenario.expectedActions);
  if (missing.length > 0) {
    flags.push({
      code: "MISSING_STEPS",
      severity: "med",
      message: `Missing required steps: ${missing.join(", ")}`,
      evidenceChunkIds: [],
    });
    improvements.push("Add required steps and a clear structure.");
  }

  const retrieval = getRetrievalProvider();
  const evidenceChunks = await retrieval.search(
    `${scenario.intentTitle} ${answer}`,
    undefined,
    3
  );

  const evidence = evidenceChunks.map((chunk) => ({
    chunkId: chunk.id,
    docTitle: chunk.docTitle,
    snippet: chunk.snippet,
  }));

  let correctness = evidence.length > 0 ? 70 : 40;
  if (/i don't know/i.test(answer)) correctness -= 10;
  if (missing.length === 0) correctness += 10;
  if (evidence.length === 0) correctness = Math.min(correctness, 40);
  correctness = Math.max(0, Math.min(100, correctness));

  if (evidence.length === 0) {
    flags.push({
      code: "INSUFFICIENT_EVIDENCE",
      severity: "med",
      message: "Insufficient evidence from knowledge base.",
      evidenceChunkIds: [],
    });
  }

  let compliance = 100;
  if (flags.some((f) => f.code === "PII_REQUEST")) compliance = 20;
  if (flags.some((f) => f.code === "PROMISE")) compliance -= 20;
  if (flags.some((f) => f.code === "MISSING_STEPS")) compliance -= 15;
  compliance = Math.max(0, Math.min(100, compliance));

  const llm = getLLMProvider();
  const soft = await llm.judgeSoftSkills({
    answer,
    context: contextText,
  });

  if (soft.positives.length) positives.push(...soft.positives);
  if (soft.improvements.length) improvements.push(...soft.improvements);

  const result: EvaluationResult = {
    scores: {
      correctness,
      compliance,
      softSkills: Math.max(0, Math.min(100, soft.softSkillsScore)),
      deEscalation: Math.max(0, Math.min(100, soft.deEscalationScore)),
    },
    flags,
    positives,
    improvements,
    suggestedAnswer: soft.suggestedAnswer ?? "",
    evidence,
  };

  return EvaluationSchema.parse(result);
}
