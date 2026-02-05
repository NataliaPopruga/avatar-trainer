const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function chunkText(content, chunkSize = 1000, overlap = 120) {
  const chunks = [];
  let idx = 0;
  let start = 0;
  while (start < content.length) {
    const end = Math.min(content.length, start + chunkSize);
    const text = content.slice(start, end);
    chunks.push({ text: text.trim(), index: idx });
    idx += 1;
    if (end === content.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

async function seedKnowledge() {
  const kbPath = path.join(process.cwd(), 'seed', 'sample_kb.md');
  const content = fs.readFileSync(kbPath, 'utf8');
  let doc = await prisma.knowledgeDoc.findFirst({ where: { title: 'Sample KB Playbook' } });
  if (!doc) {
    doc = await prisma.knowledgeDoc.create({ data: { title: 'Sample KB Playbook', content } });
  } else {
    await prisma.knowledgeChunk.deleteMany({ where: { docId: doc.id } });
    await prisma.knowledgeDoc.update({ where: { id: doc.id }, data: { content } });
  }
  const chunks = chunkText(content);
  await prisma.$transaction(
    chunks.map((chunk) =>
      prisma.knowledgeChunk.create({
        data: { docId: doc.id, chunkText: chunk.text, metadataJson: JSON.stringify({ index: chunk.index, seeded: true }) },
      })
    )
  );
  return doc;
}

async function seedDemoSession() {
  const existing = await prisma.traineeSession.findFirst({ where: { traineeName: 'Demo Trainee' } });
  if (existing) return existing;
  const scenarioMeta = {
    plan: {
      archetypeId: 'fees_dispute',
      persona: 'anxious',
      difficulty: 'hard',
      facts: ['Комиссия за перевод между банками 1% (min 50 ₽).'],
      opener: 'Клиент переживает из-за списанной комиссии.',
      goal: 'Объяснить правило комиссии',
      escalationTriggers: ['Если агент не подтвердит правило'],
      pitfalls: ['Обещание возврата без проверки'],
    },
    stepsTotal: 6,
    currentStep: 6,
  };
  const session = await prisma.traineeSession.create({
    data: {
      traineeName: 'Demo Trainee',
      mode: 'exam',
      scenarioMetaJson: JSON.stringify(scenarioMeta),
      startedAt: new Date(Date.now() - 1000 * 60 * 60),
      finishedAt: new Date(),
      totalScore: 82,
      passFail: 'PASS',
    },
  });
  const turns = [
    { role: 'client', text: 'Почему с меня списали комиссию за перевод?' },
    { role: 'trainee', text: 'Комиссия 1%, проверю детали операции и вернусь.' },
    { role: 'client', text: 'А вернуть можно? Мне не говорили.' },
    { role: 'trainee', text: 'Если перевод не прошёл, комиссия возвращается автоматически в течение суток.' },
  ];
  for (const t of turns) {
    await prisma.turn.create({ data: { sessionId: session.id, role: t.role, text: t.text } });
  }
  await prisma.evaluation.create({
    data: {
      sessionId: session.id,
      scoresJson: JSON.stringify({ correctness: 85, compliance: 90, softSkills: 78, deEscalation: 70, total: 82 }),
      flagsJson: JSON.stringify({ flags: [], pass: true }),
      positivesJson: JSON.stringify(['Сослался на регламент комиссии']),
      mistakesJson: JSON.stringify(['Не уточнил сумму перевода']),
      suggestedAnswer: 'Подтвердить правило 1%, уточнить статус перевода и предложить контроль.',
      evidenceJson: JSON.stringify([
        {
          text: 'Комиссия за перевод между банками: 1% (min 50 ₽), списывается сразу.',
          title: 'Sample KB Playbook',
          score: 1,
        },
      ]),
    },
  });
  await prisma.feedback.create({ data: { sessionId: session.id, csat: 5, comment: 'Полезно, но хочется больше агрессии.' } });
  return session;
}

async function seedZoomerSession() {
  const existing = await prisma.traineeSession.findUnique({ where: { id: 4 } });
  if (existing) return existing;
  const scenarioMeta = {
    plan: { persona: 'zoomer', difficulty: 'hard', goal: 'slang faq', archetypeId: 'demo' },
    stepsTotal: 7,
  };
  const session = await prisma.traineeSession.create({
    data: {
      id: 4,
      traineeName: 'Zoomer Demo',
      mode: 'exam',
      scenarioMetaJson: JSON.stringify(scenarioMeta),
      startedAt: new Date(),
    },
  });
  await prisma.turn.create({
    data: { sessionId: session.id, role: 'client', text: 'эй, привет, чё по статусу перевода?' },
  });
  return session;
}

async function seedGopnikSession() {
  const existing = await prisma.traineeSession.findUnique({ where: { id: 5 } });
  if (existing) return existing;
  const scenarioMeta = {
    plan: {
      archetypeId: 'card_blocked_call_v1',
      persona: 'gopnik',
      difficulty: 'hard',
      goal: 'card_blocked_call',
      channel: 'call',
    },
    stepsTotal: 9,
    currentStep: 0,
  };
  const session = await prisma.traineeSession.create({
    data: {
      id: 5,
      traineeName: 'Card Block Demo',
      mode: 'exam',
      scenarioMetaJson: JSON.stringify(scenarioMeta),
      startedAt: new Date(),
    },
  });
  await prisma.turn.create({
    data: { sessionId: session.id, role: 'client', text: 'Здравствуйте. Мою карту заблокировали на кассе, платеж не прошел.' },
  });
  return session;
}

async function main() {
  await seedKnowledge();
  await seedDemoSession();
  await seedZoomerSession();
  await seedGopnikSession();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
