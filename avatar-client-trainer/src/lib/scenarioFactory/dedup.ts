export function isTooSimilar(text: string, others: string[]) {
  const tokens = new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );

  for (const other of others) {
    const otherTokens = new Set(
      other
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2)
    );
    const intersection = [...tokens].filter((t) => otherTokens.has(t)).length;
    const union = new Set([...tokens, ...otherTokens]).size;
    const score = union === 0 ? 0 : intersection / union;
    if (score > 0.75) return true;
  }

  return false;
}
