import { classifyPerishability } from "./perishability";
import {
  ingredientOnShelf,
  libraryCategories,
  normalizeRecipeText,
  recipeWords,
  type LibraryMetadata,
  type LibrarySearch,
  type LibraryPage,
} from "./recipeLibrary";
export function parseLibrarySearch(value: unknown): LibrarySearch {
  if (!value || typeof value !== "object")
    throw new Error("Проверь параметры поиска.");
  const d = value as Partial<LibrarySearch>;
  const query = d.query ?? "",
    exclusions = d.exclusions ?? "",
    maxMinutes = d.maxMinutes ?? 0,
    category = d.category ?? "all",
    sort = d.sort ?? "relevance",
    offset = d.offset ?? 0,
    limit = d.limit ?? 12,
    products = d.products ?? [];
  const requiredIngredients = d.requiredIngredients ?? [];
  const excludedRecipeIds = d.excludedRecipeIds ?? [];
  if (
    !Array.isArray(excludedRecipeIds) ||
    excludedRecipeIds.length > 3000 ||
    !excludedRecipeIds.every(
      (id) => typeof id === "string" && id.length > 0 && id.length <= 160,
    ) ||
    typeof query !== "string" ||
    query.length > 600 ||
    typeof exclusions !== "string" ||
    exclusions.length > 300 ||
    !Number.isInteger(maxMinutes) ||
    maxMinutes < 0 ||
    maxMinutes > 2880 ||
    !Object.hasOwn(libraryCategories, category) ||
    !["relevance", "quick", "calories"].includes(sort) ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 100000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 24 ||
    !Array.isArray(products) ||
    products.length > 100 ||
    !Array.isArray(requiredIngredients) ||
    requiredIngredients.length > 12 ||
    requiredIngredients.some(
      (s) => typeof s !== "string" || !s.trim() || s.length > 80,
    ) ||
    products.some(
      (p) =>
        typeof p.foodId !== "string" ||
        typeof p.name !== "string" ||
        p.name.length > 160 ||
        !Number.isFinite(p.grams) ||
        p.grams < 0,
    )
  )
    throw new Error("Проверь параметры поиска.");
  return {
    query,
    exclusions,
    maxMinutes,
    category,
    sort,
    offset,
    limit,
    products,
    requiredIngredients,
    ...(excludedRecipeIds.length ? { excludedRecipeIds } : {}),
  };
}
const ignored = new Set(
  recipeWords(
    "хочу хочется приготовь приготовим приготовить предложи подбери рецепт рецепты блюдо блюда мне пожалуйста сегодня что есть полке что-то вкусное вкусный просто простой быстро быстрый вариант варианты еду поесть на из для с и к моих мои продуктов продукт имеющихся запасов дома домашний домашних блюд сделай дай можно",
  ),
);
const matchWord = (word: string, body: string[]) =>
  body.some(
    (w) =>
      w === word ||
      (Math.min(w.length, word.length) >= 4 &&
        (w.startsWith(word) || word.startsWith(w))),
  );
