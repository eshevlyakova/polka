import { it, expect, vi } from "vitest";
import { generateRecipes } from "../apps/backend/src/ai/provider";
import { providerError, completion } from "../apps/backend/src/ai/client";
import { adaptationReferences } from "../apps/backend/src/catalog/recipeContext";
import { parseAiRequest } from "../shared/aiRecipes";
import { foodMeasures, kitchenAmount } from "../apps/web/src/domain/measures";
import { foods } from "../apps/web/src/data/catalog";
import { authorizedAiTask } from "../apps/backend/src/ai/handler";
const input = parseAiRequest({
  preferences: "Хочу завтрак из творога",
  exclusions: "",
  maxMinutes: 30,
  products: [
    { foodId: "cottage", name: "Творог 5%", grams: 400 },
    { foodId: "banana", name: "Банан", grams: 200 },
  ],
});
const valid = {
  referenceRecipeId: adaptationReferences(input)[0].id,
  name: "Творог с бананом",
  minutes: 5,
  servings: 1,
  equipment: "Без плиты",
  ingredients: [
    { foodId: "cottage", grams: 200 },
    { foodId: "banana", grams: 100 },
  ],
  steps: ["Нарежь банан и добавь к творогу."],
};
const answer = (recipes: unknown[]) =>
  Response.json({
    choices: [
      {
        finish_reason: "stop",
        message: { content: JSON.stringify({ recipes }) },
      },
    ],
  });
it("requires explicitly requested cottage cheese and normalizes unambiguous names and numbers", async () => {
  expect(input.preferredFoodId).toBe("cottage");
  const fetcher = vi.fn().mockResolvedValue(
    answer([
      {
        ...valid,
        ingredients: [
          { foodId: "творог", grams: "200 г" },
          { foodId: "banana", grams: "100" },
        ],
      },
    ]),
  );
  const result = await generateRecipes(input, "secret-test", fetcher);
  expect(result[0].ingredients).toEqual(valid.ingredients);
});
it("keeps valid recipes and rejects whole recipes with missing stock or missing requested food", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    answer([
      valid,
      {
        ...valid,
        name: "Плохой состав",
        ingredients: [
          { foodId: "cottage", grams: 100 },
          { foodId: "honey", grams: 10 },
        ],
      },
      {
        ...valid,
        name: "Без творога",
        ingredients: [{ foodId: "banana", grams: 100 }],
      },
    ]),
  );
  const result = await generateRecipes(input, "secret-test", fetcher);
  expect(result).toHaveLength(1);
  expect(result[0].name).toBe(valid.name);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("asks for one correction when all recipes are invalid, without adding invented ingredients", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      answer([{ ...valid, ingredients: [{ foodId: "honey", grams: 20 }] }]),
    )
    .mockResolvedValueOnce(answer([valid]));
  const result = await generateRecipes(input, "secret-test", fetcher);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(result[0].ingredients).toEqual(valid.ingredients);
  const failure = vi
    .fn()
    .mockImplementation(async () =>
      answer([{ ...valid, ingredients: [{ foodId: "honey", grams: 20 }] }]),
    );
  await expect(
    generateRecipes(input, "secret-test", failure),
  ).rejects.toMatchObject({ code: "invalid_recipe" });
  expect(failure).toHaveBeenCalledTimes(2);
});
it("distinguishes overload, account limits and key access instead of treating every 429 as overload", async () => {
  for (const [code, expected, retryable] of [
    ["1305", "provider_overloaded", true],
    ["1302", "provider_rate_limit", true],
    ["1113", "provider_access", false],
    ["1311", "provider_access", false],
    ["1310", "provider_quota", false],
  ] as const) {
    const error = await providerError(
      Response.json(
        { error: { code, message: "secret-test" } },
        { status: 429 },
      ),
      true,
    );
    expect(error.code).toBe(expected);
    expect(error.retryable).toBe(retryable);
    expect(error.message).not.toContain("secret-test");
  }
});
it("does not retry access failures and passes cancellation to the provider", async () => {
  const access = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({ error: { code: "1113" } }, { status: 429 }),
    );
  await expect(
    completion({}, "secret-test", true, access),
  ).rejects.toMatchObject({ code: "provider_access" });
  expect(access).toHaveBeenCalledTimes(1);
  const controller = new AbortController();
  const fetcher = vi
    .fn()
    .mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          ),
        ),
    );
  const running = completion(
    {},
    "secret-test",
    false,
    fetcher,
    controller.signal,
  );
  controller.abort();
  await expect(running).rejects.toMatchObject({ code: "request_timeout" });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rounds cooking measures without changing the canonical grams", () => {
  const oil = foodMeasures(foods.find((f) => f.id === "oil")).find(
    (m) => m.id === "tbsp",
  )!;
  expect(kitchenAmount(15, oil)).toBe("1 ст. л.");
  expect(kitchenAmount(21, oil)).toBe("1½ ст. л.");
  const cucumber = foodMeasures(foods.find((f) => f.id === "cucumber")).find(
    (m) => m.id === "piece",
  )!;
  expect(kitchenAmount(200, cucumber)).toBe("2 небольших");
});

it("does not infer an excluded or ambiguous product from the user's wishes", () => {
  expect(
    parseAiRequest({
      ...input,
      preferredFoodId: undefined,
      preferences: "Хочу завтрак из банана без творога",
    }).preferredFoodId,
  ).toBe("banana");
  expect(
    parseAiRequest({
      ...input,
      preferredFoodId: undefined,
      preferences: "Хочу завтрак из творога и банана",
    }).preferredFoodId,
  ).toBeUndefined();
});
it("releases the active request slot after cancellation", async () => {
  const controller = new AbortController();
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const request = (signal?: AbortSignal) =>
    new Request("https://local.test/api/ai/recipes", {
      method: "POST",
      body: "{}",
      signal,
    });
  const running = authorizedAiTask(
    request(controller.signal),
    { API_GLM: "secret-test" },
    true,
    async (_value, _key, signal) => {
      entered();
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        }),
      );
    },
  );
  await started;
  controller.abort();
  await running;
  const next = await authorizedAiTask(
    request(),
    { API_GLM: "secret-test" },
    true,
    async () => ({ ok: true }),
  );
  expect(next.status).toBe(200);
});
