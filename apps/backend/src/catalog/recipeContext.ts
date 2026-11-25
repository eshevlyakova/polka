import { recipeLibrary, searchLibrary } from "./library";
import type { AiRecipeRequest } from "../../../../shared/aiRecipes";
import { ingredientOnShelf } from "../../../../shared/recipeLibrary";

/** Only real database records may serve as adaptation references. */
export function adaptationReferences(request: AiRecipeRequest) {
  if (request.referenceRecipeId)
    return recipeLibrary.filter((r) => r.id === request.referenceRecipeId);
  const preferred = request.products.filter(
    (p) => p.foodId === request.preferredFoodId,
  );
  const input = {
    query: request.preferences,
    category: "all",
    sort: "relevance" as const,
    maxMinutes: request.maxMinutes,
    offset: 0,
    limit: 24,
    exclusions: request.exclusions,
    products: request.products,
    requiredIngredients: [
      ...(request.requiredIngredients ?? []),
      ...preferred.map((p) => p.name.split(/\s+/)[0]),
    ],
  };
  const exact = searchLibrary(input);
  // A source without timing may still be adapted and timed by the model.
  // Strict time-filtered catalogue results themselves never invent a duration.
  const untimed = exact.total ? exact : searchLibrary({ ...input, maxMinutes: 0 });
  const candidates = untimed.total
    ? untimed.items
    : searchLibrary({ ...input, query: "" }).items;
  return candidates
    .filter(
      (r) =>
        !preferred.length ||
        r.ingredients.some((i) => ingredientOnShelf(i.name, preferred)),
    )
    .slice(0, 6)
    .map((r) => recipeLibrary.find((source) => source.id === r.id)!);
}
