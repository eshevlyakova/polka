import { expect, it } from "vitest";
import { foods, recipes } from "../apps/web/src/data/catalog";
import { scaleIngredients, shortages } from "../apps/web/src/domain/cooking";
import { foodMeasures, toGrams } from "../apps/web/src/domain/measures";
import { calculate, scale } from "../apps/web/src/domain/nutrition";
import { cook } from "../apps/web/src/domain/actions";
import { emptyState } from "../shared/model";
import { perishableScore } from "../shared/perishability";
import { parseAiRequest } from "../shared/aiRecipes";
it("scales edited ingredients and total nutrition while preserving per-portion nutrition", () => {
  const recipe = recipes[0],
    original = recipe.ingredients.map((i) => ({ ...i }));
  const scaled = scaleIngredients(original, recipe.servings, 6);
  expect(original).toEqual(recipe.ingredients);
  expect(calculate(scaled, foods).kcal).toBeCloseTo(
    calculate(original, foods).kcal * 3,
  );
  const perPortion = scale(calculate(scaled, foods), 1 / 6);
  const before = scale(calculate(original, foods), 1 / 2);
  for (const key of ["kcal", "protein", "fat", "carbs"] as const)
    expect(perPortion[key]).toBeCloseTo(before[key]);
  for (const n of [0, -1, 0.5, 51, Infinity])
    expect(() => scaleIngredients(original, 2, n)).toThrow();
});
it("uses food-specific household estimates instead of a universal spoon mass", () => {
  const oil = foodMeasures(foods.find((f) => f.id === "oil"));
  expect(
    toGrams(
      1,
      oil.find((m) => m.id === "tbsp")!,
    ),
  ).toBe(14);
  expect(
    toGrams(
      3,
      oil.find((m) => m.id === "tsp")!,
    ),
  ).toBeCloseTo(14);
  expect(
    toGrams(
      2,
      foodMeasures(foods[0]).find((m) => m.id === "piece")!,
    ),
  ).toBe(100);
  expect(foodMeasures(foods.find((f) => f.id === "chicken"))).toHaveLength(1);
});
it("combines duplicate requirements and reports the exact missing quantity", () => {
  const pantry = [{ id: "1", foodId: "egg", grams: 100, expiresOn: "" }];
  expect(
    shortages(
      [
        { foodId: "egg", grams: 60 },
        { foodId: "egg", grams: 60 },
      ],
      pantry,
      foods,
    ),
  ).toEqual([{ foodId: "egg", name: "Яйцо", grams: 20 }]);
});
it("stores measured cooked weight but never invents it from raw ingredients", () => {
  const state = emptyState(),
    recipe = recipes[0];
  state.pantry = recipe.ingredients.map((i) => ({
    ...i,
    id: i.foodId,
    expiresOn: "",
  }));
  expect(
    cook(state, recipe, recipe.ingredients, foods, "b", "now").batches[0]
      .cookedWeightGrams,
  ).toBeUndefined();
  expect(
    cook(state, recipe, recipe.ingredients, foods, "b", "now", 350).batches[0]
      .cookedWeightGrams,
  ).toBe(350);
  expect(() =>
    cook(state, recipe, recipe.ingredients, foods, "b", "now", -1),
  ).toThrow();
});
it("prioritizes older fresh stock, independently of lot order", () => {
  const ingredient = [{ foodId: "milk", grams: 50 }];
  const fresh = [
    {
      foodId: "milk",
      name: "Молоко",
      grams: 100,
      addedAt: "2026-11-06T12:00:00Z",
    },
  ];
  const old = [{ ...fresh[0], addedAt: "2026-11-02T12:00:00Z" }];
  const now = Date.parse("2026-11-06T12:00:00Z");
  expect(perishableScore(ingredient, old, new Set(), now)).toBeGreaterThan(
    perishableScore(ingredient, fresh, new Set(), now),
  );
  expect(perishableScore(ingredient, [...fresh, ...old], new Set(), now)).toBe(
    perishableScore(ingredient, [...old, ...fresh], new Set(), now),
  );
});
it("accepts an hour and longer time limits with product age metadata", () => {
  const input = {
    preferences: "Ужин",
    exclusions: "",
    products: [
      {
        foodId: "egg",
        name: "Яйцо",
        grams: 200,
        addedAt: "2026-11-01T12:00:00Z",
      },
    ],
  };
  expect(parseAiRequest({ ...input, maxMinutes: 60 }).maxMinutes).toBe(60);
  expect(parseAiRequest({ ...input, maxMinutes: 180 }).maxMinutes).toBe(180);
  expect(() => parseAiRequest({ ...input, maxMinutes: 0 })).toThrow();
});
