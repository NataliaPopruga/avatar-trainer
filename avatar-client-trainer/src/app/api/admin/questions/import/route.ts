import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDbReady } from "@/lib/db/ensure";

function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const rows = lines.slice(1).map((line) => line.split(","));
  return rows.map(([question, count, domain]) => ({
    question: (question ?? "").trim(),
    count: Number(count ?? "1"),
    domain: domain?.trim() || undefined,
  }));
}

export async function POST(req: Request) {
  await ensureDbReady();
  const data = await req.formData();
  const file = data.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  for (const row of rows) {
    if (!row.question) continue;
    await prisma.question.create({
      data: {
        question: row.question,
        count: row.count || 1,
        domain: row.domain,
      },
    });
  }

  return NextResponse.json({ ok: true, imported: rows.length });
}
