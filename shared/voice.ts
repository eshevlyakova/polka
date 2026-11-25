import { AiError } from "./aiRecipes";
import { receiptGrams, type ReceiptItem, type ReceiptLine } from "./receipt";
import { foodMeasures } from "./foodMeasures";

export const VOICE_BODY_LIMIT = 4_100_000;
export const VOICE_AUDIO_MAX_BYTES = 3_000_000;
export type VoiceTurn = { role: "user" | "assistant"; content: string };
export type VoiceResult = { items: ReceiptItem[]; question: string };

/** Completeness is an application rule, not an optional model suggestion. */
export function quantityQuestion(items: ReceiptLine[]): string {
  for (const item of items) {
    const name =
      item.name.charAt(0).toLocaleUpperCase("ru") + item.name.slice(1);
    const pieces = foodMeasures({ id: "", name: item.name }).some(
      (m) => m.id === "piece",
    );
    if (item.quantity === null || item.unit === null)
      return pieces
        ? `${name}: сколько штук у тебя есть? Можно указать массу в граммах.`
        : `${name}: сколько граммов у тебя есть? Можно назвать количество упаковок и массу одной.`;
    if (receiptGrams(item) !== null) continue;
    if (item.unit === "pcs" && item.packageSize === null && pieces) continue;
    if (item.unit === "pcs")
      return `${name}: сколько граммов в одной упаковке? У тебя их ${item.quantity.toLocaleString("ru")}.`;
    // Volumes need a known household conversion to avoid silently treating ml as g.
    if (
      ["ml", "l"].includes(item.unit) &&
      foodMeasures({ id: "", name: item.name }).some((m) => m.id === "ml")
    )
      continue;
    return `${name}: какая общая масса в граммах? Пока указан только объём.`;
  }
  return "";
}

export function voiceTurns(value: unknown): VoiceTurn[] {
  const turns = (value as { turns?: unknown } | null)?.turns;
  if (!Array.isArray(turns) || !turns.length || turns.length > 24)
    throw new AiError(
      "Начни новый список: в этом диалоге слишком много сообщений.",
    );
  let length = 0;
  const parsed = turns.map((turn): VoiceTurn => {
    if (
      !turn ||
      !["user", "assistant"].includes(turn.role) ||
      typeof turn.content !== "string" ||
      !turn.content.trim() ||
      turn.content.length > 2000
    )
      throw new AiError(
        "Не удалось прочитать сообщение. Сократи его и попробуй ещё раз.",
      );
    length += turn.content.length;
    return { role: turn.role, content: turn.content.trim() };
  });
  if (length > 12000 || parsed.at(-1)?.role !== "user")
    throw new AiError(
      "Список слишком длинный. Подтверди его и начни следующий.",
    );
  return parsed;
}

/** Only a standalone command ends the session; silence and product names do not. */
export function voiceFinished(text: string): boolean {
  return /^(?:вс[её]|готово|это вс[её]|на этом вс[её]|я закончил[а]?)[.!?,\s]*$/iu.test(
    text.trim(),
  );
}

export function voiceAudio(value: unknown): {
  bytes: Uint8Array;
  mime: string;
  extension: string;
} {
  const audio = (value as { audio?: unknown } | null)?.audio;
  if (typeof audio !== "string" || audio.length > 4_000_100)
    throw new AiError(
      "Запись слишком большая. Продиктуй продукты несколькими частями.",
    );
  const match =
    /^data:(audio\/(?:webm|mp4|ogg|wav));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      audio,
    );
  if (!match || match[2].length % 4 !== 0)
    throw new AiError("Не удалось прочитать аудио. Запиши ещё раз.");
  const raw = atob(match[2]);
  if (raw.length < 32 || raw.length > VOICE_AUDIO_MAX_BYTES)
    throw new AiError("Запись пустая или слишком большая. Запиши ещё раз.");
  const mime = match[1];
  const valid =
    mime === "audio/webm"
      ? raw.startsWith("\x1a\x45\xdf\xa3")
      : mime === "audio/ogg"
        ? raw.startsWith("OggS")
        : mime === "audio/wav"
          ? raw.startsWith("RIFF") && raw.slice(8, 12) === "WAVE"
          : raw.slice(4, 8) === "ftyp";
  if (!valid) throw new AiError("Формат записи не распознан. Запиши ещё раз.");
  return {
    bytes: Uint8Array.from(raw, (c) => c.charCodeAt(0)),
    mime,
    extension: mime.slice(6),
  };
}
