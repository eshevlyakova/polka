import type { Food, PantryItem, Recipe } from "./model";
import { shortages } from "./cooking";

/** Suggestions must have a real connection to current stocks, even if incomplete. */
export function homeIdeas(
  recipes: Recipe[],
  pantry: PantryItem[],
  catalog: Food[],
) {
  const available = new Set(
    pantry.filter((p) => p.grams > 1e-6).map((p) => p.foodId),
  );
  const related = recipes.filter((r) =>
    r.ingredients.some((i) => i.grams > 0 && available.has(i.foodId)),
  );
  const ready = related.filter(
    (r) => !shortages(r.ingredients, pantry, catalog).length,
  );
  const missing = related.filter(
    (r) => shortages(r.ingredients, pantry, catalog).length,
  );
  const preview = [...ready.slice(0, 2), ...missing.slice(0, 1)];
  for (const recipe of related)
    if (preview.length < 3 && !preview.includes(recipe)) preview.push(recipe);
  return preview;
}
