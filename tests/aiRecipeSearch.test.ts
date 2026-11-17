import { afterEach, expect, it, vi } from "vitest";
import { parseAiRequest, validateAiRecipes } from "../shared/aiRecipes";
import { recipeSearchPlan } from "../shared/aiRecipeSearch";
import { interpretRecipeSearch } from "../apps/backend/src/ai/search";
import { adaptationReferences } from "../apps/backend/src/catalog/recipeContext";
import { generateRecipes } from "../apps/backend/src/ai/provider";
import {
  searchLibrary,
  recipeLibrary,
} from "../apps/backend/src/catalog/library";
import { handleAiRequest } from "../apps/backend/src/ai/handler";
const input = parseAiRequest({
  preferences: "Хочу что-нибудь на завтрак с яицом, без творога",
  maxMinutes: 30,
  exclusions: "бекон",
  products: [
    { foodId: "egg", name: "Яйцо куриное", grams: 250 },
    { foodId: "cottage", name: "Творог", grams: 250 },
  ],
});
const plan = {
  query: "",
  requiredIngredients: ["яйцо"],
  excludedIngredients: ["творог"],
  category: "breakfast",
  diet: "all",
  sort: "relevance",
};
const answer = (value: unknown) =>
  Response.json({
    choices: [
      { finish_reason: "stop", message: { content: JSON.stringify(value) } },
    ],
  });
