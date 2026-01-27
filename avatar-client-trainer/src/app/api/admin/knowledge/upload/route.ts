import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chunkDocument } from "@/lib/chunking";
import { ensureDbReady } from "@/lib/db/ensure";

export async function POST(req: Request) {
  await ensureDbReady();
  const data = await req.formData();
  const file = data.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  const text = await file.text();
  const version = new Date().toISOString();

  const doc = await prisma.knowledgeDoc.create({
    data: {
      title: file.name,
      content: text,
      version,
    },
  });

  const chunks = chunkDocument(text);
  for (const chunk of chunks) {
    await prisma.knowledgeChunk.create({
      data: {
        docId: doc.id,
        docTitle: doc.title,
        docVersion: doc.version,
        text: chunk.text,
      },
    });
  }

  return NextResponse.json({ ok: true, chunks: chunks.length });
}
