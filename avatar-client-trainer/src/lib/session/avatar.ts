type ScenarioShape = {
  persona: string;
  channel: string;
  context: string;
  expectedActions: string[];
};

const PII_PATTERNS = [/passport/i, /card number/i, /cvv/i, /pin/i, /password/i];

function missingActions(answer: string, expected: string[]) {
  const lower = answer.toLowerCase();
  return expected.filter((item) => !lower.includes(item.toLowerCase()));
}

export function nextClientReply(params: {
  scenario: ScenarioShape;
  managerAnswer: string;
  turnCount: number;
}) {
  const { scenario, managerAnswer, turnCount } = params;
  if (PII_PATTERNS.some((p) => p.test(managerAnswer))) {
    return "I cannot share that data. What can we do without it?";
  }

  const missing = missingActions(managerAnswer, scenario.expectedActions);
  if (missing.length > 0) {
    return `It is still unclear. Can you clarify ${missing[0]}?`;
  }

  if (scenario.persona === "impatient" && turnCount > 1) {
    return "I need a solution right now. What should I do next?";
  }

  if (scenario.persona === "anxious") {
    return "I am worried this is urgent. Can you confirm the next step?";
  }

  return "Thanks. What should I do right now?";
}
