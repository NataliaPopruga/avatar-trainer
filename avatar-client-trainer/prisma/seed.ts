import { prisma } from "../src/lib/prisma";
import { chunkDocument } from "../src/lib/chunking";
import { mineIntents } from "../src/lib/scenarioFactory/intentMiner";
import { buildScenarioPool } from "../src/lib/scenarioFactory";
import fs from "node:fs";
import path from "node:path";

function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const rows = lines.slice(1).map((line) => line.split(","));
  return rows.map(([question, count, domain]) => ({
    question: (question ?? "").trim(),
    count: Number(count ?? "1"),
    domain: domain?.trim() || undefined,
  }));
}

async function main() {
  await prisma.feedback.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.turn.deleteMany();
  await prisma.session.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.question.deleteMany();
  await prisma.intent.deleteMany();
  await prisma.knowledgeChunk.deleteMany();
  await prisma.knowledgeDoc.deleteMany();

  const kbPath = path.join(process.cwd(), "seed", "docs", "sample_kb.md");
  const kbContent = fs.readFileSync(kbPath, "utf8");
  const version = new Date().toISOString();

  const doc = await prisma.knowledgeDoc.create({
    data: {
      title: "Sample Bank KB",
      content: kbContent,
      version,
    },
  });

  const chunks = chunkDocument(kbContent);
  for (const chunk of chunks) {
    await prisma.knowledgeChunk.create({
      data: {
        docId: doc.id,
        docTitle: doc.title,
        docVersion: doc.version,
        text: chunk.text,
      },
    });
  }

  const questionsPath = path.join(process.cwd(), "seed", "questions.csv");
  const questionsContent = fs.readFileSync(questionsPath, "utf8");
  const questions = parseCsv(questionsContent);
  for (const q of questions) {
    await prisma.question.create({
      data: {
        question: q.question,
        count: q.count,
        domain: q.domain,
      },
    });
  }

  const storedQuestions = await prisma.question.findMany();
  const intents = mineIntents(
    storedQuestions.map((q) => ({
      question: q.question,
      count: q.count,
      domain: q.domain ?? undefined,
    }))
  );

  for (const intent of intents) {
    const created = await prisma.intent.create({
      data: {
        title: intent.title,
        exampleQuestions: intent.exampleQuestions,
        frequencyScore: intent.frequencyScore,
        domain: intent.domain,
      },
    });

    await prisma.question.updateMany({
      where: { question: { in: intent.exampleQuestions } },
      data: { intentId: created.id },
    });
  }

  const intentRows = await prisma.intent.findMany({ take: 10 });
  const scenarios = await buildScenarioPool({
    intents: intentRows.map((i) => ({ id: i.id, title: i.title })),
    countPerIntent: 3,
  });

  const personaAllowed = new Set(['calm', 'anxious', 'impatient']);
  const channelAllowed = new Set(['chat', 'call']);

  for (const scenario of scenarios) {
    const persona = personaAllowed.has(scenario.persona) ? scenario.persona : 'calm';
    const channel = channelAllowed.has((scenario as any).channel) ? (scenario as any).channel : 'chat';
    const payload: any = {
      ...scenario,
      persona,
      channel,
      jsonBlob: (scenario as any).jsonBlob,
    };
    await prisma.scenario.create({ data: payload });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
