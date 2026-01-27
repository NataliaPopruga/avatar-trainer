import QuestionsClient from "@/app/admin/questions/QuestionsClient";
import { prisma } from "@/lib/prisma";
import { ensureDbReady } from "@/lib/db/ensure";
import { BackButton } from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  await ensureDbReady();
  const questions = await prisma.question.findMany({
    orderBy: { count: "desc" },
    take: 12,
  });
  const intents = await prisma.intent.findMany({
    orderBy: { frequencyScore: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Частые вопросы → Интенты</h2>
        <p className="mt-2 text-sm text-slate-600">
          Импортируйте вопросы, автоматически выделяйте интенты и генерируйте пул сценариев.
        </p>
      </div>
      <BackButton />

      <QuestionsClient />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="soft-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold">Топ вопросов</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {questions.length === 0 && <p>Вопросов пока нет.</p>}
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-4">
                <div className="text-slate-800">{q.question}</div>
                <span className="rounded-full bg-purple-50 px-2 py-1 text-xs text-purple-700">
                  {q.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="soft-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold">Интенты</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {intents.length === 0 && <p>Интентов пока нет.</p>}
            {intents.map((intent) => (
              <div key={intent.id} className="flex items-center justify-between gap-4">
                <div className="text-slate-800">{intent.title}</div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {intent.frequencyScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