export function searchLibrary(
  recipeLibrary: (LibraryMetadata & { steps?: string[] })[],
  input: LibrarySearch,
): LibraryPage {
  const excludedIds = new Set(input.excludedRecipeIds ?? []);
  const normalized = normalizeRecipeText(input.query);
  const negatives = [
    ...normalized.matchAll(/(?:^|\s)без\s+([^,.!?;]+)/gu),
  ].flatMap((m) => recipeWords(m[1]));
  const glutenFree = /без\s*глютен/iu.test(normalized),
    vegan = /веган/iu.test(normalized),
    vegetarian = /вегетариан/iu.test(normalized);
  const text = normalized
    .replace(/(?:^|\s)без\s+([^,.!?;]+)/gu, " ")
    .replace(/веган\p{L}*|вегетариан\p{L}*|безглютен\p{L}*/gu, "")
    .replace(/(?:за|до)\s*\d+\s*(?:минут\p{L}*|мин\.?|час\p{L}*)/gu, "");
  const breakfast = /завтрак/.test(text),
    lunch = /обед|ужин/.test(text);
  const category = breakfast
    ? "breakfast"
    : /суп/.test(text)
      ? "soup"
      : /салат/.test(text)
        ? "salad"
        : /десерт/.test(text)
          ? "dessert"
          : "all";
  const categoryWords = new Set(
    recipeWords("завтрак обед ужин суп салат десерт"),
  );
  const terms = recipeWords(text).filter(
    (w) => !ignored.has(w) && !categoryWords.has(w),
  );
  const blocked = [
    ...negatives,
    ...recipeWords(input.exclusions),
    ...(/без\s+мяс/iu.test(normalized)
      ? recipeWords(
          "курица говядина свинина баранина ягнятина утка ветчина бекон колбаса фарш",
        )
      : []),
  ];
  const found = recipeLibrary
    .map((recipe) => {
      const ingredientWords = recipeWords(
        recipe.ingredients.map((i) => i.name).join(" "),
      );
      const titleWords = recipeWords(recipe.name);
      const body = [...titleWords, ...ingredientWords];
      const matches = recipe.ingredients.filter((i) =>
        ingredientOnShelf(i.name, input.products),
      );
      const agePriority = matches.reduce((sum, i) => {
        const hint = classifyPerishability(i.name);
        const lot = input.products.find((p) => ingredientOnShelf(i.name, [p]));
        const age =
          lot?.addedAt && Number.isFinite(Date.parse(lot.addedAt))
            ? Math.max(0, (Date.now() - Date.parse(lot.addedAt)) / 86400000)
            : 0;
        return (
          sum +
          hint.priority +
          (hint.typicalDays ? Math.min(2, age / hint.typicalDays) : 0)
        );
      }, 0);
      return {
        recipe,
        matches: matches.length,
        score:
          terms.filter((t) => matchWord(t, titleWords)).length * 10 +
          (matches.length / recipe.ingredients.length) * 5 +
          agePriority / 10,
        valid:
          !excludedIds.has(recipe.id) &&
          (!input.maxMinutes || (recipe.minutes !== null && recipe.minutes <= input.maxMinutes)) &&
          (input.category === "all" || recipe.category === input.category) &&
          (category === "all" || recipe.category === category) &&
          (!lunch ||
            !["dessert", "drink", "sauce"].includes(recipe.category)) &&
          (!glutenFree || recipe.diets.includes("gluten-free")) &&
          (!vegan || recipe.diets.includes("vegan")) &&
          (!vegetarian ||
            recipe.diets.includes("vegetarian") ||
            recipe.diets.includes("vegan")) &&
          terms.every((t) => matchWord(t, body)) &&
          (input.requiredIngredients ?? []).every((name) =>
            recipeWords(name).every((word) => matchWord(word, ingredientWords)),
          ) &&
          !blocked.some((t) => matchWord(t, ingredientWords)),
      };
    })
    .filter((r) => r.valid)
    .sort((a, b) =>
      input.sort === "quick"
        ? (a.recipe.minutes ?? Infinity) - (b.recipe.minutes ?? Infinity) ||
          a.recipe.id.localeCompare(b.recipe.id)
        : input.sort === "calories"
          ? (a.recipe.perServing?.kcal ?? Infinity) - (b.recipe.perServing?.kcal ?? Infinity) ||
            a.recipe.id.localeCompare(b.recipe.id)
          : b.score - a.score ||
            (a.recipe.minutes ?? Infinity) - (b.recipe.minutes ?? Infinity) ||
            a.recipe.id.localeCompare(b.recipe.id),
    );
  return {
    items: found
      .slice(input.offset, input.offset + input.limit)
      .map(({ recipe: { steps: _steps, ...recipe }, matches }) => ({
        ...recipe,
        stockMatches: matches,
      })),
    total: found.length,
    offset: input.offset,
    limit: input.limit,
    catalogTotal: recipeLibrary.length,
  };
}
