import { prisma } from "@/lib/prisma";
import { ensureDbReady } from "@/lib/db/ensure";
import { BackButton } from "@/components/BackButton";

export const dynamic = "force-dynamic";

type EvalJson = {
  scores?: { correctness: number; compliance: number; softSkills: number; deEscalation: number };
  flags?: Array<{ code: string; severity: string; message: string }>;
  evidence?: Array<{ docTitle: string; snippet: string }>;
};

export default async function ReportDetail({
  params,
}: {
  params: { id: string };
}) {
  await ensureDbReady();
  const { id } = params;
  const session = await prisma.session.findUnique({
    where: { id },
    include: { evaluations: true, scenario: { include: { intent: true } } },
  });

  if (!session) return <div>Отчёт не найден</div>;

  const evaluations = session.evaluations.map((e) => e.jsonBlob as EvalJson);
  const average = (key: keyof NonNullable<EvalJson["scores"]>) => {
    const values = evaluations
      .map((e) => e.scores?.[key] ?? 0)
      .filter((v) => Number.isFinite(v));
    return values.length
      ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
      : 0;
  };

  const flags = evaluations.flatMap((e) => e.flags ?? []);
  const highCompliance = flags.some((f) => f.severity === "high");
  const pass = !highCompliance;

  const topFlags = Object.values(
    flags.reduce<Record<string, { code: string; message: string; count: number }>>((acc, flag) => {
      const key = `${flag.code}-${flag.message}`;
      if (!acc[key]) acc[key] = { code: flag.code, message: flag.message, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {})
  );

  const evidence = evaluations.flatMap((e) => e.evidence ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Детали отчёта</h2>
        <p className="mt-2 text-sm text-slate-600">
          Интент: {session.scenario.intent.title}
        </p>
      </div>
      <BackButton />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Корректность", value: average("correctness") },
          { label: "Комплаенс", value: average("compliance") },
          { label: "Soft Skills", value: average("softSkills") },
          { label: "Де-эскалация", value: average("deEscalation") },
        ].map((card) => (
          <div
            key={card.label}
            className="soft-card rounded-2xl p-4"
          >
            <div className="text-xs uppercase text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="soft-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Итог</h3>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              pass ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {pass ? "PASS" : "FAIL"}
          </span>
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          {topFlags.length === 0 && <p>Критичных ошибок нет.</p>}
          {topFlags.map((flag) => (
            <div key={`${flag.code}-${flag.message}`} className="flex justify-between">
              <div>
                <div className="font-medium text-slate-800">{flag.code}</div>
                <div className="text-xs text-slate-500">{flag.message}</div>
              </div>
              <div className="text-xs text-slate-500">x{flag.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="soft-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Источники</h3>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          {evidence.length === 0 && <p>Источников нет.</p>}
          {evidence.map((item, idx) => (
            <div key={`${item.docTitle}-${idx}`}>
              <div className="text-xs font-medium text-slate-700">
                {item.docTitle}
              </div>
              <p className="text-xs text-slate-500">{item.snippet}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
