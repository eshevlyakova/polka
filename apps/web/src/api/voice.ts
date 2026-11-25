import { apiEndpoint } from "./endpoint";
import { sessionAuthorization } from "./account";
import { telegram } from "../telegram";
import type { VoiceResult, VoiceTurn } from "../../../../shared/voice";
import { VOICE_AUDIO_MAX_BYTES } from "../../../../shared/voice";

async function voiceRequest(path: string, value: unknown, signal: AbortSignal) {
  const url = apiEndpoint(path);
  if (!url) throw new Error("Диктовка сейчас недоступна. Попробуй позже.");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth =
    sessionAuthorization() ??
    (telegram?.initData ? `tma ${telegram.initData}` : undefined);
  if (auth) headers.Authorization = auth;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(value),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Нет связи с сервером. Попробуй отправить ещё раз.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(data?.error || "Не удалось обработать запись.");
  if (!data) throw new Error("Сервер вернул непонятный ответ.");
  return data;
}

export async function transcribeAudio(
  blob: Blob,
  signal: AbortSignal,
): Promise<string> {
  if (!blob.size || blob.size > VOICE_AUDIO_MAX_BYTES)
    throw new Error("Запись пустая или слишком большая. Продиктуй короче.");
  const audio = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать запись."));
    // Strip codec suffixes from MediaRecorder MIME before creating the data URL.
    reader.readAsDataURL(new Blob([blob], { type: blob.type.split(";")[0] }));
  });
  const data = await voiceRequest("/api/ai/transcribe", { audio }, signal);
  if (typeof data.text !== "string" || data.text.length > 2000)
    throw new Error("Не удалось проверить расшифровку.");
  return data.text;
}

export async function fetchVoiceProducts(
  turns: VoiceTurn[],
  signal: AbortSignal,
  edits?: { original: string; name: string; grams: string; removed: boolean }[],
): Promise<VoiceResult> {
  const data = await voiceRequest("/api/ai/products", { turns, edits }, signal);
  if (
    !Array.isArray(data.items) ||
    data.items.length > 40 ||
    typeof data.question !== "string" ||
    data.items.some(
      (i: VoiceResult["items"][number]) =>
        !i || typeof i.name !== "string" || !Array.isArray(i.candidates),
    )
  )
    throw new Error("Не удалось проверить список продуктов.");
  return data;
}

export async function fetchQuestionAudio(
  text: string,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const data = await voiceRequest("/api/ai/speak", { text }, signal);
  if (
    typeof data.audio !== "string" ||
    data.audio.length > 1_400_000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(data.audio)
  )
    throw new Error("Не удалось воспроизвести вопрос.");
  return Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
}
