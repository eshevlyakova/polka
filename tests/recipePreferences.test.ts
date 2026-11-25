import { expect, it } from "vitest";
import { emptyState } from "../shared/model";
import { parseAccountState } from "../shared/accountState";
import { rateRecipe, tasteScore } from "../shared/recipePreferences";
import { personalLibraryIdeas } from "../apps/web/src/domain/personalIdeas";
import { foods } from "../apps/web/src/data/catalog";
import type { LibraryRecipe } from "../shared/recipeLibrary";
import { parseLibrarySearch, searchLibrary } from "../shared/librarySearch";

function recipe(id: string, names: string[], category = "main"): LibraryRecipe {
  return {
    id,
    name: id,
    ingredients: names.map((name, i) => ({
      id: String(i),
      name,
      quantity: 100,
      unit: "g",
    })),
    category,
    summary: "",
    country: "",
    diets: [],
    servings: 1,
    minutes: 15,
    perServing: { kcal: 100, protein: 5, fat: 5, carbs: 10 },
    steps: ["Приготовить"],
    origin: {
      label: "Fixture",
      url: "https://example.com",
      license: "test",
      licenseUrl: "https://example.com",
    },
  };
}
const features = (r: LibraryRecipe) => ({
  ...r,
  ingredients: r.ingredients.map((i) => i.name),
});
function stocked() {
  const state = emptyState();
  state.pantry = [
    { id: "stock", foodId: "cottage", grams: 500, expiresOn: "" },
  ];
  return state;
}
const now = "2026-11-24T10:00:00.000Z";
it("has no ideas on an empty or zero-stock shelf, even with likes", () => {
  const r = recipe("liked", ["Творог"]);
  const state = rateRecipe(emptyState(), features(r), "like", now);
  expect(personalLibraryIdeas([r], state, foods)).toEqual([]);
  state.pantry = [{ id: "zero", foodId: "cottage", grams: 0, expiresOn: "" }];
  expect(personalLibraryIdeas([r], state, foods)).toEqual([]);
});
it("starts with diverse stock-related recipes without needing any history", () => {
  const recipes = [
    recipe("a", ["Творог", "Банан"], "breakfast"),
    recipe("b", ["Творог", "Банан"], "breakfast"),
    recipe("c", ["Творог", "Яйцо"], "dessert"),
    recipe("unrelated", ["Курица", "Рис"]),
  ];
  expect(
    personalLibraryIdeas(recipes, stocked(), foods).map((r) => r.id),
  ).toEqual(["a", "c", "b"]);
});
it("uses likes and dislikes beyond the first 24 catalogue results, without violating exclusions or time", () => {
  const liked = recipe("liked", ["Творог", "Банан"], "breakfast");
  let state = rateRecipe(stocked(), features(liked), "like", now);
  state = rateRecipe(
    state,
    features(recipe("disliked", ["Творог", "Яйцо"], "dessert")),
    "dislike",
    now,
  );
  const candidates = Array.from({ length: 35 }, (_, i) =>
    recipe(`egg-${i}`, ["Творог", "Яйцо"], "dessert"),
  );
  const preferred = recipe("banana", ["Творог", "Банан"], "breakfast");
  expect(tasteScore(features(preferred), state)).toBeGreaterThan(
    tasteScore(features(candidates[0]), state),
  );
  expect(
    personalLibraryIdeas([...candidates, liked, preferred], state, foods)[0].id,
  ).toBe("banana");
  state.settings.exclusions = "банан";
  expect(
    personalLibraryIdeas([...candidates, preferred], state, foods).some(
      (r) => r.id === "banana",
    ),
  ).toBe(false);
  state.settings.exclusions = "";
  preferred.minutes = 100;
  expect(
    personalLibraryIdeas([...candidates, preferred], state, foods).some(
      (r) => r.id === "banana",
    ),
  ).toBe(false);
});
it("retains both kinds of votes in the account payload, replaces repeat votes, and reads older saves", () => {
  const r = features(recipe("test", ["Творог"]));
  const state = rateRecipe(
    rateRecipe(stocked(), r, "like", now),
    r,
    "dislike",
    now,
  );
  expect(
    parseAccountState(JSON.parse(JSON.stringify(state))).recipeFeedback,
  ).toEqual(state.recipeFeedback);
  expect(state.recipeFeedback).toHaveLength(1);
  expect(parseAccountState(emptyState()).recipeFeedback).toBeUndefined();
  expect(
    personalLibraryIdeas([recipe("test", ["Творог"])], state, foods),
  ).toEqual([]);
});
it("rejects malformed or duplicate ratings instead of silently discarding them", () => {
  const state = rateRecipe(
    stocked(),
    features(recipe("test", ["Творог"])),
    "like",
    now,
  );
  expect(() =>
    parseAccountState({
      ...state,
      recipeFeedback: [...state.recipeFeedback!, ...state.recipeFeedback!],
    }),
  ).toThrow();
  expect(() =>
    parseAccountState({
      ...state,
      recipeFeedback: [{ ...state.recipeFeedback![0], rating: "unexpected" }],
    }),
  ).toThrow();
});
it("excludes rated IDs before paginating search, with accurate totals", () => {
  const input = parseLibrarySearch({ excludedRecipeIds: ["rated"], limit: 1 });
  const page = searchLibrary(
    [recipe("rated", ["Творог"]), recipe("new", ["Творог"])],
    input,
  );
  expect(page.total).toBe(1);
  expect(page.items[0].id).toBe("new");
  expect(() => parseLibrarySearch({ excludedRecipeIds: [9] })).toThrow();
});
