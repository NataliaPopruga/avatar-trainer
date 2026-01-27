import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chunkDocument } from "@/lib/chunking";
import { ensureDbReady } from "@/lib/db/ensure";

export async function POST() {
  await ensureDbReady();
  const docs = await prisma.knowledgeDoc.findMany();
  await prisma.knowledgeChunk.deleteMany();

  let totalChunks = 0;
  for (const doc of docs) {
    const chunks = chunkDocument(doc.content);
    totalChunks += chunks.length;
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
  }

  return NextResponse.json({ ok: true, totalChunks });
}
