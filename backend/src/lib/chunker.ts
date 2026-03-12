export interface TextChunk {
  text: string;
  index: number;
}

export function chunkText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length === 0) return [];

  while (start < cleanText.length) {
    let end = start + chunkSize;

    if (end < cleanText.length) {
      const lastParagraph = cleanText.lastIndexOf("\n\n", end);
      const lastNewline = cleanText.lastIndexOf("\n", end);
      const lastPeriod = cleanText.lastIndexOf(". ", end);

      if (lastParagraph > start + chunkSize * 0.5) {
        end = lastParagraph + 2;
      } else if (lastNewline > start + chunkSize * 0.5) {
        end = lastNewline + 1;
      } else if (lastPeriod > start + chunkSize * 0.5) {
        end = lastPeriod + 2;
      }
    }

    const chunk = cleanText.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push({ text: chunk, index });
      index++;
    }

    start = end - chunkOverlap;
    if (start >= cleanText.length) break;
  }

  return chunks;
}
