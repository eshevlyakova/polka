import { localDate, type Ingredient, type PantryItem } from "./model";

/** Positive stocks expiring today or within two days, limited to the actual recipe. */
export function expiringIngredients(
  ingredients: Ingredient[],
  pantry: PantryItem[],
  today = localDate(),
) {
  const used = new Set(
    ingredients.filter((item) => item.grams > 0).map((item) => item.foodId),
  );
  const nearest = new Map<
    string,
    { foodId: string; date: string; days: number }
  >();
  for (const item of pantry) {
    if (!used.has(item.foodId) || item.grams <= 0 || !item.expiresOn) continue;
    const days = Math.round(
      (Date.parse(item.expiresOn + "T12:00:00Z") -
        Date.parse(today + "T12:00:00Z")) /
        86400000,
    );
    if (days < 0 || days > 2 || !Number.isFinite(days)) continue;
    const previous = nearest.get(item.foodId);
    if (!previous || days < previous.days)
      nearest.set(item.foodId, {
        foodId: item.foodId,
        date: item.expiresOn,
        days,
      });
  }
  return [...nearest.values()].sort((a, b) => a.days - b.days);
}
