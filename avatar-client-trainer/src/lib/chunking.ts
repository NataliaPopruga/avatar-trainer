export type ChunkedDoc = {
  text: string;
};

const MIN_CHUNK = 800;
const MAX_CHUNK = 1200;

export function chunkDocument(content: string): ChunkedDoc[] {
  const sections = content
    .split(/\n(?=#)/g)
    .map((section) => section.trim())
    .filter(Boolean);

  const chunks: ChunkedDoc[] = [];
  let buffer = "";

  const pushBuffer = () => {
    if (buffer.trim().length > 0) {
      chunks.push({ text: buffer.trim() });
      buffer = "";
    }
  };

  for (const section of sections) {
    if (buffer.length + section.length > MAX_CHUNK) {
      pushBuffer();
      buffer = section;
      continue;
    }

    buffer += (buffer ? "\n\n" : "") + section;
    if (buffer.length >= MIN_CHUNK) {
      pushBuffer();
    }
  }

  pushBuffer();
  return chunks;
}
