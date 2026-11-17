import { it, expect, vi } from "vitest";
import {
  recipeLibrary,
  searchLibrary,
  parseLibrarySearch,
} from "../apps/backend/src/catalog/library";
import { handleRequest } from "../apps/backend/src/router";
import { generateRecipes } from "../apps/backend/src/ai/provider";
import { parseAiRequest } from "../shared/aiRecipes";
it("imports 501 distinct Russian recipes with original quantities and attribution", () => {
  expect(recipeLibrary).toHaveLength(501);
  expect(new Set(recipeLibrary.map((r) => r.id)).size).toBe(501);
  for (const r of recipeLibrary) {
    expect(r.name).toMatch(/[а-яё]/i);
    expect(r.ingredients.length).toBeGreaterThan(0);
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.origin.license).toBe("CC BY-SA 4.0");
    expect(
      Object.values(r.perServing).every((n) => Number.isFinite(n) && n >= 0),
    ).toBe(true);
  }
});
it("paginates every matching record without a three/six-result cap or duplicates", () => {
  const input = parseLibrarySearch({ query: "", limit: 24, sort: "quick" });
  const ids: string[] = [];
  for (let offset = 0; offset < 501; offset += 24) {
    const page = searchLibrary({ ...input, offset });
    expect(page.total).toBe(501);
    expect(page.items.length).toBeLessThanOrEqual(24);
    ids.push(...page.items.map((r) => r.id));
  }
  expect(ids).toHaveLength(501);
  expect(new Set(ids).size).toBe(501);
  expect(searchLibrary({ ...input, offset: 504 }).items).toEqual([]);
});
it("matches cottage breakfast wishes, time, categories, exclusions and sorting", () => {
  const cottage = searchLibrary(
    parseLibrarySearch({ query: "Хочу завтрак из творога", maxMinutes: 60 }),
  );
  expect(cottage.total).toBeGreaterThan(0);
  expect(
    cottage.items.every(
      (r) =>
        r.category === "breakfast" &&
        r.minutes <= 60 &&
        r.ingredients.some((i) => i.name.toLowerCase().includes("творог")),
    ),
  ).toBe(true);
  const mains = searchLibrary(
    parseLibrarySearch({ category: "main", maxMinutes: 0 }),
  );
  expect(mains.total).toBeGreaterThan(100);
  const vegan = searchLibrary(
    parseLibrarySearch({ query: "Веганский ужин без риса", maxMinutes: 120 }),
  );
  expect(vegan.total).toBeGreaterThan(0);
  expect(
    vegan.items.every(
      (r) =>
        r.diets.includes("vegan") &&
        !r.ingredients.some((i) => /рис(?:\s|$)/i.test(i.name)),
    ),
  ).toBe(true);
  const quick = searchLibrary(parseLibrarySearch({ sort: "quick" }));
  expect(
    quick.items.every(
      (r, i) => i === 0 || r.minutes >= quick.items[i - 1].minutes,
    ),
  ).toBe(true);
  for (const patch of [
    { limit: 999 },
    { offset: -1 },
    { products: [{ name: "x", grams: -1 }] },
    { query: "x".repeat(601) },
  ])
    expect(() => parseLibrarySearch(patch)).toThrow();
});
it("serves public paginated search and Russian details without an AI key", async () => {
  const response = await handleRequest(
    new Request("https://api.test/api/library/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "main", limit: 12 }),
    }),
    {},
  );
  expect(response.status).toBe(200);
  const page = await response.json();
  expect(page.total).toBeGreaterThan(100);
  expect(page.items).toHaveLength(12);
  expect(page.items[0]).not.toHaveProperty("steps");
  const detail = await (
    await handleRequest(
      new Request(`https://api.test/api/library/recipes/${page.items[0].id}`),
      {},
    )
  ).json();
  expect(detail.steps.length).toBeGreaterThan(0);
  expect(
    (
      await handleRequest(
        new Request("https://api.test/api/library/recipes/missing"),
        {},
      )
    ).status,
  ).toBe(404);
});
it("grounds adaptation in the selected catalog recipe and preserves its licence", async () => {
  const source = recipeLibrary.find((r) => r.name === "Сырники")!;
  const request = parseAiRequest({
    referenceRecipeId: source.id,
    preferences: "Адаптируй блюдо",
    maxMinutes: 30,
    exclusions: "",
    products: [
      { foodId: "cottage", name: "Творог", grams: 400 },
      { foodId: "egg", name: "Яйцо", grams: 200 },
    ],
  });
  const fetcher = vi.fn().mockImplementation(async () =>
    Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              recipes: [
                {
                  name: "Творожные оладьи",
                  minutes: 20,
                  servings: 2,
                  equipment: "Сковорода",
                  ingredients: [
                    { foodId: "cottage", grams: 200 },
                    { foodId: "egg", grams: 100 },
                  ],
                  steps: ["Перемешай и приготовь до готовности."],
                },
              ],
            }),
          },
        },
      ],
    }),
  );
  const adapted = await generateRecipes(request, "test-secret", fetcher);
  expect(adapted[0].origin).toEqual(source.origin);
  expect(
    JSON.parse(fetcher.mock.calls[0][1].body).messages[1].content,
  ).toContain(source.id);
});

it.each(["Завтрак с яйцом", "Завтрак с яицом", "Завтрак из яиц"])(
  "finds egg breakfasts for %s without unrelated smoothies",
  (query) => {
    const page = searchLibrary(
      parseLibrarySearch({ query, maxMinutes: 60, limit: 24 }),
    );
    expect(page.total).toBeGreaterThan(0);
    expect(
      page.items.every((r) =>
        r.ingredients.some((i) => /яйц|яиц/iu.test(i.name)),
      ),
    ).toBe(true);
  },
);
