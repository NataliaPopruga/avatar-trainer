import { prisma } from "@/lib/prisma";

export type RetrievedChunk = {
  id: string;
  docTitle: string;
  text: string;
  score: number;
  snippet: string;
};

export type RetrievalProvider = {
  search: (query: string, domain?: string, topK?: number) => Promise<RetrievedChunk[]>;
};

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreText(queryTokens: string[], text: string) {
  const hay = tokenize(text);
  let score = 0;
  for (const token of queryTokens) {
    const hits = hay.filter((t) => t === token).length;
    if (hits > 0) {
      score += hits * 2;
    }
  }
  return score;
}

const lexicalProvider: RetrievalProvider = {
  async search(query, _domain, topK = 5) {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const chunks = await prisma.knowledgeChunk.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
    });

    const scored = chunks
      .map((chunk) => ({
        id: chunk.id,
        docTitle: chunk.docTitle,
        text: chunk.text,
        score: scoreText(queryTokens, chunk.text),
        snippet: chunk.text.slice(0, 240),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  },
};

export function getRetrievalProvider(): RetrievalProvider {
  return lexicalProvider;
}
