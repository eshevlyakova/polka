import type {
  LibraryRecipe,
  LibrarySearch,
  LibraryPage,
  LibraryMetadata,
} from "../../../../shared/recipeLibrary";
import { searchLibrary } from "../../../../shared/librarySearch";
import { apiEndpoint } from "./endpoint";
let snapshot: LibraryMetadata[] | undefined;
async function staticRecipes(signal: AbortSignal) {
  if (snapshot) return snapshot;
  const response = await fetch(
    `${import.meta.env.BASE_URL}catalog/recipe-library-index.json`,
    { signal },
  );
  if (!response.ok)
    throw new Error("Каталог сейчас недоступен. Попробуй ещё раз.");
  const data = await response.json();
  if (
    !Array.isArray(data) ||
    data.some(
      (r) =>
        typeof r.id !== "string" ||
        typeof r.name !== "string" ||
        !Array.isArray(r.ingredients),
    )
  )
    throw new Error("Не удалось прочитать каталог.");
  snapshot = data;
  return snapshot!;
}
export async function fetchLibraryPage(
  input: LibrarySearch,
  signal: AbortSignal,
): Promise<LibraryPage> {
  const url = apiEndpoint("/api/library/search");
  if (url) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal,
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.items) && Number.isInteger(data.total))
          return data;
      }
    } catch (err) {
      if (signal.aborted) throw err;
    }
  }
  return searchLibrary(await staticRecipes(signal), input);
}
export async function fetchLibraryRecipe(
  id: string,
  signal: AbortSignal,
): Promise<LibraryRecipe> {
  const url = apiEndpoint(`/api/library/recipes/${encodeURIComponent(id)}`);
  if (url) {
    try {
      const response = await fetch(url, { signal });
      if (response.ok) {
        const data = await response.json();
        if (
          data.id === id &&
          Array.isArray(data.steps) &&
          Array.isArray(data.ingredients)
        )
          return data;
      }
    } catch (err) {
      if (signal.aborted) throw err;
    }
  }
  const detail = await fetch(`${import.meta.env.BASE_URL}catalog/recipes/${encodeURIComponent(id)}.json`, { signal });
  if (detail.ok) {
    const recipe = await detail.json();
    if (recipe.id === id && Array.isArray(recipe.ingredients) && Array.isArray(recipe.steps)) return recipe;
  }
  // Compatibility with an older static deployment that has not generated per-recipe files yet.
  const response = await fetch(`${import.meta.env.BASE_URL}catalog/recipe-library.json`, { signal });
  if (!response.ok) throw new Error("Рецепт пока недоступен.");
  const all: LibraryRecipe[] = await response.json();
  const found = all.find((r) => r.id === id);
  if (!found) throw new Error("Рецепт не найден.");
  return found;
}
