import { validateProfile } from "./profile";
import type { AppState, Nutrients } from "./model";
const finite = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;
const nutrients = (n: unknown): n is Nutrients =>
  !!n &&
  typeof n === "object" &&
  ["kcal", "protein", "fat", "carbs"].every((k) =>
    finite((n as Record<string, unknown>)[k]),
  );
export function parseState(value: unknown): AppState {
  const s = value as AppState;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.pantry) ||
    !Array.isArray(s.diary) ||
    !Array.isArray(s.batches) ||
    !Array.isArray(s.customFoods) ||
    !s.settings
  )
    throw new Error("Неподдерживаемый формат данных");
  if (
    !s.pantry.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.foodId === "string" &&
        finite(p.grams) &&
        typeof p.expiresOn === "string" &&
        (p.label === undefined ||
          (typeof p.label === "string" && p.label.length <= 160)),
    ) ||
    !s.diary.every(
      (e) =>
        typeof e.id === "string" &&
        typeof e.name === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        nutrients(e.nutrients) &&
        typeof e.meal === "string" &&
        typeof e.amountLabel === "string" &&
        typeof e.approximate === "boolean" &&
        (e.note === undefined || typeof e.note === "string") &&
        (e.eatenAt === undefined || typeof e.eatenAt === "string") &&
        (e.source === undefined || typeof e.source === "string") &&
        (e.pantryUsed === undefined ||
          (Array.isArray(e.pantryUsed) &&
            e.pantryUsed.every(
              (item) =>
                typeof item.id === "string" &&
                typeof item.foodId === "string" &&
                finite(item.grams) &&
                item.grams > 0 &&
                typeof item.expiresOn === "string",
            ))) &&
        (e.fraction === undefined || finite(e.fraction)),
    ) ||
    !s.batches.every(
      (b) =>
        typeof b.id === "string" &&
        typeof b.recipeName === "string" &&
        typeof b.cookedAt === "string" &&
        nutrients(b.nutrients) &&
        finite(b.remainingFraction) &&
        b.remainingFraction <= 1 &&
        finite(b.servings) &&
        b.servings > 0 &&
        (b.estimatedWeightGrams === undefined ||
          (finite(b.estimatedWeightGrams) && b.estimatedWeightGrams > 0)) &&
        (b.cookedWeightGrams === undefined ||
          (finite(b.cookedWeightGrams) &&
            b.cookedWeightGrams > 0 &&
            b.cookedWeightGrams <= 100_000)),
    ) ||
    !s.customFoods.every(
      (f) =>
        typeof f.id === "string" &&
        typeof f.name === "string" &&
        typeof f.emoji === "string" &&
        nutrients(f.per100),
    ) ||
    !finite(s.settings.calorieGoal) ||
    typeof s.settings.onboarded !== "boolean" ||
    typeof s.settings.exclusions !== "string" ||
    !finite(s.settings.maxMinutes)
  )
    throw new Error("Файл содержит некорректные значения");
  if (
    s.aiRecipes !== undefined &&
    (!Array.isArray(s.aiRecipes) ||
      s.aiRecipes.length > 3 ||
      !s.aiRecipes.every(
        (recipe) =>
          recipe &&
          recipe.source === "ai" &&
          typeof recipe.id === "string" &&
          typeof recipe.name === "string" &&
          recipe.name.length > 0 &&
          recipe.name.length <= 100 &&
          finite(recipe.minutes) &&
          recipe.minutes > 0 &&
          recipe.minutes <= 2880 &&
          Number.isInteger(recipe.servings) &&
          recipe.servings > 0 &&
          recipe.servings <= 20 &&
          typeof recipe.equipment === "string" &&
          typeof recipe.emoji === "string" &&
          Array.isArray(recipe.ingredients) &&
          recipe.ingredients.length > 0 &&
          recipe.ingredients.length <= 20 &&
          recipe.ingredients.every(
            (item) =>
              typeof item.foodId === "string" &&
              finite(item.grams) &&
              item.grams > 0,
          ) &&
          Array.isArray(recipe.steps) &&
          recipe.steps.length > 0 &&
          recipe.steps.length <= 12 &&
          recipe.steps.every(
            (step) =>
              typeof step === "string" && step.length > 0 && step.length <= 700,
          ),
      ))
  )
    throw new Error("Некорректная подборка рецептов");
  if (s.profile !== undefined) validateProfile(s.profile);
  return s;
}
