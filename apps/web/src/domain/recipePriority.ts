import {
  classifyPerishability,
  perishableScore,
} from "../../../../shared/perishability";
import type { Food, Ingredient, PantryItem } from "./model";
export function perishableIngredients(
  ingredients: Ingredient[],
  pantry: PantryItem[],
  catalog: Food[],
) {
  const used = new Set(
    ingredients.filter((i) => i.grams > 0).map((i) => i.foodId),
  );
  return catalog.filter(
    (f) =>
      used.has(f.id) &&
      classifyPerishability(f.name).priority > 0 &&
      pantry.some((p) => p.foodId === f.id && p.grams > 0),
  );
}
export function recipePriority(
  ingredients: Ingredient[],
  pantry: PantryItem[],
  catalog: Food[],
) {
  return perishableScore(
    ingredients,
    pantry.map((p) => ({
      ...p,
      name: catalog.find((f) => f.id === p.foodId)?.name ?? "",
    })),
  );
}
