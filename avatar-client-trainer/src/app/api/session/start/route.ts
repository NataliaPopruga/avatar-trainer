import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDbReady } from "@/lib/db/ensure";

export async function POST(req: Request) {
  await ensureDbReady();
  const body = await req.json();
  const mode = body.mode === "exam" ? "exam" : "training";
  const domain = body.domain ? String(body.domain) : undefined;

  const scenarios = await prisma.scenario.findMany({
    include: { intent: true },
  });
  const filtered = domain
    ? scenarios.filter((s) => s.intent.domain === domain)
    : scenarios;

  if (filtered.length === 0) {
    return NextResponse.json(
      { error: "No scenarios available" },
      { status: 400 }
    );
  }

  const scenario = filtered[Math.floor(Math.random() * filtered.length)];
  const scenarioJson = scenario.jsonBlob as {
    steps?: Array<{ role: string; text: string }>;
  };
  const firstLine = scenarioJson.steps?.[0]?.text ?? "Hello, how can I help?";

  const session = await prisma.session.create({
    data: {
      mode,
      domain,
      scenarioId: scenario.id,
      state: { turnCount: 0, done: false },
    },
  });

  await prisma.turn.create({
    data: {
      sessionId: session.id,
      role: "client",
      content: firstLine,
    },
  });

  return NextResponse.json({ ok: true, sessionId: session.id });
}
