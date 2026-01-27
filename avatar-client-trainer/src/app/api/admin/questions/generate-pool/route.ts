import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildScenarioPool } from "@/lib/scenarioFactory";
import { ensureDbReady } from "@/lib/db/ensure";

export async function POST() {
  await ensureDbReady();
  const intents = await prisma.intent.findMany({ take: 15 });
  await prisma.scenario.deleteMany();

  const scenarios = await buildScenarioPool({
    intents: intents.map((intent) => ({ id: intent.id, title: intent.title })),
    countPerIntent: 2,
  });

  for (const scenario of scenarios) {
    await prisma.scenario.create({ data: scenario });
  }

  return NextResponse.json({ ok: true, scenarios: scenarios.length });
}
