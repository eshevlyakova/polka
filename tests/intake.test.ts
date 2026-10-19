import { expect, it } from "vitest";
import { emptyState, type AppState } from "../apps/web/src/domain/model";
import { foods, recipes } from "../apps/web/src/data/catalog";
import { recordIntake } from "../apps/web/src/domain/intake";
import { cook, deleteEntry } from "../apps/web/src/domain/actions";
import { parseState } from "../apps/web/src/storage/repository";
const context = { meal: "Завтрак", date: "2026-10-19" };
function stocked(): AppState {
  return {
    ...emptyState(),
    pantry: [
      { id: "late", foodId: "egg", grams: 200, expiresOn: "2026-10-25" },
      { id: "early", foodId: "egg", grams: 100, expiresOn: "2026-10-20" },
    ],
  };
}
it("eating a shelf product consumes earliest lots once and records the actual grams", () => {
  const state = stocked();
  const next = recordIntake(
    state,
    {
      ...context,
      source: "pantry",
      foodId: "egg",
      grams: 150,
      approximate: false,
    },
    foods,
    "entry",
  );
  expect(next.pantry).toEqual([{ ...state.pantry[0], grams: 150 }]);
  expect(state.pantry[0].grams).toBe(200);
  expect(
    next.diary[0].pantryUsed?.reduce((sum, item) => sum + item.grams, 0),
  ).toBe(150);
  expect(next.diary[0].nutrients.kcal).toBe(
    foods.find((food) => food.id === "egg")!.per100.kcal * 1.5,
  );
  expect(parseState(JSON.parse(JSON.stringify(next)))).toEqual(next);
});
it("rejects invalid and excessive grams atomically", () => {
  const state = stocked();
  const before = JSON.stringify(state);
  for (const grams of [0, -1, NaN, Infinity, 301])
    expect(() =>
      recordIntake(
        state,
        {
          ...context,
          source: "pantry",
          foodId: "egg",
          grams,
          approximate: false,
        },
        foods,
        "entry",
      ),
    ).toThrow();
  expect(JSON.stringify(state)).toBe(before);
});
it("deletion restores consumed lots and does not restore them twice", () => {
  const next = recordIntake(
    stocked(),
    {
      ...context,
      source: "pantry",
      foodId: "egg",
      grams: 300,
      approximate: false,
    },
    foods,
    "entry",
  );
  expect(next.pantry).toHaveLength(0);
  const restored = deleteEntry(next, "entry");
  expect(restored.pantry.reduce((sum, item) => sum + item.grams, 0)).toBe(300);
  expect(restored.pantry.find((item) => item.id === "early")?.expiresOn).toBe(
    "2026-10-20",
  );
  expect(deleteEntry(restored, "entry")).toEqual(restored);
});
it("other food never changes pantry and deletion never adds shelf stock", () => {
  const state = stocked();
  const next = recordIntake(
    state,
    {
      ...context,
      source: "other",
      foodId: "egg",
      grams: 500,
      approximate: true,
    },
    foods,
    "entry",
  );
  expect(next.pantry).toEqual(state.pantry);
  expect(next.diary[0].pantryUsed).toBeUndefined();
  expect(deleteEntry(next, "entry").pantry).toEqual(state.pantry);
});
it("prepared intake uses batch fractions only, rejects excess, and restores the batch on deletion", () => {
  const recipe = recipes[0];
  const state = emptyState();
  state.pantry = recipe.ingredients.map((item, index) => ({
    id: String(index),
    ...item,
    expiresOn: "",
  }));
  const cooked = cook(
    state,
    recipe,
    recipe.ingredients,
    foods,
    "batch",
    "2026-10-19T10:00:00Z",
  );
  const next = recordIntake(
    cooked,
    { ...context, source: "prepared", batchId: "batch", fraction: 0.25 },
    foods,
    "entry",
  );
  expect(next.pantry).toEqual(cooked.pantry);
  expect(next.batches[0].remainingFraction).toBe(0.75);
  expect(next.diary[0].nutrients.kcal).toBe(
    cooked.batches[0].nutrients.kcal / 4,
  );
  expect(() =>
    recordIntake(
      next,
      { ...context, source: "prepared", batchId: "batch", fraction: 0.8 },
      foods,
      "entry2",
    ),
  ).toThrow();
  expect(deleteEntry(next, "entry").batches[0].remainingFraction).toBe(1);
});
it("rejects impossible meal dates and corrupted stock restoration metadata", () => {
  expect(() =>
    recordIntake(
      stocked(),
      {
        ...context,
        date: "2026-02-30",
        source: "other",
        foodId: "egg",
        grams: 100,
        approximate: false,
      },
      foods,
      "entry",
    ),
  ).toThrow();
  const next = recordIntake(
    stocked(),
    {
      ...context,
      source: "pantry",
      foodId: "egg",
      grams: 100,
      approximate: false,
    },
    foods,
    "entry",
  );
  next.diary[0].pantryUsed![0].grams = -1;
  expect(() => parseState(next)).toThrow();
});
