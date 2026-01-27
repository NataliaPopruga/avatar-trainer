import { prisma } from "@/lib/prisma";
import { ensureDbReady } from "@/lib/db/ensure";

function toCsv(rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => String(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export async function GET() {
  await ensureDbReady();
  const sessions = await prisma.session.findMany({
    include: { evaluations: true, scenario: { include: { intent: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = sessions.map((session) => {
    const scores = session.evaluations.map((evaluation) => {
      const json = evaluation.jsonBlob as {
        scores?: { correctness: number; compliance: number; softSkills: number; deEscalation: number };
      };
      return json.scores ?? { correctness: 0, compliance: 0, softSkills: 0, deEscalation: 0 };
    });
    const avg = (key: "correctness" | "compliance" | "softSkills" | "deEscalation") =>
      scores.length
        ? Math.round(scores.reduce((sum, s) => sum + (s[key] ?? 0), 0) / scores.length)
        : 0;

    return {
      sessionId: session.id,
      mode: session.mode,
      intent: session.scenario.intent.title,
      createdAt: session.createdAt.toISOString(),
      correctness: avg("correctness"),
      compliance: avg("compliance"),
      softSkills: avg("softSkills"),
      deEscalation: avg("deEscalation"),
    };
  });

  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=reports.csv",
    },
  });
}
