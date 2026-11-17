import type { Food } from "./model";
import { AiError } from "./aiRecipes";
export const RECEIPT_MODEL = "glm-4.6v-flash";
export const RECEIPT_BODY_LIMIT = 4_100_000;
export type ReceiptUnit = "g" | "kg" | "ml" | "l" | "pcs";
export type ReceiptLine = {
  name: string;
  quantity: number | null;
  unit: ReceiptUnit | null;
  packageSize: number | null;
  packageUnit: ReceiptUnit | null;
};
export type ReceiptCandidate = {
  food: Food;
  kind: "generic" | "label" | "saved";
  confidence?: "exact" | "suggestion" | "generic";
  sourceUrl?: string;
  needsUnitConfirmation?: boolean;
};
export type ReceiptItem = ReceiptLine & {
  id: string;
  grams: number | null;
  candidates: ReceiptCandidate[];
};
export type ReceiptResult = { items: ReceiptItem[]; ignoredCount: number };

export function receiptImage(value: unknown): string {
  const image = (value as { image?: unknown } | null)?.image;
  if (
    typeof image !== "string" ||
    image.length > 4_000_050 ||
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
  )
    throw new AiError("Выбери фото JPG, PNG или WebP размером до 3 МБ.");
  const [header, encoded] = image.split(",");
  if (encoded.length % 4 !== 0 || encoded.length < 24)
    throw new AiError("Изображение повреждено.");
  const bytes = atob(encoded.slice(0, 24));
  const valid = header.includes("jpeg")
    ? bytes.startsWith("\xff\xd8\xff")
    : header.includes("png")
      ? bytes.startsWith("\x89PNG\r\n\x1a\n")
      : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
  if (!valid)
    throw new AiError("Не удалось прочитать изображение. Выбери другое фото.");
  return image;
}
export function parseReceiptLines(value: unknown): {
  items: ReceiptLine[];
  ignoredCount: number;
} {
  const data = value as { items?: unknown; ignoredCount?: unknown } | null;
  if (!data || !Array.isArray(data.items) || data.items.length > 40)
    throw new AiError(
      "Не удалось разобрать чек. Попробуй более чёткое фото.",
      502,
    );
  const units: Record<string, ReceiptUnit> = {
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "l",
    pcs: "pcs",
    г: "g",
    гр: "g",
    "гр.": "g",
    кг: "kg",
    мл: "ml",
    л: "l",
    шт: "pcs",
    "шт.": "pcs",
    уп: "pcs",
    "уп.": "pcs",
  };
  const items = data.items.map((raw): ReceiptLine => {
    const value = raw as Record<string, unknown> | null;
    const number = (n: unknown): unknown =>
      n === undefined || n === null || n === ""
        ? null
        : typeof n === "string" && /^\d+(?:[.,]\d+)?$/.test(n.trim())
          ? Number(n.trim().replace(",", "."))
          : n;
    const unit = (u: unknown) =>
      u === undefined || u === null || u === ""
        ? null
        : typeof u === "string"
          ? units[u.trim().toLocaleLowerCase()]
          : undefined;
    const item = value && {
      name: value.name,
      quantity: number(value.quantity),
      unit: unit(value.unit),
      packageSize: number(value.packageSize),
      packageUnit: unit(value.packageUnit),
    };
    if (
      !item ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 160 ||
      item.unit === undefined ||
      item.packageUnit === undefined ||
      [item.quantity, item.packageSize].some(
        (n) =>
          n !== null &&
          (typeof n !== "number" ||
            !Number.isFinite(n) ||
            n <= 0 ||
            n > 100_000),
      )
    )
      throw new AiError(
        "В распознанном чеке есть непонятные значения. Попробуй другое фото.",
        502,
      );
    return {
      name: item.name.trim(),
      quantity: item.quantity as number | null,
      unit: item.unit,
      packageSize: item.packageSize as number | null,
      packageUnit: item.packageUnit,
    };
  });
  return {
    items,
    ignoredCount:
      typeof data.ignoredCount === "number" &&
      Number.isInteger(data.ignoredCount) &&
      data.ignoredCount >= 0 &&
      data.ignoredCount <= 100
        ? data.ignoredCount
        : 0,
  };
}
/** Litres and pieces are never silently treated as grams. */
export function receiptGrams(item: ReceiptLine): number | null {
  if (item.quantity === null) return null;
  let grams: number | null = null;
  if (item.unit === "g") grams = item.quantity;
  if (item.unit === "kg") grams = item.quantity * 1000;
  if (item.unit === "pcs" && item.packageSize !== null) {
    if (item.packageUnit === "g") grams = item.quantity * item.packageSize;
    if (item.packageUnit === "kg")
      grams = item.quantity * item.packageSize * 1000;
  }
  return grams !== null && grams > 0 && grams <= 100_000
    ? Math.round(grams * 100) / 100
    : null;
}
