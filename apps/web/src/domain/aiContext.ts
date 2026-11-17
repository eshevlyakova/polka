import {
  parseAiRequest,
  type AiRecipeRequest,
} from "../../../../shared/aiRecipes";
import { type AppState, type Food } from "./model";

export function buildAiRequest(
  state: AppState,
  catalog: Food[],
  preferences: string,
  preferredFoodId?: string,
): AiRecipeRequest {
  const products = new Map<
    string,
    { foodId: string; name: string; grams: number; addedAt?: string }
  >();
  for (const lot of state.pantry) {
    if (lot.grams <= 0) continue;
    const food = catalog.find((item) => item.id === lot.foodId);
    if (!food) continue;
    const previous = products.get(lot.foodId);
    products.set(lot.foodId, {
      foodId: lot.foodId,
      name: food.name,
      grams: (previous?.grams ?? 0) + lot.grams,
      addedAt: [previous?.addedAt, lot.addedAt]
        .filter((s): s is string => Boolean(s))
        .sort()[0],
    });
  }
  return parseAiRequest({
    preferences,
    exclusions: state.settings.exclusions,
    maxMinutes: state.settings.maxMinutes,
    products: [...products.values()],
    ...(preferredFoodId ? { preferredFoodId } : {}),
  });
}
