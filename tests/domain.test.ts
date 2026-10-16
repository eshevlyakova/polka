import { describe, it, expect } from "vitest";
import { emptyState } from "../apps/web/src/domain/model";
import { foods, recipes } from "../apps/web/src/data/catalog";
import { cook, eat, deleteEntry } from "../apps/web/src/domain/actions";
import { calculate } from "../apps/web/src/domain/nutrition";
import { parseState } from "../apps/web/src/storage/repository";
const recipe = recipes[0];
function stocked() {
  const s = emptyState();
  s.pantry = recipe.ingredients.map((i, index) => ({
    id: String(index),
    foodId: i.foodId,
    grams: i.grams * 2,
    expiresOn: "2026-12-01",
  }));
  return s;
}
describe("cooking and diary", () => {
  it("cooking deducts ingredients once, eating deducts only batch remainder", () => {
    const s = stocked();
    const cooked = cook(
      s,
      recipe,
      recipe.ingredients,
      foods,
      "batch",
      "2026-10-14",
    );
    expect(cooked.diary).toHaveLength(0);
    const eaten = eat(cooked, "batch", 0.25, "Обед", "entry");
    expect(eaten.pantry).toEqual(cooked.pantry);
    expect(eaten.batches[0].remainingFraction).toBe(0.75);
    expect(eaten.diary[0].nutrients.kcal).toBeCloseTo(
      calculate(recipe.ingredients, foods).kcal * 0.25,
    );
  });
  it("does not mutate input or allow more than leftovers", () => {
    const s = stocked();
    const cooked = cook(s, recipe, recipe.ingredients, foods, "batch", "now");
    expect(s.pantry[0].grams).toBe(400);
    const eaten = eat(cooked, "batch", 0.8, "Обед", "entry");
    expect(() => eat(eaten, "batch", 0.3, "Ужин", "entry2")).toThrow();
  });
  it("deleting entry restores portion but never raw ingredients", () => {
    const cooked = cook(
      stocked(),
      recipe,
      recipe.ingredients,
      foods,
      "batch",
      "now",
    );
    const deleted = deleteEntry(
      eat(cooked, "batch", 0.5, "Обед", "entry"),
      "entry",
    );
    expect(deleted.batches[0].remainingFraction).toBe(1);
    expect(deleted.pantry).toEqual(cooked.pantry);
  });
  it("insufficient or invalid ingredients fail atomically", () => {
    expect(() =>
      cook(emptyState(), recipe, recipe.ingredients, foods, "batch", "now"),
    ).toThrow();
    expect(() =>
      cook(
        stocked(),
        recipe,
        [{ foodId: "egg", grams: -1 }],
        foods,
        "batch",
        "now",
      ),
    ).toThrow();
  });
  it("aggregates duplicate ingredient rows and spends earliest expiry first", () => {
    const s = stocked();
    s.pantry = [
      { id: "late", foodId: "egg", grams: 200, expiresOn: "2026-12-02" },
      { id: "early", foodId: "egg", grams: 100, expiresOn: "2026-12-01" },
    ];
    const cooked = cook(
      s,
      recipe,
      [
        { foodId: "egg", grams: 60 },
        { foodId: "egg", grams: 100 },
      ],
      foods,
      "batch",
      "now",
    );
    expect(cooked.pantry).toEqual([
      { id: "late", foodId: "egg", grams: 140, expiresOn: "2026-12-02" },
    ]);
  });
  it("rejects malformed imports", () => {
    expect(() => parseState({ version: 1 })).toThrow();
    expect(parseState(emptyState())).toEqual(emptyState());
  });
});
