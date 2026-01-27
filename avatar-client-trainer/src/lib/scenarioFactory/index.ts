import { generateScenario } from "@/lib/scenarioFactory/generator";
import { isTooSimilar } from "@/lib/scenarioFactory/dedup";
import { validateScenario } from "@/lib/scenarioFactory/validators";

export async function buildScenarioPool(params: {
  intents: Array<{ id: string; title: string }>;
  countPerIntent: number;
}) {
  const scenarios: Array<{
    intentId: string;
    difficulty: "simple" | "hard" | "intolerant";
    persona: string;
    channel: string;
    difficultyScore: number;
    jsonBlob: unknown;
  }> = [];

  const existingTexts: string[] = [];
  const difficulties: Array<"simple" | "hard" | "intolerant"> = [
    "simple",
    "hard",
    "intolerant",
  ];

  let seed = 0;
  for (const intent of params.intents) {
    for (let i = 0; i < params.countPerIntent; i += 1) {
      const difficulty = difficulties[(seed + i) % difficulties.length];
      const scenario = await generateScenario({
        intentTitle: intent.title,
        difficulty,
        seed: seed + i,
      });

      const validation = validateScenario(scenario);
      if (!validation.ok) continue;

      const textForDedup = scenario.steps.map((s) => s.text).join(" ");
      if (isTooSimilar(textForDedup, existingTexts)) continue;

      existingTexts.push(textForDedup);
      scenarios.push({
        intentId: intent.id,
        difficulty,
        persona: scenario.persona as string,
        channel: scenario.channel as string,
        difficultyScore: difficulty === "simple" ? 30 : difficulty === "hard" ? 60 : 80,
        jsonBlob: scenario,
      });
    }
    seed += 3;
  }

  return scenarios;
}
