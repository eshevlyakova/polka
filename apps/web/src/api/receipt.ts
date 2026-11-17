import type { ReceiptResult } from "../../../../shared/receipt";
import { telegram } from "../telegram";
import { apiEndpoint } from "./endpoint";
import { sessionAuthorization } from "./account";

export async function prepareReceiptImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Выбери фото JPG, PNG или WebP. HEIC можно пересохранить как JPG.",
    );
  if (file.size > 12_000_000)
    throw new Error("Фото слишком большое. Выбери файл до 12 МБ.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Не удалось открыть фото. Попробуй другое изображение.");
  }
  try {
    const scale = Math.min(
      1,
      1600 / bitmap.width,
      6000 / bitmap.height,
      Math.sqrt(8_000_000 / (bitmap.width * bitmap.height)),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Браузер не смог подготовить фото.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.88);
    if (data.length > 4_000_050)
      throw new Error(
        "Фото после сжатия слишком большое. Обрежь лишние края или раздели длинный чек на части.",
      );
    return data;
  } finally {
    bitmap.close();
  }
}
export async function fetchReceipt(
  image: string,
  testCode: string,
  signal: AbortSignal,
): Promise<ReceiptResult> {
  const url = apiEndpoint("/api/ai/receipt");
  if (!url)
    throw new Error(
      "Распознавание ещё не подключено к этой версии. Пока добавь продукты вручную.",
    );
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const authorization =
    sessionAuthorization() ??
    (telegram?.initData ? `tma ${telegram.initData}` : undefined);
  if (authorization) headers.Authorization = authorization;
  if (testCode.trim()) headers["X-Polka-Test-Code"] = testCode.trim();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ image }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      "Не удалось отправить фото. Проверь соединение и попробуй ещё раз.",
    );
  }
  let data: ReceiptResult & { error?: string };
  try {
    data = await response.json();
  } catch {
    throw new Error("Сервер вернул непонятный ответ. Попробуй позже.");
  }
  if (!response.ok) throw new Error(data.error || "Не удалось распознать чек.");
  if (
    !Array.isArray(data.items) ||
    data.items.length > 40 ||
    data.items.some(
      (i) => !i || typeof i.name !== "string" || !Array.isArray(i.candidates),
    )
  )
    throw new Error("Не удалось проверить результат распознавания.");
  return data;
}
