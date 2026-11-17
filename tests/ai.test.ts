import { afterEach, expect, it, vi } from "vitest";
import {
  AI_MODEL,
  parseAiRequest,
  validateAiRecipes,
} from "../shared/aiRecipes";
import { generateRecipes } from "../apps/backend/src/ai/provider";
import { handleAiRequest } from "../apps/backend/src/ai/handler";
import { buildAiRequest } from "../apps/web/src/domain/aiContext";
import { adaptationReferences } from "../apps/backend/src/catalog/recipeContext";
import { foods } from "../apps/web/src/data/catalog";
import { emptyState } from "../apps/web/src/domain/model";
import { parseState } from "../apps/web/src/storage/repository";
const input = {
  preferences: "Без духовки",
  exclusions: "",
  maxMinutes: 20,
  products: [{ foodId: "egg", name: "Яйцо", grams: 200, expiresOn: "" }],
};
const recipe = {
  referenceRecipeId: adaptationReferences(parseAiRequest(input))[0].id,
  name: "Яичница",
  equipment: "Сковорода",
  minutes: 10,
  servings: 1,
  ingredients: [{ foodId: "egg", grams: 100 }],
  steps: ["Приготовь яйца до полной готовности."],
};
afterEach(() => vi.unstubAllGlobals());
it("validates inputs, removes excluded products and rejects missing preferred food", () => {
  expect(parseAiRequest(input).products).toHaveLength(1);
  expect(() =>
    parseAiRequest({ ...input, preferences: "x".repeat(601) }),
  ).toThrow();
  expect(() =>
    parseAiRequest({
      ...input,
      products: [{ ...input.products[0], grams: -1 }],
    }),
  ).toThrow();
  expect(() => parseAiRequest({ ...input, preferredFoodId: "milk" })).toThrow();
  expect(() => parseAiRequest({ ...input, exclusions: "яйцо" })).toThrow();
});
it("rejects invented ingredients, excessive amounts, duplicate ingredient excess and missing requested product", () => {
  expect(validateAiRecipes({ recipes: [recipe] }, input)[0].source).toBe("ai");
  for (const changes of [
    { ingredients: [{ foodId: "milk", grams: 10 }] },
    { ingredients: [{ foodId: "egg", grams: 201 }] },
    {
      ingredients: [
        { foodId: "egg", grams: 150 },
        { foodId: "egg", grams: 100 },
      ],
    },
    { minutes: 30 },
    { steps: [] },
    { servings: 0 },
  ])
    expect(() =>
      validateAiRecipes({ recipes: [{ ...recipe, ...changes }] }, input),
    ).toThrow();
  expect(() =>
    validateAiRecipes(
      { recipes: [recipe] },
      {
        ...input,
        products: [
          ...input.products,
          { foodId: "milk", name: "Молоко", grams: 100, expiresOn: "" },
        ],
        preferredFoodId: "milk",
      },
    ),
  ).toThrow();
});
it("uses the fixed free model with no paid fallback and validates a real-shaped completion", async () => {
  const fakeFetch = vi.fn().mockResolvedValue(
    Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify({ recipes: [recipe] }) },
        },
      ],
    }),
  );
  const result = await generateRecipes(input, "test-secret", fakeFetch);
  const [url, init] = fakeFetch.mock.calls[0];
  expect(url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
  expect(JSON.parse(init.body).model).toBe(AI_MODEL);
  expect(init.body).not.toContain("test-secret");
  expect(result[0].id).toMatch(/^ai-/);
  expect(result[0].ingredients).toEqual(recipe.ingredients);
});
it("uses AI perishability hints to rank unknown fresh foods, without promoting known dry foods", async () => {
  const request = {
    ...input,
    products: [
      { foodId: "pitaya", name: "Питахайя", grams: 100 },
      { foodId: "rice", name: "Рис сухой", grams: 100 },
    ],
  };
  const withFood = (id: string) => ({
    ...recipe,
    name: id,
    referenceRecipeId: adaptationReferences(request)[0].id,
    ingredients: [{ foodId: id, grams: 50 }],
  });
  const fakeFetch = vi.fn().mockResolvedValue(
    Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              perishableFoodIds: ["pitaya", "rice", "invented"],
              recipes: [withFood("rice"), withFood("pitaya")],
            }),
          },
        },
      ],
    }),
  );
  const result = await generateRecipes(request, "test-secret", fakeFetch);
  expect(result.map((r) => r.name)).toEqual(["pitaya", "rice"]);
});
it("handles provider overload and never exposes its raw error or key", async () => {
  const fakeFetch = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { error: { message: "raw test-secret", code: "1305" } },
        { status: 429 },
      ),
    );
  await expect(
    generateRecipes(input, "test-secret", fakeFetch),
  ).rejects.toMatchObject({ status: 429 });
  expect(fakeFetch).toHaveBeenCalledTimes(2);
});
it("requires authorization outside local development and rejects unauthorized origins before model calls", async () => {
  const mock = vi.fn();
  vi.stubGlobal("fetch", mock);
  const request = () =>
    new Request("https://example.test", {
      method: "POST",
      headers: { Origin: "https://front.test" },
      body: JSON.stringify(input),
    });
  expect(
    (
      await handleAiRequest(request(), {
        API_GLM: "test-secret",
        ALLOWED_ORIGIN: "https://front.test",
        AI_TEST_CODE: "code",
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await handleAiRequest(request(), {
        API_GLM: "test-secret",
        ALLOWED_ORIGIN: "https://different.test",
      })
    ).status,
  ).toBe(403);
  expect(mock).not.toHaveBeenCalled();
});
it("builds only necessary context, ignores legacy dates, and does not send profile or diary", () => {
  const state = emptyState();
  state.profile = { name: "Private", age: 23, weightKg: 65 };
  state.pantry = [
    { id: "1", foodId: "egg", grams: 100, expiresOn: "" },
    { id: "2", foodId: "egg", grams: 100, expiresOn: "2000-01-01" },
  ];
  const request = buildAiRequest(state, foods, "Обед");
  expect(request.products[0].grams).toBe(200);
  expect(request.products[0]).not.toHaveProperty("expiresOn");
  expect(JSON.stringify(request)).not.toContain("Private");
  expect(request).not.toHaveProperty("diary");
});
it("supports cached AI recipes in old storage and rejects corrupted cache", () => {
  expect(parseState(emptyState())).toEqual(emptyState());
  const state = {
    ...emptyState(),
    aiRecipes: [{ ...recipe, id: "ai-1", emoji: "", source: "ai" as const }],
  };
  expect(parseState(state)).toEqual(state);
  expect(() =>
    parseState({
      ...state,
      aiRecipes: [{ ...state.aiRecipes[0], ingredients: [] }],
    }),
  ).toThrow();
});

it.each(["Завтрак с яйцом", "Завтрак с яицом", "Завтрак из яиц"])(
  "requires eggs for %s and rejects an unrelated smoothie",
  (preferences) => {
    const request = parseAiRequest({
      ...input,
      preferences,
      products: [
        ...input.products,
        { foodId: "cottage", name: "Творог", grams: 300 },
      ],
    });
    expect(request.preferredFoodId).toBe("egg");
    expect(() =>
      validateAiRecipes(
        {
          recipes: [
            {
              ...recipe,
              name: "Смузи с творогом",
              ingredients: [{ foodId: "cottage", grams: 100 }],
            },
          ],
        },
        request,
      ),
    ).toThrow();
  },
);
