const LITELLM_URL = process.env.LITELLM_URL || "http://litellm:4000";
const EMBEDDINGS_URL = process.env.EMBEDDINGS_URL || "http://oci-embeddings:8000";

// --- Embedding helpers ---

export function buildActivityText(
  title: string,
  description?: string | null,
  type?: string,
  location?: string | null,
  startDate?: string | Date | null,
  status?: string | null,
  priority?: string | null
): string {
  const parts = [title];
  if (description) parts.push(description);
  if (type) parts.push(`Tipo: ${type}`);
  if (status) parts.push(`Estado: ${status}`);
  if (priority) parts.push(`Prioridad: ${priority}`);
  if (startDate) {
    const d = startDate instanceof Date ? startDate : new Date(startDate);
    if (!isNaN(d.getTime())) {
      parts.push(`Fecha: ${d.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
    }
  }
  if (location) parts.push(`Lugar: ${location}`);
  return parts.join(" | ");
}

export function buildDocumentText(
  title: string,
  description?: string | null,
  fileName?: string
): string {
  return [title, description, fileName].filter(Boolean).join(" | ");
}

export function buildAlbumText(
  title: string,
  description?: string | null
): string {
  return [title, description].filter(Boolean).join(" | ");
}

// --- Types ---

export interface EmbeddingResult {
  embedding: number[];
  usage: { inputChars: number };
}

export interface ChatResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
}

export function estimateTokens(text: string): number {
  return Math.ceil((text?.length || 0) / 4);
}

// --- LiteLLM API calls ---

export async function getEmbedding(text: string): Promise<EmbeddingResult | null> {
  try {
    const truncated = text.substring(0, 2048);
    const res = await fetch(`${EMBEDDINGS_URL}/v1/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "embeddings",
        input: truncated,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`LiteLLM ${res.status}: ${errBody}`);
    }
    const data = (await res.json()) as any;
    return {
      embedding: data.data[0].embedding,
      usage: { inputChars: truncated.length },
    };
  } catch (err) {
    console.warn("Embedding generation failed:", err);
    return null;
  }
}

export async function chatCompletion(
  systemPrompt: string,
  userMessage: string
): Promise<ChatResult | null> {
  try {
    const res = await fetch(`${LITELLM_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 1024,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`LiteLLM ${res.status}: ${errBody}`);
    }
    const data = (await res.json()) as any;
    const content = data.choices[0].message.content;
    return {
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? estimateTokens(systemPrompt + userMessage),
        completionTokens: data.usage?.completion_tokens ?? estimateTokens(content),
      },
    };
  } catch (err) {
    console.warn("Chat completion failed:", err);
    return null;
  }
}
