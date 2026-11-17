import type { Recipe } from "./model";
import { ingredientOnShelf } from "./recipeLibrary";

export type AiProduct = {
  foodId: string;
  name: string;
  grams: number;
  /** Legacy clients may send this field; it is ignored. */
  expiresOn?: string;
  addedAt?: string;
};
export type AiRecipeRequest = {
  referenceRecipeId?: string;
  preferences: string;
  exclusions: string;
  maxMinutes: number;
  products: AiProduct[];
  preferredFoodId?: string;
  requiredIngredients?: string[];
};
export const AI_MODEL = "glm-4.7-flash";
export class AiError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string,
  ) {
    super(message);
  }
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new AiError("Некорректные данные");
  return value as Record<string, unknown>;
};
const text = (value: unknown, max: number, required = false) => {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new AiError("Проверь текстовые поля");
  return value.trim();
};
export function parseAiRequest(value: unknown): AiRecipeRequest {
  const data = object(value);
  const preferences = text(data.preferences, 600);
  const exclusions = text(data.exclusions, 300);
  const requiredIngredients =
    data.requiredIngredients === undefined
      ? undefined
      : (() => {
          if (
            !Array.isArray(data.requiredIngredients) ||
            data.requiredIngredients.length > 12
          )
            throw new AiError("Проверь обязательные ингредиенты.");
          return data.requiredIngredients.map((s) => text(s, 80, true));
        })();
  if (
    typeof data.maxMinutes !== "number" ||
    !Number.isInteger(data.maxMinutes) ||
    data.maxMinutes < 5 ||
    data.maxMinutes > 2880
  )
    throw new AiError("Время приготовления — от 5 до 2880 минут");
  if (
    !Array.isArray(data.products) ||
    data.products.length < 1 ||
    data.products.length > 50
  )
    throw new AiError(
      "Для подбора нужны продукты на полке (не более 50 позиций)",
    );
  const seen = new Set<string>();
  const products = data.products.map((value) => {
    const item = object(value);
    const foodId = text(item.foodId, 80, true),
      name = text(item.name, 100, true);
    if (
      seen.has(foodId) ||
      typeof item.grams !== "number" ||
      !Number.isFinite(item.grams) ||
      item.grams <= 0 ||
      item.grams > 100_000
    )
      throw new AiError("Проверь количество продуктов");
    seen.add(foodId);
    const addedAt =
      item.addedAt === undefined ? undefined : text(item.addedAt, 40);
    if (addedAt && !Number.isFinite(Date.parse(addedAt)))
      throw new AiError("Проверь дату добавления продукта");
    return { foodId, name, grams: item.grams, ...(addedAt ? { addedAt } : {}) };
  });
  const blocked = exclusions
    .split(",")
    .map((value) => value.trim().toLocaleLowerCase())
    .filter(Boolean);
  const eligible = products.filter(
    (product) =>
      !blocked.some((word) => product.name.toLocaleLowerCase().includes(word)),
  );
  if (!eligible.length)
    throw new AiError(
      "На полке нет продуктов с учётом исключений. Проверь запасы и настройки профиля.",
    );
  let preferredFoodId =
    data.preferredFoodId === undefined
      ? undefined
      : text(data.preferredFoodId, 80, true);
  // An explicit ingredient phrase with one unambiguous stock match is required.
  if (!preferredFoodId) {
    const from = (
      preferences
        .toLocaleLowerCase("ru")
        .replace(/яицом/gu, "яйцом")
        .replace(/яиц/gu, "яйц")
        .match(/(?:^|\s)(?:из|с|со)\s+([^.!?;]+)/u)?.[1] ?? ""
    ).split(/(?:^|\s)(?:без|кроме|но|не)\s/u)[0];
    const stems = [
      "творог",
      "банан",
      "огур",
      "помидор",
      "куриц",
      "яйц",
      "овсян",
      "йогурт",
    ];
    const found = stems.filter((s) => from.includes(s));
    const stem = found.length === 1 ? found[0] : undefined;
    if (stem) {
      const matches = eligible.filter((p) =>
        p.name.toLocaleLowerCase("ru").replace(/яиц/gu, "яйц").includes(stem),
      );
      if (matches.length === 1) preferredFoodId = matches[0].foodId;
    }
  }
  if (
    preferredFoodId &&
    !eligible.some((product) => product.foodId === preferredFoodId)
  )
    throw new AiError("Выбранного продукта нет среди доступных запасов");
  return {
    ...(data.referenceRecipeId === undefined
      ? {}
      : { referenceRecipeId: text(data.referenceRecipeId, 120, true) }),
    preferences,
    exclusions,
    maxMinutes: data.maxMinutes,
    products: eligible,
    ...(preferredFoodId ? { preferredFoodId } : {}),
    ...(requiredIngredients ? { requiredIngredients } : {}),
  };
}
export function validateAiRecipes(
  value: unknown,
  request: AiRecipeRequest,
): Omit<Recipe, "id">[] {
  const data = object(value);
  if (
    !Array.isArray(data.recipes) ||
    data.recipes.length < 1 ||
    data.recipes.length > 3
  )
    throw new AiError(
      "Модель не вернула подходящие рецепты. Попробуй уточнить пожелания.",
      502,
    );
  const available = new Map(
    request.products.map((item) => [item.foodId, item.grams]),
  );
  return data.recipes.map((value) => {
    const recipe = object(value);
    const name = text(recipe.name, 100, true),
      equipment = text(recipe.equipment, 100, true);
    if (
      typeof recipe.minutes !== "number" ||
      !Number.isInteger(recipe.minutes) ||
      recipe.minutes < 1 ||
      recipe.minutes > request.maxMinutes ||
      typeof recipe.servings !== "number" ||
      !Number.isInteger(recipe.servings) ||
      recipe.servings < 1 ||
      recipe.servings > 20
    )
      throw new AiError(
        "Модель нарушила ограничения рецепта. Уточни пожелания и повтори.",
        502,
      );
    if (
      !Array.isArray(recipe.ingredients) ||
      recipe.ingredients.length < 1 ||
      recipe.ingredients.length > 20 ||
      !Array.isArray(recipe.steps) ||
      recipe.steps.length < 1 ||
      recipe.steps.length > 12
    )
      throw new AiError(
        "Модель вернула неполный рецепт. Попробуй ещё раз.",
        502,
      );
    const used = new Map<string, number>();
    const ingredients = recipe.ingredients.map((value) => {
      const item = object(value),
        foodId = text(item.foodId, 80, true);
      if (
        !available.has(foodId) ||
        typeof item.grams !== "number" ||
        !Number.isFinite(item.grams) ||
        item.grams <= 0
      )
        throw new AiError(
          "Не получилось составить рецепт из твоих продуктов. Попробуй уточнить пожелания или выбрать готовый рецепт ниже.",
          502,
        );
      used.set(foodId, (used.get(foodId) ?? 0) + item.grams);
      return { foodId, grams: item.grams };
    });
    if (
      [...used].some(([id, grams]) => grams > available.get(id)! + 1e-6) ||
      (request.requiredIngredients ?? []).some(
        (name) =>
          !ingredientOnShelf(
            name,
            request.products.filter((p) => used.has(p.foodId)),
          ),
      ) ||
      (request.preferredFoodId && !used.has(request.preferredFoodId))
    )
      throw new AiError(
        "Рецепт не соответствует продуктам на полке. Попробуй ещё раз.",
        502,
      );
    const steps = recipe.steps.map((value) => text(value, 700, true));
    return {
      ...(recipe.origin &&
      typeof recipe.origin === "object" &&
      ["label", "url", "license", "licenseUrl"].every(
        (k) =>
          typeof (recipe.origin as Record<string, unknown>)[k] === "string",
      ) &&
      /^https:\/\//.test((recipe.origin as Record<string, string>).url) &&
      /^https:\/\//.test((recipe.origin as Record<string, string>).licenseUrl)
        ? { origin: recipe.origin as Recipe["origin"] }
        : {}),
      name,
      minutes: recipe.minutes,
      servings: recipe.servings,
      equipment,
      ingredients,
      steps,
      emoji: "",
      source: "ai" as const,
    };
  });
}