afterEach(() => vi.unstubAllGlobals());
it("calls the model to interpret wishes before retrieving real database recipes", async () => {
  const fetcher = vi.fn().mockResolvedValue(answer(plan));
  const search = await interpretRecipeSearch(input, "test-secret", fetcher);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.model).toBe("glm-4.7-flash");
  expect(body.messages[1].content).toContain(input.preferences);
  expect(search.maxMinutes).toBe(30);
  expect(search.exclusions).toBe("бекон, творог");
  const page = searchLibrary(search);
  expect(page.total).toBeGreaterThan(0);
  expect(
    page.items.every(
      (r) =>
        r.category === "breakfast" &&
        r.minutes <= 30 &&
        r.ingredients.some((i) => /яйц|яиц/iu.test(i.name)) &&
        !r.ingredients.some((i) => /творог|бекон/iu.test(i.name)),
    ),
  ).toBe(true);
  expect(
    page.items.every((r) => recipeLibrary.some((real) => real.id === r.id)),
  ).toBe(true);
});
it("retains a required stock product even if the model omits it from its search plan", () => {
  const search = recipeSearchPlan({ ...plan, requiredIngredients: [] }, input);
  expect(search.requiredIngredients).toContain("яйцо");
  expect(
    searchLibrary(search).items.every((r) =>
      r.ingredients.some((i) => /яйц|яиц/iu.test(i.name)),
    ),
  ).toBe(true);
});
it("does not cap a broad AI search at three recipes and validates model plans", () => {
  const search = recipeSearchPlan(
    {
      ...plan,
      category: "all",
      requiredIngredients: [],
      excludedIngredients: [],
    },
    { ...input, preferredFoodId: undefined, maxMinutes: 360 },
  );
  expect(searchLibrary(search).total).toBeGreaterThan(100);
  expect(searchLibrary({ ...search, offset: 12 }).items).toHaveLength(12);
  expect(() =>
    recipeSearchPlan({ ...plan, category: "invented" }, input),
  ).toThrow();
  expect(() => recipeSearchPlan({ recipes: [] }, input)).toThrow();
});
it("uses the authenticated AI endpoint for search tasks rather than silently bypassing AI", async () => {
  const fetcher = vi.fn().mockResolvedValue(answer(plan));
  vi.stubGlobal("fetch", fetcher);
  const response = await handleAiRequest(
    new Request("https://test/api/ai/recipes", {
      method: "POST",
      body: JSON.stringify({ ...input, task: "search" }),
    }),
    { API_GLM: "test-secret" },
    true,
  );
  expect(response.status).toBe(200);
  expect((await response.json()).search.requiredIngredients).toContain("яйцо");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("adapts only known source IDs, preserves real attribution and rejects invented references", async () => {
  const source = adaptationReferences(input)[0];
  expect(source).toBeDefined();
  const variant = {
    referenceRecipeId: source.id,
    name: "Завтрак с яйцом",
    minutes: 10,
    servings: 1,
    equipment: "Сковорода",
    ingredients: [{ foodId: "egg", grams: 100 }],
    steps: ["Приготовь яйца до готовности."],
    origin: {
      label: "fake",
      url: "https://fake.test",
      license: "fake",
      licenseUrl: "https://fake.test",
    },
  };
  const fetcher = vi.fn().mockResolvedValue(answer({ recipes: [variant] }));
  const recipes = await generateRecipes(input, "test-secret", fetcher);
  expect(recipes[0].origin).toEqual(source.origin);
  const known = JSON.parse(
    JSON.parse(fetcher.mock.calls[0][1].body).messages[1].content,
  ).knownRecipes;
  expect(
    known.every((r: { id: string }) =>
      recipeLibrary.some((real) => real.id === r.id),
    ),
  ).toBe(true);
  await expect(
    generateRecipes(
      input,
      "test-secret",
      vi
        .fn()
        .mockImplementation(async () =>
          answer({ recipes: [{ ...variant, referenceRecipeId: "invented" }] }),
        ),
    ),
  ).rejects.toMatchObject({ code: "invalid_recipe" });
});
it("checks every required ingredient in adapted recipes, not only the first one", () => {
  const request = { ...input, requiredIngredients: ["яйцо", "творог"] };
  expect(() =>
    validateAiRecipes(
      {
        recipes: [
          {
            name: "Яичница",
            equipment: "Сковорода",
            minutes: 10,
            servings: 1,
            ingredients: [{ foodId: "egg", grams: 100 }],
            steps: ["Приготовь."],
          },
        ],
      },
      request,
    ),
  ).toThrow();
});

it("uses another free model for search when the primary is overloaded, with the same constraints", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ error: { code: "1305" } }, { status: 429 }),
    )
    .mockResolvedValueOnce(answer(plan));
  const search = await interpretRecipeSearch(input, "test-secret", fetcher);
  expect(fetcher).toHaveBeenCalledTimes(2);
  const bodies = fetcher.mock.calls.map((call) => JSON.parse(call[1].body));
  expect(bodies.map((b) => b.model)).toEqual([
    "glm-4.7-flash",
    "glm-4.5-flash",
  ]);
  expect(bodies[1].messages).toEqual(bodies[0].messages);
  const results = searchLibrary(search);
  expect(results.total).toBeGreaterThan(0);
  expect(
    results.items.every(
      (r) =>
        r.ingredients.some((i) => /яйц|яиц/iu.test(i.name)) &&
        !r.ingredients.some((i) => /творог|бекон/iu.test(i.name)),
    ),
  ).toBe(true);
});
it("does not switch models on key access or account quota failures", async () => {
  for (const code of ["1113", "1310"]) {
    const fetcher = vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ error: { code } }, { status: 429 }),
      );
    await expect(
      interpretRecipeSearch(input, "test-secret", fetcher),
    ).rejects.toMatchObject({
      code: code === "1113" ? "provider_access" : "provider_quota",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
});
it("rejects an invalid fallback plan and preserves the error if both models fail", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({ error: { code: "1305" } }, { status: 429 }),
    );
  await expect(
    interpretRecipeSearch(input, "test-secret", fetcher),
  ).rejects.toMatchObject({ code: "provider_overloaded" });
  expect(fetcher).toHaveBeenCalledTimes(2);
  const invalid = vi
    .fn()
    .mockImplementation(async () => answer({ ...plan, category: "made-up" }));
  await expect(
    interpretRecipeSearch(input, "test-secret", invalid),
  ).rejects.toMatchObject({ code: "invalid_search" });
  expect(invalid).toHaveBeenCalledTimes(2);
});
it("does not start a fallback after the user cancels", async () => {
  const controller = new AbortController();
  const fetcher = vi.fn().mockImplementation(async (_url, init) => {
    controller.abort();
    throw init.signal.reason;
  });
  await expect(
    interpretRecipeSearch(input, "test-secret", fetcher, controller.signal),
  ).rejects.toMatchObject({ code: "request_timeout" });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("moves to the free fallback after the primary deadline instead of hanging", async () => {
  vi.useFakeTimers();
  const deadline = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException("Timed out", "TimeoutError")),
      ms,
    );
    return controller.signal;
  });
  try {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener(
              "abort",
              () => reject(init.signal.reason),
              { once: true },
            ),
          ),
      )
      .mockResolvedValueOnce(answer(plan));
    const pending = interpretRecipeSearch(input, "test-secret", fetcher);
    await vi.advanceTimersByTimeAsync(25000);
    const search = await pending;
    expect(search.requiredIngredients).toContain("яйцо");
    expect(fetcher).toHaveBeenCalledTimes(2);
  } finally {
    deadline.mockRestore();
    vi.useRealTimers();
  }
});
