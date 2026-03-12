const LITELLM_URL = process.env.LITELLM_URL || "http://litellm:4000";

// --- Embedding helpers ---

export function buildActivityText(
  title: string,
  description?: string | null,
  type?: string,
  location?: string | null
): string {
  return [title, description, type, location].filter(Boolean).join(" | ");
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

// --- LiteLLM API calls ---

export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${LITELLM_URL}/v1/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "embeddings",
        input: text.substring(0, 2048),
        dimensions: 768,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`LiteLLM ${res.status}: ${errBody}`);
    }
    const data = (await res.json()) as any;
    return data.data[0].embedding;
  } catch (err) {
    console.warn("Embedding generation failed:", err);
    return null;
  }
}

export async function chatCompletion(
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
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
    return data.choices[0].message.content;
  } catch (err) {
    console.warn("Chat completion failed:", err);
    return null;
  }
}
