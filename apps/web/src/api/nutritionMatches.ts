import type { ReceiptCandidate } from "../../../../shared/receipt";
import { validNutrition } from "../../../../shared/nutritionMatching";
import { apiEndpoint } from "./endpoint";
export async function fetchNutritionMatches(
  name: string,
  signal: AbortSignal,
): Promise<ReceiptCandidate[]> {
  const url = new URL(
    apiEndpoint("/api/catalog/nutrition-match") ??
      "/api/catalog/nutrition-match",
    location.origin,
  );
  url.searchParams.set("q", name);
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error("Не удалось проверить базу. Попробуй ещё раз.");
  const data = await response.json();
  if (
    !Array.isArray(data.candidates) ||
    data.candidates.some(
      (c: ReceiptCandidate) =>
        !c.food?.id || !c.food?.name || !validNutrition(c.food.per100),
    )
  )
    throw new Error("Не удалось прочитать КБЖУ.");
  return data.candidates;
}
