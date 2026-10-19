import type {
  AppState,
  Batch,
  DiaryEntry,
  Food,
  Ingredient,
  Recipe,
} from "./model";
import { localDate } from "./model";
import { calculate, scale } from "./nutrition";
// Pure domain functions: no React, Telegram, localStorage or network.
export function cook(
  state: AppState,
  recipe: Recipe,
  ingredients: Ingredient[],
  catalog: Food[],
  id: string,
  now: string,
): AppState {
  if (
    !ingredients.length ||
    ingredients.some((i) => !Number.isFinite(i.grams) || i.grams <= 0)
  )
    throw new Error("Укажи положительные граммовки");
  const required = new Map<string, number>();
  for (const i of ingredients)
    required.set(i.foodId, (required.get(i.foodId) ?? 0) + i.grams);
  for (const [foodId, grams] of required) {
    const available = state.pantry
      .filter((p) => p.foodId === foodId)
      .reduce((a, p) => a + p.grams, 0);
    if (available + 1e-6 < grams)
      throw new Error(
        `Недостаточно: ${catalog.find((f) => f.id === foodId)?.name ?? foodId}. Добавь продукт на полку или измени состав.`,
      );
  }
  // Deduct earliest-expiring lots first. Unknown expiry goes last.
  const pantry = state.pantry.map((p) => ({ ...p }));
  for (const [foodId, grams] of required) {
    let remaining = grams;
    const lots = pantry
      .filter((p) => p.foodId === foodId)
      .sort((a, b) =>
        (a.expiresOn || "9999").localeCompare(b.expiresOn || "9999"),
      );
    for (const lot of lots) {
      const used = Math.min(lot.grams, remaining);
      lot.grams -= used;
      remaining -= used;
    }
  }
  const batch: Batch = {
    id,
    recipeName: recipe.name,
    cookedAt: now,
    nutrients: calculate(ingredients, catalog),
    remainingFraction: 1,
    servings: recipe.servings,
  };
  return {
    ...state,
    pantry: pantry.filter((p) => p.grams > 1e-6),
    batches: [batch, ...state.batches],
  };
}
export function eat(
  state: AppState,
  batchId: string,
  fraction: number,
  meal: string,
  id: string,
  date = localDate(),
): AppState {
  const batch = state.batches.find((b) => b.id === batchId);
  if (!batch) throw new Error("Блюдо не найдено");
  if (
    !Number.isFinite(fraction) ||
    fraction <= 0 ||
    fraction > batch.remainingFraction + 1e-6
  )
    throw new Error("Порция больше остатка блюда");
  const entry: DiaryEntry = {
    id,
    name: batch.recipeName,
    date,
    meal,
    nutrients: scale(batch.nutrients, fraction),
    amountLabel: `${Math.round(fraction * 100)}% блюда`,
    approximate: false,
    batchId,
    fraction,
    source: "Готовая еда",
  };
  return {
    ...state,
    batches: state.batches.map((b) =>
      b.id === batchId
        ? {
            ...b,
            remainingFraction: Math.max(0, b.remainingFraction - fraction),
          }
        : b,
    ),
    diary: [entry, ...state.diary],
  };
}
export function deleteEntry(state: AppState, id: string): AppState {
  const entry = state.diary.find((e) => e.id === id);
  const pantry = state.pantry.map((item) => ({ ...item }));
  for (const used of entry?.pantryUsed ?? []) {
    const existing = pantry.find(
      (item) => item.id === used.id && item.foodId === used.foodId,
    );
    if (existing) existing.grams += used.grams;
    else
      pantry.push({
        ...used,
        id: pantry.some((item) => item.id === used.id)
          ? `${id}:restored:${used.id}`
          : used.id,
      });
  }
  return {
    ...state,
    diary: state.diary.filter((e) => e.id !== id),
    pantry,
    batches: state.batches.map((b) =>
      b.id === entry?.batchId
        ? {
            ...b,
            remainingFraction: Math.min(
              1,
              b.remainingFraction + (entry.fraction ?? 0),
            ),
          }
        : b,
    ),
  };
}
