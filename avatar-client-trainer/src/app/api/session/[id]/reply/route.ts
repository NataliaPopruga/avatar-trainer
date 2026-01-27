import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreAnswer } from "@/lib/providers/scoring";
import { nextClientReply } from "@/lib/session/avatar";
import { ensureDbReady } from "@/lib/db/ensure";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  await ensureDbReady();
  const { id } = params;
  const body = await req.json();
  const answer = String(body.answer ?? "");

  const session = await prisma.session.findUnique({
    where: { id },
    include: { scenario: { include: { intent: true } }, turns: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const scenarioJson = session.scenario.jsonBlob as {
    persona: string;
    channel: string;
    context: string;
    expectedActions: string[];
    complianceTraps: string[];
  };

  const managerTurn = await prisma.turn.create({
    data: {
      sessionId: session.id,
      role: "manager",
      content: answer,
    },
  });

  const recentContext = [...session.turns, managerTurn]
    .slice(-6)
    .map((t) => `${t.role}: ${t.content}`)
    .join("\n");

  const evaluation = await scoreAnswer({
    answer,
    scenario: {
      intentTitle: session.scenario.intent.title,
      expectedActions: scenarioJson.expectedActions ?? [],
      complianceTraps: scenarioJson.complianceTraps ?? [],
    },
    mode: session.mode,
    contextText: recentContext,
  });

  await prisma.evaluation.create({
    data: {
      sessionId: session.id,
      turnId: managerTurn.id,
      jsonBlob: evaluation,
    },
  });

  const state = (session.state as { turnCount?: number; done?: boolean }) ?? {};
  const turnCount = (state.turnCount ?? 0) + 1;
  const done = turnCount >= 5;

  await prisma.session.update({
    where: { id: session.id },
    data: {
      state: { turnCount, done },
    },
  });

  let clientReply: string | null = null;
  if (!done) {
    clientReply = nextClientReply({
      scenario: {
        persona: scenarioJson.persona,
        channel: scenarioJson.channel,
        context: scenarioJson.context,
        expectedActions: scenarioJson.expectedActions ?? [],
      },
      managerAnswer: answer,
      turnCount,
    });

    await prisma.turn.create({
      data: {
        sessionId: session.id,
        role: "client",
        content: clientReply,
      },
    });
  }

  return NextResponse.json({ ok: true, evaluation, clientReply, done });
}
