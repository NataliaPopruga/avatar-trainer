import { prisma } from "@/lib/prisma";
import { ensureDbReady } from "@/lib/db/ensure";
import { BackButton } from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await ensureDbReady();
  const sessions = await prisma.session.findMany({
    include: { scenario: { include: { intent: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Отчёты</h2>
          <p className="mt-2 text-sm text-slate-600">
            Результаты сессий для руководителей.
          </p>
        </div>
        <a
          className="rounded-full border border-purple-300 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
          href="/api/reports/export"
        >
          Экспорт CSV
        </a>
      </div>

      <div className="soft-card rounded-2xl p-6">
        <div className="space-y-3 text-sm text-slate-600">
          {sessions.length === 0 && <p>Сессий пока нет.</p>}
          {sessions.map((session) => (
            <a
              key={session.id}
              href={`/reports/${session.id}`}
              className="flex items-center justify-between rounded-xl border border-purple-100 px-3 py-2 hover:bg-purple-50/50"
            >
              <div>
                <div className="font-medium text-slate-800">
                  {session.scenario.intent.title}
                </div>
                <div className="text-xs text-slate-500">
                  {session.createdAt.toLocaleString()} • {session.mode}
                </div>
              </div>
              <span className="text-xs text-slate-500">Открыть</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
