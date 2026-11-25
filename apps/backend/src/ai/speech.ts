import { AiError } from "../../../../shared/aiRecipes";
import type { AiCredentials } from "./config";

/** Short clarification replies only; credentials and provider errors stay on the server. */
export async function speakQuestion(
  value: unknown,
  connection: AiCredentials,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const text = (value as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || !text.trim() || text.length > 400)
    throw new AiError("Не удалось прочитать уточнение.");
  if (typeof connection === "string")
    throw new AiError(
      "Не удалось озвучить вопрос. Его можно прочитать на экране.",
      503,
    );
  try {
    const response = await fetcher("https://api.timeweb.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        voice: "marin",
        input: text.trim(),
        response_format: "mp3",
        instructions:
          "Говори по-русски, тепло и естественно, как помощник на кухне. Без вступления, прочитай только вопрос. Живая разговорная русская речь, в темпе обычной беседы между друзьями. Связывай слова в одну фразу, естественно редуцируй безударные гласные. Избегай дикторской подачи и проговаривания по слогам. Числа и единицы произноси словами.",
      }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error();
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 1_000_000) throw new Error();
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { audio: btoa(binary) };
  } catch {
    throw new AiError(
      "Не удалось озвучить вопрос. Попробуй включить звук ещё раз.",
      502,
    );
  }
}
