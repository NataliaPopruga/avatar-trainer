import { prisma } from '@/lib/prisma';
import { RetrievalItem } from '@/lib/types';

export function chunkText(content: string, chunkSize = 1000, overlap = 120) {
  const chunks: { text: string; index: number }[] = [];
  let idx = 0;
  let start = 0;
  while (start < content.length) {
    const end = Math.min(content.length, start + chunkSize);
    const text = content.slice(start, end);
    chunks.push({ text: text.trim(), index: idx });
    idx += 1;
    if (end === content.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

function lexicalScore(query: string, text: string) {
  const qTokens = query.toLowerCase().split(/[^a-zа-я0-9]+/).filter(Boolean);
  const tTokens = text.toLowerCase();
  const uniq = new Set(qTokens);
  let score = 0;
  uniq.forEach((token) => {
    const occurrences = tTokens.split(token).length - 1;
    if (occurrences > 0) {
      score += 1 + Math.log(occurrences + 1);
    }
  });
  return score;
}

export async function retrieveChunks(query: string, topK = 4): Promise<RetrievalItem[]> {
  const chunks = await prisma.knowledgeChunk.findMany({ include: { doc: true } });
  const scored = chunks
    .map((chunk) => ({
      chunk,
      score: lexicalScore(query, chunk.chunkText),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => ({
      docId: item.chunk.docId,
      chunkId: item.chunk.id,
      text: item.chunk.chunkText,
      title: item.chunk.doc.title,
      score: Number(item.score.toFixed(3)),
    }));
  return scored;
}

export async function saveKnowledgeDocument(title: string, content: string, metadata: Record<string, any> = {}) {
  const doc = await prisma.knowledgeDoc.create({ data: { title, content } });
  const pieces = chunkText(content);
  await prisma.$transaction(
    pieces.map((piece) =>
      prisma.knowledgeChunk.create({
        data: {
          docId: doc.id,
          chunkText: piece.text,
          metadataJson: JSON.stringify({ ...metadata, index: piece.index }),
        },
      })
    )
  );
  return doc;
}

export async function reindexAllDocuments() {
  const docs = await prisma.knowledgeDoc.findMany();
  for (const doc of docs) {
    await prisma.knowledgeChunk.deleteMany({ where: { docId: doc.id } });
    const pieces = chunkText(doc.content);
    await prisma.$transaction(
      pieces.map((piece) =>
        prisma.knowledgeChunk.create({
          data: {
            docId: doc.id,
            chunkText: piece.text,
            metadataJson: JSON.stringify({ index: piece.index }),
          },
        })
      )
    );
  }
}
