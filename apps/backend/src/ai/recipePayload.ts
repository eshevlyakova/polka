import type { AiRecipeRequest } from "../../../../shared/aiRecipes";
/** Normalize explicit numeric strings and unambiguous names; never invent or drop ingredients. */
export function normalizeModelPayload(
  value: unknown,
  request: AiRecipeRequest,
) {
  if (!value || typeof value !== "object") throw new Error("Invalid response");
  const payload = value as { recipes?: unknown; perishableFoodIds?: unknown };
  const normalize = (s: string) =>
    s.trim().toLocaleLowerCase("ru").replace(/ё/g, "е");
  const aliases: Record<string, string[]> = {
    cottage: ["творог", "cottage cheese", "cottage_cheese"],
    egg: ["яйцо", "яйца", "eggs"],
    tomato: ["помидоры", "помидор", "томаты", "tomatoes"],
    milk: ["молоко"],
    oil: ["масло растительное", "растительное масло"],
    banana: ["бананы", "bananas"],
    rice: ["рис"],
    oats: ["овсяные хлопья", "овсянка"],
    cucumber: ["огурец", "огурцы"],
  };
  function id(value: unknown) {
    if (typeof value !== "string") return value;
    const exact = request.products.find((p) => p.foodId === value);
    if (exact) return exact.foodId;
    const matches = request.products.filter((p) =>
      [p.foodId, p.name, ...(aliases[p.foodId] ?? [])].some(
        (name) => normalize(name) === normalize(value),
      ),
    );
    return matches.length === 1 ? matches[0].foodId : value;
  }
  function grams(value: unknown) {
    if (
      typeof value === "string" &&
      /^\s*\d+(?:[.,]\d+)?\s*(?:г|g)?\s*$/iu.test(value)
    )
      return Number(value.replace(/[гg\s]/giu, "").replace(",", "."));
    return value;
  }
  return {
    ...payload,
    recipes: Array.isArray(payload.recipes)
      ? payload.recipes.map((recipe) => {
          if (!recipe || typeof recipe !== "object") return recipe;
          return {
            ...recipe,
            ingredients: Array.isArray(recipe.ingredients)
              ? recipe.ingredients.map((item: unknown) =>
                  item && typeof item === "object"
                    ? {
                        ...item,
                        foodId: id((item as Record<string, unknown>).foodId),
                        grams: grams((item as Record<string, unknown>).grams),
                      }
                    : item,
                )
              : recipe.ingredients,
          };
        })
      : payload.recipes,
  };
}
