import "server-only";

import { GoogleGenAI } from "@google/genai";

/**
 * Server-side Gemini helper — the single place the post-meeting pipeline talks to
 * Google GenAI. Used by the Inngest summarizer and the "Ask AI" chat mutation.
 *
 * Gemini (via GOOGLE_API_KEY) replaces OpenAI/@inngest/agent-kit for all
 * post-meeting text generation; Gemini Live (in the Python worker) remains the
 * live-voice provider.
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.warn(
    "[gemini] Missing GOOGLE_API_KEY — summary/chat generation will fail until it is set."
  );
}

export const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL ?? "gemini-3.5-flash";

// Tried in order after GEMINI_TEXT_MODEL. Override without touching code by setting
// GEMINI_FALLBACK_MODELS to a comma-separated list in .env — useful when Google
// retires a generation and the hardcoded names start returning 404.
const FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ??
  "gemini-2.5-flash-lite,gemini-3.1-flash-lite"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const MAX_RETRIES = 2;

/**
 * Google GenAI reports the HTTP code in different places depending on the failure:
 * a top-level `status`, a `code`, or nested inside a JSON `message` payload such as
 * `{"error":{"code":404,...}}`. Reading only `.status` returned undefined for the
 * nested shape, which made every failure look non-retryable — so real 429/503
 * rate limits skipped their backoff and failed the job instead of recovering.
 */
function errorStatus(err: unknown): number | undefined {
  const e = err as {
    status?: number;
    code?: number;
    error?: { code?: number };
    message?: string;
  };
  if (typeof e?.status === "number") return e.status;
  if (typeof e?.code === "number") return e.code;
  if (typeof e?.error?.code === "number") return e.error.code;
  const match = typeof e?.message === "string" && e.message.match(/"code"\s*:\s*(\d{3})/);
  return match ? Number(match[1]) : undefined;
}

const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY ?? "" });

export interface GenerateTextMessage {
  role: "user" | "assistant";
  content: string;
}

interface GenerateTextOptions {
  /** System instruction (persona + grounding context). */
  system: string;
  /** Conversation turns, oldest first. */
  messages: GenerateTextMessage[];
}

export async function generateText({
  system,
  messages,
}: GenerateTextOptions): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Deduped so an env override that matches a fallback isn't attempted twice.
  const modelsToTry = [...new Set([GEMINI_TEXT_MODEL, ...FALLBACK_MODELS])];
  // Remembered so the final throw can say WHY every model failed (a 404 means the
  // model names are wrong/retired; a 403 means the key lacks access; a 429 means
  // quota). Without this the caller only saw "all models exhausted".
  let lastStatus: number | undefined;
  let lastMessage = "";

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          config: { systemInstruction: system },
          contents,
        });
        return response.text ?? "";
      } catch (err: unknown) {
        const status = errorStatus(err);
        lastStatus = status;
        lastMessage = (err as { message?: string })?.message ?? String(err);
        const isRetryable = status === 503 || status === 429 || status === 500;

        if (isRetryable && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
          continue;
        }
        // Non-retryable or exhausted retries — try next model
        console.warn(
          `[gemini] ${model} failed (status ${status ?? "unknown"}, attempt ${attempt + 1}/${MAX_RETRIES + 1}), trying next model...`
        );
        break;
      }
    }
  }

  throw new Error(
    `[gemini] All models exhausted (${modelsToTry.join(", ")}). ` +
      `Last status: ${lastStatus ?? "unknown"}. ${lastMessage.slice(0, 300)}`
  );
}
