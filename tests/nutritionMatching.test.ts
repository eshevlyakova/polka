import { it, expect } from "vitest";
import {
  nutritionCandidates,
  nutritionName,
  type NutritionProduct,
} from "../shared/nutritionMatching";
import { basicFoods } from "../shared/basicFoods";
import { receiptDrafts, importReceipt } from "../apps/web/src/domain/receipt";
import { emptyState } from "../shared/model";
import { catalogProducts } from "../apps/backend/src/catalog/repository";
import { handleRequest } from "../apps/backend/src/router";
const label: NutritionProduct = {
  id: "brand-curd",
  name: "Творог 5%",
  brand: "Марка",
  barcode: "4600000000000",
  quantityLabel: "200 г",
  basis: "per100g",
  categories: [],
  per100: { kcal: 120, protein: 17, fat: 5, carbs: 2 },
  source: { url: "https://world.openfoodfacts.org/product/4600000000000" },
};
const item = (
  name: string,
  candidates = nutritionCandidates(name, [label], basicFoods),
) => ({
  id: "one",
  name,
  quantity: 1,
  unit: "pcs" as const,
  packageSize: 200,
  packageUnit: "g" as const,
  grams: 200,
  candidates,
});
it("keeps a sourced basic catalog and a larger Russian branded sample", () => {
  expect(basicFoods).toHaveLength(50);
  expect(catalogProducts.length).toBeGreaterThanOrEqual(302);
  expect(new Set(basicFoods.map((f) => f.id)).size).toBe(50);
});
it("ignores package weight and punctuation, distinguishes fat and automatically selects a strong branded match", () => {
  expect(nutritionName("ТВОРОГ 5% 200 г")).toBe("творог 5%");
  const matches = nutritionCandidates(
    "Творог Марка 5% 200 г",
    [label],
    basicFoods,
  );
  expect(matches[0].confidence).toBe("exact");
  const row = receiptDrafts(
    [item("Творог Марка 5% 200 г", matches)],
    basicFoods,
  )[0];
  expect(row.foodId).toBe(label.id);
  expect(
    importReceipt(emptyState(), [row], basicFoods).customFoods[0].per100,
  ).toEqual(label.per100);
  expect(
    nutritionCandidates("Творог Марка 2%", [label], basicFoods).some(
      (c) => c.food.id === label.id,
    ),
  ).toBe(false);
});
it("does not pick an arbitrary branded record when several labels match", () => {
  const other = { ...label, id: "brand-other", brand: "Другая марка" };
  const rows = nutritionCandidates("Творог 5%", [label, other], basicFoods);
  expect(rows.filter((c) => c.confidence === "exact")).toHaveLength(0);
  expect(receiptDrafts([item("Творог 5%", rows)], basicFoods)[0].foodId).toBe(
    "cottage",
  );
});
it("uses a clear solid-food category as the 100 g basis and keeps confirmation for liquids", () => {
  const cheese = {
    ...label,
    name: "Сыр Марка",
    basis: "per100g-or-100ml-as-labelled",
    categories: ["en:cheeses"],
  };
  expect(
    nutritionCandidates("Сыр Марка", [cheese], basicFoods)[0]
      .needsUnitConfirmation,
  ).toBe(false);
  const milk = { ...cheese, name: "Молоко Марка", categories: ["en:milks"] };
  expect(
    nutritionCandidates("Молоко Марка", [milk], basicFoods)[0]
      .needsUnitConfirmation,
  ).toBe(true);
});
it("uses generic produce automatically but does not equate jam, canned food or flavored dairy with raw/basic foods", () => {
  expect(
    nutritionCandidates("Йогурт натуральный", [], basicFoods).find(
      (c) => c.kind === "generic",
    )?.food.id,
  ).toBe("yogurt");
  const apple = receiptDrafts([item("Яблоки красные 1 кг", [])], basicFoods)[0];
  expect(apple.foodId).toBe("apple");
  expect(apple.nutrition.kcal).toBe("");
  for (const name of [
    "Яблочный сок",
    "Йогурт клубничный",
    "Молоко 3,2%",
    "Творог 0%",
    "Огурцы маринованные",
    "Рис готовый",
    "Йогурт натуральный клубничный",
  ]) {
    expect(
      nutritionCandidates(name, [], basicFoods).filter(
        (c) => c.kind === "generic",
      ),
    ).toHaveLength(0);
  }
});
it("does not autofill or save an incomplete nutrition record", () => {
  const bad = {
    food: {
      id: "broken",
      name: "Неизвестный продукт",
      emoji: "",
      per100: { kcal: NaN, protein: 5, fat: 5, carbs: 5 },
    },
    kind: "label" as const,
    confidence: "exact" as const,
  };
  const row = receiptDrafts(
    [item("Неизвестный продукт", [bad])],
    basicFoods,
  )[0];
  expect(row.foodId).toBe("");
  expect(() => importReceipt(emptyState(), [row], basicFoods)).toThrow("КБЖУ");
});
it("reuses a user-saved product on the next receipt without asking for nutrition again", () => {
  const saved = {
    id: "mine",
    name: "Хумус Марка",
    emoji: "",
    per100: { kcal: 180, protein: 6, fat: 10, carbs: 16 },
  };
  const row = receiptDrafts(
    [item("Хумус Марка 200 г", [])],
    [...basicFoods, saved],
  )[0];
  expect(row.foodId).toBe("mine");
  expect(row.source).toBe("saved");
  expect(
    row.recognized.candidates.filter((c) => c.food.id === "mine"),
  ).toHaveLength(1);
});
it("provides nutrition matching without an AI request or key", async () => {
  const response = await handleRequest(
    new Request(
      "https://api.test/api/catalog/nutrition-match?q=" +
        encodeURIComponent("Яблоки"),
    ),
    {},
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(
    body.candidates.some(
      (c: { food: { id: string } }) => c.food.id === "apple",
    ),
  ).toBe(true);
  expect(body.genericFoods).toBe(50);
});
