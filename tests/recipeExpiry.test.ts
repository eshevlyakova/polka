import { expect, it } from "vitest";
import { expiringIngredients } from "../apps/web/src/domain/recipeExpiry";
const stock = (foodId: string, expiresOn: string, grams = 100) => ({
  id: `${foodId}-${expiresOn}`,
  foodId,
  expiresOn,
  grams,
});
it("marks only recipe ingredients with positive stocks expiring in 0–2 days", () => {
  const ingredients = ["egg", "tomato", "oil"].map((foodId) => ({
    foodId,
    grams: 10,
  }));
  const pantry = [
    stock("egg", "2026-10-19"),
    stock("tomato", "2026-10-21"),
    stock("oil", "2026-10-22"),
    stock("milk", "2026-10-20"),
  ];
  expect(expiringIngredients(ingredients, pantry, "2026-10-19")).toEqual([
    { foodId: "egg", date: "2026-10-19", days: 0 },
    { foodId: "tomato", date: "2026-10-21", days: 2 },
  ]);
});
it("deduplicates batches and excludes expired, empty, undated and removed ingredients", () => {
  const ingredients = [
    { foodId: "egg", grams: 100 },
    { foodId: "oil", grams: 0 },
  ];
  const pantry = [
    stock("egg", "2026-10-21"),
    stock("egg", "2026-10-20"),
    stock("egg", "2026-10-18"),
    stock("egg", "2026-10-19", 0),
    stock("egg", ""),
    stock("oil", "2026-10-19"),
  ];
  expect(expiringIngredients(ingredients, pantry, "2026-10-19")).toEqual([
    { foodId: "egg", date: "2026-10-20", days: 1 },
  ]);
});
