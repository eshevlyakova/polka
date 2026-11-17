import { AiError, type AiRecipeRequest } from "./aiRecipes";
import { parseLibrarySearch } from "./librarySearch";
import { libraryCategories, type LibrarySearch } from "./recipeLibrary";

/** Model supplies meaning; storage filters, time and exclusions remain code-controlled. */
export function recipeSearchPlan(
  value: unknown,
  request: AiRecipeRequest,
): LibrarySearch {
  const data = value as Record<string, unknown> | null;
  const strings = (v: unknown): v is string[] =>
    Array.isArray(v) &&
    v.length <= 12 &&
    v.every(
      (s) => typeof s === "string" && s.trim().length > 0 && s.length <= 80,
    );
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.query !== "string" ||
    data.query.length > 200 ||
    typeof data.category !== "string" ||
    !Object.hasOwn(libraryCategories, data.category) ||
    !strings(data.requiredIngredients) ||
    !strings(data.excludedIngredients) ||
    !["all", "vegan", "vegetarian", "gluten-free"].includes(
      String(data.diet),
    ) ||
    !["relevance", "quick", "calories"].includes(String(data.sort))
  )
    throw new AiError(
      "Не получилось разобрать пожелания. Попробуй сформулировать их иначе.",
      502,
      "invalid_search",
    );
  const diet = {
    all: "",
    vegan: "веганский",
    vegetarian: "вегетарианский",
    "gluten-free": "без глютена",
  }[data.diet as string];
  const requiredIngredients = [...data.requiredIngredients];
  const preferred = request.products.find(
    (p) => p.foodId === request.preferredFoodId,
  );
  if (preferred) requiredIngredients.push(preferred.name.split(/\s+/)[0]);
  const required = [
    ...new Set(
      requiredIngredients.map((s) => s.trim().toLocaleLowerCase("ru")),
    ),
  ];
  return parseLibrarySearch({
    query: [data.query, ...required, diet].filter(Boolean).join(" "),
    category: data.category,
    requiredIngredients: required,
    exclusions: [request.exclusions, ...data.excludedIngredients]
      .filter(Boolean)
      .join(", "),
    maxMinutes: request.maxMinutes,
    sort: data.sort,
    products: request.products,
    offset: 0,
    limit: 12,
  });
}
