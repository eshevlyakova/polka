import type { AppState, Food, Recipe } from "./model";
import {
  hasRecipeRating,
  recipeSimilarity,
  tasteScore,
  type TasteRecipe,
} from "../../../../shared/recipePreferences";
import {
  ingredientOnShelf,
  libraryProducts,
  recipeWords,
  type LibraryCard,
  type LibraryMetadata,
} from "../../../../shared/recipeLibrary";
import { searchLibrary } from "../../../../shared/librarySearch";

export function recipeFeatures(recipe: Recipe, catalog: Food[]): TasteRecipe {
  return {
    id: recipe.id,
    name: recipe.name,
    category: "",
    ingredients: recipe.ingredients.map(
      (i) => catalog.find((f) => f.id === i.foodId)?.name ?? i.foodId,
    ),
  };
}
export function personalLibraryIdeas(
  recipes: LibraryMetadata[],
  state: AppState,
  catalog: Food[],
  preferredFoodId?: string | null,
): LibraryCard[] {
  const products = libraryProducts(state.pantry, catalog);
  if (!products.length) return [];
  // Internal pure search has no HTTP page-size limit; filter once for the full catalogue.
  const all = searchLibrary(recipes, {
    query: "",
    maxMinutes: 0,
    category: "all",
    sort: "relevance",
    offset: 0,
    limit: recipes.length || 1,
    exclusions: state.settings.exclusions,
    products,
  }).items;
  const features = (r: LibraryCard): TasteRecipe => ({
    ...r,
    ingredients: r.ingredients.map((i) => i.name),
  });
  const preferred = preferredFoodId
    ? products.filter((p) => p.foodId === preferredFoodId)
    : null;
  const scored = all
    .filter(
      (r) =>
        !hasRecipeRating(state, r.id) &&
        (r.minutes === null || r.minutes <= state.settings.maxMinutes) &&
        r.ingredients.some(
          (i) =>
            recipeWords(i.name).some(
              (w) => !["вод", "соль", "масл", "перец", "вкус"].includes(w),
            ) && ingredientOnShelf(i.name, preferred ?? products),
        ),
    )
    .map((r, index) => ({
      r,
      score:
        (r.stockMatches / Math.max(1, r.ingredients.length)) * 4 +
        tasteScore(features(r), state) - (r.minutes === null ? 0.25 : 0) -
        index / 10000,
    }));
  const result: LibraryCard[] = [];
  while (result.length < 3 && scored.length) {
    scored.sort((a, b) => {
      const diversity = (r: LibraryCard) =>
        Math.max(
          0,
          ...result.map((chosen) =>
            recipeSimilarity(features(r), features(chosen)),
          ),
        ) * 1.3;
      return b.score - diversity(b.r) - (a.score - diversity(a.r));
    });
    result.push(scored.shift()!.r);
  }
  return result;
}
