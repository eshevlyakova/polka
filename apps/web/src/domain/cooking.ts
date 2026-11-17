import type { Food, Ingredient, PantryItem, Recipe, Batch } from "./model";
export function estimateWeight(
  recipe: Recipe,
  ingredients = recipe.ingredients,
) {
  return ingredients.reduce(
    (sum, i) =>
      sum +
      (Number.isFinite(i.grams) && i.grams > 0
        ? i.grams * (recipe.yieldFactors?.[i.foodId] ?? 1)
        : 0),
    0,
  );
}
export function batchWeight(batch: Batch) {
  return batch.cookedWeightGrams ?? batch.estimatedWeightGrams;
}
export function portionLabel(batch: Batch) {
  const weight = batchWeight(batch);
  return weight
    ? `1 порция ${batch.cookedWeightGrams ? "—" : "≈"} ${formatAmount(weight / batch.servings, 0)} г`
    : "Вес порции не указан";
}
export function scaleIngredients(
  ingredients: Ingredient[],
  from: number,
  to: number,
): Ingredient[] {
  if (
    !Number.isInteger(from) ||
    from < 1 ||
    !Number.isInteger(to) ||
    to < 1 ||
    to > 50
  )
    throw new Error("Количество порций — целое число от 1 до 50.");
  return ingredients.map((i) => ({
    ...i,
    grams: Math.round(((i.grams * to) / from) * 1e6) / 1e6,
  }));
}
export function shortages(
  ingredients: Ingredient[],
  pantry: PantryItem[],
  catalog: Food[],
) {
  const required = new Map<string, number>();
  for (const i of ingredients)
    if (Number.isFinite(i.grams) && i.grams > 0)
      required.set(i.foodId, (required.get(i.foodId) ?? 0) + i.grams);
  return [...required]
    .map(([foodId, grams]) => ({
      foodId,
      name: catalog.find((f) => f.id === foodId)?.name ?? foodId,
      grams:
        grams -
        pantry
          .filter((p) => p.foodId === foodId)
          .reduce((n, p) => n + p.grams, 0),
    }))
    .filter((i) => i.grams > 1e-6);
}
export function formatAmount(n: number, digits = 2) {
  return n.toLocaleString("ru", { maximumFractionDigits: digits });
}
