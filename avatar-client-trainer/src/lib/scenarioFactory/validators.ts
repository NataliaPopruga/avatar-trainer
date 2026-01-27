import type { ScenarioJson } from "@/lib/scenarioFactory/generator";

const PII_PATTERNS = [/passport/i, /card number/i, /cvv/i, /pin/i, /password/i];

export function validateScenario(scenario: ScenarioJson) {
  if (scenario.evidencePack.length === 0) {
    return { ok: false, reason: "NO_EVIDENCE" };
  }

  const clientLines = scenario.steps
    .filter((step) => step.role === "client")
    .map((step) => step.text)
    .join(" ");

  if (PII_PATTERNS.some((p) => p.test(clientLines))) {
    return { ok: false, reason: "PII_IN_CLIENT" };
  }

  return { ok: true as const };
}
