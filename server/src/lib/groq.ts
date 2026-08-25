interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

let cachedModel: string | null = null;

const MODEL_PREFERENCE = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "moonshotai/kimi-k2-instruct-0905",
  "llama-4-maverick-17b-128e-instruct",
  "llama-4-scout-17b-16e-instruct",
];

const NON_CHAT_MODELS = new Set([
  "canopylabs/orpheus-v1-english",
  "canopylabs/orpheus-arabic-saudi",
  "whisper-large-v3",
  "whisper-large-v3-turbo",
  "distil-whisper-large-v3-en",
  "playai-tts",
]);

function isChatModel(id: string): boolean {
  if (NON_CHAT_MODELS.has(id)) return false;
  const lower = id.toLowerCase();
  return !(
    lower.includes("whisper") ||
    lower.includes("tts") ||
    lower.includes("guard") ||
    lower.includes("orpheus")
  );
}

async function resolveModel(apiKey: string): Promise<string> {
  if (cachedModel) return cachedModel;

  try {
    const resp = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (resp.ok) {
      const data = (await resp.json()) as { data?: Array<{ id: string }> };
      const available = new Set((data.data ?? []).map((m) => m.id));

      for (const preferred of MODEL_PREFERENCE) {
        if (available.has(preferred)) {
          cachedModel = preferred;
          return preferred;
        }
      }

      const firstChatModel = (data.data ?? []).find((m) => isChatModel(m.id))?.id;
      if (firstChatModel) {
        cachedModel = firstChatModel;
        return firstChatModel;
      }
    }
  } catch (err) {
    console.error("[groq] Failed to fetch model list:", err);
  }

  cachedModel = MODEL_PREFERENCE[0];
  return cachedModel;
}

// Only used as a fallback if the caller didn't supply their own system message.
const DEFAULT_SYSTEM_INSTRUCTION = `You are a business assistant. Answer using only the data given to you - never guess or invent numbers.
ALWAYS reply in the same language and script the user used in their latest message (Roman Urdu in -> Roman Urdu out, English in -> English out, Urdu script in -> Urdu script out).
Keep answers short and direct.`;

const LANGUAGE_REMINDER = `

IMPORTANT: Always reply in the same language and script the user used in their latest message. Roman Urdu in, Roman Urdu out. English in, English out. Urdu script in, Urdu script out.`;

const MAX_HISTORY_MESSAGES = 12;

function trimHistory(messages: GroqMessage[]): GroqMessage[] {
  const nonSystem = messages.filter((m) => m.role !== "system");
  if (nonSystem.length <= MAX_HISTORY_MESSAGES) return nonSystem;
  return nonSystem.slice(nonSystem.length - MAX_HISTORY_MESSAGES);
}

async function callGroqWithRetry(
  apiKey: string,
  model: string,
  messages: GroqMessage[],
  attempt = 1
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    if ((resp.status === 429 || resp.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 1000));
      return callGroqWithRetry(apiKey, model, messages, attempt + 1);
    }

    return resp;
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 1000));
      return callGroqWithRetry(apiKey, model, messages, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function assertConfigured(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to server/.env - get a free key at console.groq.com."
    );
  }
  return apiKey;
}

export async function askGroq(messages: GroqMessage[]): Promise<string> {
  const apiKey = assertConfigured();

  const userMessages = messages.filter((m) => m.role !== "system");
  const lastUserMessage = [...userMessages].reverse().find((m) => m.role === "user");

  if (!lastUserMessage || !lastUserMessage.content.trim()) {
    return "Please type a question first.";
  }

  const model = await resolveModel(apiKey);

  // Respect a caller-supplied system message (e.g. assistant.ts's real data snapshot),
  // just append the language rule to it instead of overriding it.
  const hasSystemMessage = messages.some((m) => m.role === "system");
  let finalMessages: GroqMessage[];

  if (hasSystemMessage) {
    finalMessages = messages.map((m) =>
      m.role === "system" ? { ...m, content: m.content + LANGUAGE_REMINDER } : m
    );
  } else {
    finalMessages = [
      { role: "system", content: DEFAULT_SYSTEM_INSTRUCTION },
      ...trimHistory(messages),
    ];
  }

  try {
    const resp = await callGroqWithRetry(apiKey, model, finalMessages);

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[groq] Request failed (${resp.status}):`, text);
      if (resp.status === 404) cachedModel = null;
      if (resp.status === 429) return "System is a bit busy right now, please try again in a moment.";
      if (resp.status >= 500) return "AI service is temporarily unavailable. Please try again shortly.";
      return "Sorry, I couldn't process that request. Please try rephrasing your question.";
    }

    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() ?? "I could not generate a response.";
  } catch (err) {
    console.error("[groq] Unexpected error:", err);
    return "Something went wrong while processing your request. Please try again.";
  }
}