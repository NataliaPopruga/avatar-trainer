import { prisma } from "@/lib/prisma";
import { chunkDocument } from "@/lib/chunking";
import { mineIntents } from "@/lib/scenarioFactory/intentMiner";
import { buildScenarioPool } from "@/lib/scenarioFactory";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

let initializing: Promise<void> | null = null;

async function tableExists(name: string) {
  const rows = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT name FROM sqlite_master WHERE type='table' AND name=${name}`;
  return rows.length > 0;
}

async function createSchema() {
  const statements = [
    `CREATE TABLE "User" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT UNIQUE,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE "KnowledgeDoc" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "version" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE "KnowledgeChunk" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "docId" TEXT NOT NULL,
      "docTitle" TEXT NOT NULL,
      "docVersion" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "KnowledgeChunk_docId_fkey" FOREIGN KEY ("docId") REFERENCES "KnowledgeDoc" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE INDEX "KnowledgeChunk_docId_idx" ON "KnowledgeChunk"("docId");`,
    `CREATE TABLE "Intent" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "exampleQuestions" TEXT NOT NULL,
      "frequencyScore" INTEGER NOT NULL,
      "domain" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE "Question" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "question" TEXT NOT NULL,
      "count" INTEGER NOT NULL DEFAULT 1,
      "domain" TEXT,
      "intentId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Question_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "Intent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,
    `CREATE INDEX "Question_intentId_idx" ON "Question"("intentId");`,
    `CREATE TABLE "Scenario" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "intentId" TEXT NOT NULL,
      "difficulty" TEXT NOT NULL,
      "persona" TEXT NOT NULL,
      "channel" TEXT NOT NULL,
      "difficultyScore" INTEGER NOT NULL,
      "jsonBlob" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Scenario_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "Intent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE INDEX "Scenario_intentId_idx" ON "Scenario"("intentId");`,
    `CREATE TABLE "Session" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "userId" TEXT,
      "mode" TEXT NOT NULL,
      "domain" TEXT,
      "scenarioId" TEXT NOT NULL,
      "state" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Session_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE INDEX "Session_scenarioId_idx" ON "Session"("scenarioId");`,
    `CREATE TABLE "Turn" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "sessionId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Turn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE INDEX "Turn_sessionId_idx" ON "Turn"("sessionId");`,
    `CREATE TABLE "Evaluation" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "sessionId" TEXT NOT NULL,
      "turnId" TEXT NOT NULL,
      "jsonBlob" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Evaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE INDEX "Evaluation_sessionId_idx" ON "Evaluation"("sessionId");`,
    `CREATE INDEX "Evaluation_turnId_idx" ON "Evaluation"("turnId");`,
    `CREATE TABLE "Feedback" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "sessionId" TEXT NOT NULL UNIQUE,
      "csat" INTEGER,
      "comment" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Feedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
  ];

  for (const statement of statements) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.$executeRawUnsafe(statement);
  }
}

async function resetData() {
  await prisma.feedback.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.turn.deleteMany();
  await prisma.session.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.question.deleteMany();
  await prisma.intent.deleteMany();
  await prisma.knowledgeChunk.deleteMany();
  await prisma.knowledgeDoc.deleteMany();
}

function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const rows = lines.slice(1).map((line) => line.split(","));
  return rows.map(([question, count, domain]) => ({
    question: (question ?? "").trim(),
    count: Number(count ?? "1"),
    domain: domain?.trim() || undefined,
  }));
}

async function seedData() {
  const kbPath = path.join(process.cwd(), "seed", "docs", "sample_kb.md");
  if (fs.existsSync(kbPath)) {
    const kbContent = fs.readFileSync(kbPath, "utf8");
    const version = new Date().toISOString();
    const doc = await prisma.knowledgeDoc.create({
      data: {
        id: crypto.randomUUID(),
        title: "Sample Bank KB",
        content: kbContent,
        version,
      },
    });
    const chunks = chunkDocument(kbContent);
    for (const chunk of chunks) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.knowledgeChunk.create({
        data: {
          id: crypto.randomUUID(),
          docId: doc.id,
          docTitle: doc.title,
          docVersion: doc.version,
          text: chunk.text,
        },
      });
    }
  }

  const questionsPath = path.join(process.cwd(), "seed", "questions.csv");
  if (fs.existsSync(questionsPath)) {
    const questionsContent = fs.readFileSync(questionsPath, "utf8");
    const rows = parseCsv(questionsContent);
    for (const row of rows) {
      if (!row.question) continue;
      // eslint-disable-next-line no-await-in-loop
      await prisma.question.create({
        data: {
          id: crypto.randomUUID(),
          question: row.question,
          count: row.count || 1,
          domain: row.domain,
        },
      });
    }
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
        id: crypto.randomUUID(),
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

  for (const scenario of scenarios) {
    await prisma.scenario.create({
      data: {
        id: crypto.randomUUID(),
        ...scenario,
      },
    });
  }
}

async function initIfNeeded() {
  const hasDocsTable = await tableExists("KnowledgeDoc");
  if (!hasDocsTable) {
    await createSchema();
    await seedData();
    return;
  }

  const [docCount, scenarioCount] = await Promise.all([
    prisma.knowledgeDoc.count(),
    prisma.scenario.count(),
  ]);

  if (docCount === 0 || scenarioCount === 0) {
    await resetData();
    await seedData();
  }
}

export async function ensureDbReady() {
  if (!initializing) {
    initializing = initIfNeeded().catch((err) => {
      initializing = null;
      throw err;
    });
  }
  return initializing;
}
