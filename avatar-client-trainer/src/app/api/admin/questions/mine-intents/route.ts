import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mineIntents } from "@/lib/scenarioFactory/intentMiner";
import { ensureDbReady } from "@/lib/db/ensure";

export async function POST() {
  await ensureDbReady();
  await prisma.scenario.deleteMany();
  await prisma.intent.deleteMany();
  await prisma.question.updateMany({ data: { intentId: null } });

  const questions = await prisma.question.findMany();
  const intents = mineIntents(
    questions.map((q) => ({
      question: q.question,
      count: q.count,
      domain: q.domain ?? undefined,
    }))
  );

  let createdCount = 0;
  for (const intent of intents) {
    const created = await prisma.intent.create({
      data: {
        title: intent.title,
        exampleQuestions: intent.exampleQuestions,
        frequencyScore: intent.frequencyScore,
        domain: intent.domain,
      },
    });
    createdCount += 1;
    await prisma.question.updateMany({
      where: { question: { in: intent.exampleQuestions } },
      data: { intentId: created.id },
    });
  }

  return NextResponse.json({ ok: true, intents: createdCount });
}
