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
import { formatAmount, estimateWeight, batchWeight } from "./cooking";
// Pure domain functions: no React, Telegram, localStorage or network.
export function cook(
  state: AppState,
  recipe: Recipe,
  ingredients: Ingredient[],
  catalog: Food[],
  id: string,
  now: string,
  cookedWeightGrams?: number,
): AppState {
  if (
    !Number.isInteger(recipe.servings) ||
    recipe.servings < 1 ||
    recipe.servings > 50
  )
    throw new Error("Количество порций — от 1 до 50.");
  if (
    cookedWeightGrams !== undefined &&
    (!Number.isFinite(cookedWeightGrams) ||
      cookedWeightGrams <= 0 ||
      cookedWeightGrams > 100_000)
  )
    throw new Error("Проверь вес готового блюда.");
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
  // Oldest added lots first; keep legacy ordering for old undated data.
  const pantry = state.pantry.map((p) => ({ ...p }));
  for (const [foodId, grams] of required) {
    let remaining = grams;
    const lots = pantry
      .filter((p) => p.foodId === foodId)
      .sort((a, b) =>
        (a.addedAt || a.expiresOn || "9999").localeCompare(
          b.addedAt || b.expiresOn || "9999",
        ),
      );
    for (const lot of lots) {
      const used = Math.min(lot.grams, remaining);
      lot.grams -= used;
      remaining -= used;
    }
  }
  const batch: Batch = {
    estimatedWeightGrams: estimateWeight(recipe, ingredients),
    ...(cookedWeightGrams === undefined ? {} : { cookedWeightGrams }),
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
    amountLabel: batchWeight(batch)
      ? `${batch.cookedWeightGrams ? "" : "≈ "}${formatAmount(batchWeight(batch)! * fraction)} г · ${formatAmount(fraction * 100)}% блюда`
      : `${formatAmount(fraction * batch.servings)} порц. · ${formatAmount(fraction * 100)}% блюда`,
    approximate:
      !batch.cookedWeightGrams && Boolean(batch.estimatedWeightGrams),
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
