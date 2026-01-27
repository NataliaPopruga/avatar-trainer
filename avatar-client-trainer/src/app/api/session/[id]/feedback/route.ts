import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDbReady } from "@/lib/db/ensure";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  await ensureDbReady();
  const { id } = params;
  const body = await req.json();

  const csat = body.csat ? Number(body.csat) : null;
  const comment = body.comment ? String(body.comment) : null;

  const feedback = await prisma.feedback.upsert({
    where: { sessionId: id },
    create: { sessionId: id, csat: csat ?? undefined, comment: comment ?? undefined },
    update: { csat: csat ?? undefined, comment: comment ?? undefined },
  });

  return NextResponse.json({ ok: true, feedback });
}
