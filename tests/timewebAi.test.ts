import { afterEach, expect, it, vi } from "vitest";
import { aiCredentials } from "../apps/backend/src/ai/config";
import { completion, providerError } from "../apps/backend/src/ai/client";
import { handleAiRequest } from "../apps/backend/src/ai/handler";
import { recognizeReceipt } from "../apps/backend/src/ai/receipt";

afterEach(() => vi.unstubAllGlobals());
const connection = aiCredentials({
  TIMEWEB_AI_TOKEN: "timeweb-test-secret",
  API_GLM: "legacy-secret",
});
const answer = (value: unknown) =>
  Response.json({
    choices: [
      { finish_reason: "stop", message: { content: JSON.stringify(value) } },
    ],
  });

it("uses Timeweb for authenticated search when both keys exist and preserves catalogue constraints", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      answer({
        query: "",
        requiredIngredients: ["яйцо"],
        excludedIngredients: [],
        category: "breakfast",
        diet: "all",
        sort: "relevance",
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const response = await handleAiRequest(
    new Request("https://polka.test/api/ai/recipes", {
      method: "POST",
      body: JSON.stringify({
        task: "search",
        preferences: "Хочу завтрак с яйцом",
        exclusions: "",
        maxMinutes: 30,
        products: [{ foodId: "egg", name: "Яйцо", grams: 200 }],
      }),
    }),
    { TIMEWEB_AI_TOKEN: "timeweb-test-secret", API_GLM: "legacy-secret" },
    true,
  );
  expect(response.status).toBe(200);
  expect((await response.json()).search.requiredIngredients).toContain("яйцо");
  expect(fetcher.mock.calls[0][0]).toBe(
    "https://api.timeweb.ai/v1/chat/completions",
  );
  const init = fetcher.mock.calls[0][1];
  expect(init.headers.Authorization).toBe("Bearer timeweb-test-secret");
  expect(JSON.parse(init.body).model).toBe("deepseek/deepseek-flash");
  expect(JSON.parse(init.body).thinking).toEqual({ type: "disabled" });
});

it("routes receipt images to Gemini and still calculates mass and nutrition matches in code", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      answer({
        items: [
          {
            name: "Творог 5%",
            quantity: 2,
            unit: "pcs",
            packageSize: 200,
            packageUnit: "g",
          },
        ],
        ignoredCount: 0,
      }),
    );
  const result = await recognizeReceipt(
    "data:image/png;base64,test",
    connection,
    fetcher,
  );
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.model).toBe("gemini/gemini-3.8-flash");
  expect(body).not.toHaveProperty("thinking");
  expect(body.messages[1].content[1].image_url.url).toBe(
    "data:image/png;base64,test",
  );
  expect(result.items[0].grams).toBe(400);
  expect(result.items[0].candidates.length).toBeGreaterThan(0);
});

it("never falls back to Z.ai or leaks provider details when Timeweb denies access or balance", async () => {
  for (const [status, code] of [
    [401, "provider_access"],
    [402, "provider_quota"],
  ] as const) {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          {
            error: { message: "private-provider-details timeweb-test-secret" },
          },
          { status },
        ),
      );
    await expect(
      completion({}, connection, false, fetcher),
    ).rejects.toMatchObject({ code });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const error = await providerError(
      Response.json(
        {
          error: {
            code: "insufficient_quota",
            message: "private-provider-details",
          },
        },
        { status: 429 },
      ),
      false,
      true,
    );
    expect(error.code).toBe("provider_quota");
    expect(error.retryable).toBe(false);
    expect(error.message).not.toMatch(
      /private-provider-details|timeweb-test-secret/,
    );
  }
});

it("keeps Telegram authorization required for paid models and supports explicit server model configuration", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const response = await handleAiRequest(
    new Request("https://polka.test/api/ai/recipes", {
      method: "POST",
      body: "{}",
    }),
    { TIMEWEB_AI_TOKEN: "test", BOT_TOKEN: "test" },
  );
  expect(response.status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    aiCredentials({
      TIMEWEB_AI_TOKEN: " test ",
      AI_TEXT_MODEL: "custom/text",
      AI_VISION_MODEL: "custom/vision",
    }),
  ).toMatchObject({
    key: "test",
    textModel: "custom/text",
    visionModel: "custom/vision",
  });
  expect(aiCredentials({ API_GLM: "legacy" })).toBe("legacy");
});
