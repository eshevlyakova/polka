import { expect, it } from "vitest";
import { foods } from "../apps/web/src/data/catalog";
import {
  perishableIngredients,
  recipePriority,
} from "../apps/web/src/domain/recipePriority";
import {
  classifyPerishability,
  perishableScore,
} from "../shared/perishability";
const stock = (foodId: string, grams = 100) => ({
  id: foodId,
  foodId,
  grams,
  expiresOn: "2000-01-01",
});
it("prioritizes available fresh foods regardless of legacy expiry dates", () => {
  const ingredients = ["egg", "tomato", "oil"].map((foodId) => ({
    foodId,
    grams: 10,
  }));
  expect(
    perishableIngredients(
      ingredients,
      [stock("egg"), stock("tomato"), stock("milk"), stock("oil")],
      foods,
    ).map((f) => f.id),
  ).toEqual(["egg", "tomato"]);
  expect(
    recipePriority(
      [{ foodId: "cottage", grams: 100 }],
      [stock("cottage")],
      foods,
    ),
  ).toBeGreaterThan(
    recipePriority([{ foodId: "rice", grams: 100 }], [stock("rice")], foods),
  );
});
it("does not prioritize empty lots, removed ingredients, preserved foods or duplicate lots", () => {
  expect(
    perishableIngredients([{ foodId: "egg", grams: 0 }], [stock("egg")], foods),
  ).toEqual([]);
  expect(
    perishableIngredients(
      [{ foodId: "egg", grams: 100 }],
      [stock("egg", 0)],
      foods,
    ),
  ).toEqual([]);
  for (const name of [
    "Замороженная клубника",
    "Сушёные яблоки",
    "Молоко ультрапастеризованное",
    "Печенье Топлёное молоко",
  ])
    expect(classifyPerishability(name).priority).toBe(0);
  expect(
    perishableScore(
      [{ foodId: "a", grams: 20 }],
      [
        { foodId: "a", name: "Творог", grams: 10 },
        { foodId: "a", name: "Творог", grams: 50 },
      ],
    ),
  ).toBe(3);
});
it("accepts AI hints for unknown foods without overriding known preserved categories", () => {
  const products = [
    { foodId: "a", name: "Питахайя", grams: 100 },
    { foodId: "b", name: "Замороженные овощи", grams: 100 },
  ];
  expect(
    perishableScore(
      products.map((p) => ({ foodId: p.foodId, grams: 10 })),
      products,
      new Set(["a", "b"]),
    ),
  ).toBe(2);
});
