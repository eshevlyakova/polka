import type { AppState, RecipeFeedback } from "./model";
import { normalizeRecipeText, recipeWords } from "./recipeLibrary";

export type TasteRecipe = {
  id: string;
  name: string;
  ingredients: string[];
  category: string;
};
const words = (r: TasteRecipe) =>
  new Set(
    r.ingredients
      .flatMap(recipeWords)
      .filter((w) => !["соль", "вод", "масл", "перец", "вкус"].includes(w)),
  );
export function recipeSimilarity(a: TasteRecipe, b: TasteRecipe) {
  const left = words(a),
    right = words(b);
  const overlap = [...left].filter((w) => right.has(w)).length;
  return (
    (left.size && right.size ? overlap / Math.max(left.size, right.size) : 0) *
      0.85 +
    (a.category && a.category === b.category ? 0.15 : 0)
  );
}
export function tasteScore(recipe: TasteRecipe, state: AppState) {
  const signals = state.recipeFeedback ?? [];
  // Average each side separately: a long history must not overwhelm pantry relevance.
  const mean = (rating: RecipeFeedback["rating"]) => {
    const group = signals.filter((f) => f.rating === rating);
    return group.length
      ? group.reduce(
          (n, f) => n + recipeSimilarity(recipe, { ...f, id: f.recipeId }),
          0,
        ) / group.length
      : 0;
  };
  const cooked = state.batches.some(
    (b) =>
      normalizeRecipeText(b.recipeName) === normalizeRecipeText(recipe.name),
  );
  return mean("like") * 3 - mean("dislike") * 4 + (cooked ? 0.35 : 0);
}
export function rateRecipe(
  state: AppState,
  recipe: TasteRecipe,
  rating: RecipeFeedback["rating"],
  now: string,
): AppState {
  return {
    ...state,
    recipeFeedback: [
      ...(state.recipeFeedback ?? []).filter((f) => f.recipeId !== recipe.id),
      {
        recipeId: recipe.id,
        name: recipe.name,
        ingredients: [...recipe.ingredients],
        category: recipe.category,
        rating,
        updatedAt: now,
      },
    ],
  };
}
/** A vote dismisses the exact card from suggestions; similar food is only downranked. */
export function hasRecipeRating(state: AppState, id: string) {
  return state.recipeFeedback?.some((f) => f.recipeId === id) ?? false;
}
