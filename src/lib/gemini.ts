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

// Fast, cheap, long-context text model. Not a "live"/native-audio model (those
// are voice-only); this is the plain text-generation endpoint.
export const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";

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

/**
 * Generate a single text completion from Gemini. Maps our {user,assistant}
 * message shape to Gemini's {user,model} contents and returns the reply text.
 */
export async function generateText({
  system,
  messages,
}: GenerateTextOptions): Promise<string> {
  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    config: { systemInstruction: system },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  });

  return response.text ?? "";
}
