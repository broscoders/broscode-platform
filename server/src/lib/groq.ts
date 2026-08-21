interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function askGroq(messages: GroqMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Add it to server/.env - get a free key at console.groq.com.");
  }

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.2,
      max_tokens: 800,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Groq request failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? "I could not generate a response.";
}