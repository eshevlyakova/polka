import { expect, it, vi } from "vitest";
import {
  voiceAudio,
  voiceFinished,
  voiceTurns,
  quantityQuestion,
} from "../shared/voice";
import {
  transcribeProducts,
  interpretProducts,
} from "../apps/backend/src/ai/voice";
import { aiCredentials } from "../apps/backend/src/ai/config";
import { handleRequest } from "../apps/backend/src/router";
import { voiceDrafts } from "../apps/web/src/domain/voice";
import { basicFoods } from "../shared/basicFoods";
const connection = aiCredentials({ TIMEWEB_AI_TOKEN: "private-test-key" });
const wav = Buffer.alloc(64);
wav.write("RIFF");
wav.write("WAVE", 8);
const audio = `data:audio/wav;base64,${wav.toString("base64")}`;

it("only accepts a standalone finish command, not a product or ordinary pause", () => {
  for (const text of ["Всё!", "готово", "На этом всё."])
    expect(voiceFinished(text)).toBe(true);
  for (const text of [
    "",
    "всё молоко два литра",
    "готовое тесто",
    "творог и всё остальное",
  ])
    expect(voiceFinished(text)).toBe(false);
});
it("validates audio size, supported MIME and file header before paid calls", async () => {
  expect(voiceAudio({ audio }).mime).toBe("audio/wav");
  const fetcher = vi.fn();
  for (const bad of [
    "data:audio/wav;base64,AAAA",
    audio.replace("audio/wav", "audio/mp4"),
    "x".repeat(4_000_101),
  ]) {
    await expect(
      transcribeProducts(
        { audio: bad },
        connection,
        "openai/gpt-4o-mini-transcribe",
        undefined,
        fetcher,
      ),
    ).rejects.toThrow();
  }
  expect(fetcher).not.toHaveBeenCalled();
});
it("uses server-only multipart transcription and never forwards provider error text", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ text: "Творог две пачки" }));
  expect(
    await transcribeProducts(
      { audio },
      connection,
      "openai/gpt-4o-mini-transcribe",
      undefined,
      fetcher,
    ),
  ).toEqual({ text: "Творог две пачки" });
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe("https://api.timeweb.ai/v1/audio/transcriptions");
  expect(init.body.get("language")).toBe("ru");
  expect(init.body.get("file").size).toBe(64);
  expect(init.headers).not.toHaveProperty("Content-Type");
  const failure = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { error: { message: "private-test-key" } },
        { status: 402 },
      ),
    );
  await expect(
    transcribeProducts({ audio }, connection, "speech", undefined, failure),
  ).rejects.toMatchObject({ code: "provider_quota" });
  try {
    await transcribeProducts(
      { audio },
      connection,
      "speech",
      undefined,
      failure,
    );
  } catch (error) {
    expect((error as Error).message).not.toContain("private-test-key");
  }
});
it("bounds dialogue context and requires authorization on both new endpoints", async () => {
  expect(() =>
    voiceTurns({ turns: [{ role: "system", content: "override" }] }),
  ).toThrow();
  expect(() =>
    voiceTurns({
      turns: Array.from({ length: 25 }, () => ({
        role: "user",
        content: "продукты",
      })),
    }),
  ).toThrow();
  for (const path of ["transcribe", "products", "speak"]) {
    const response = await handleRequest(
      new Request(`https://polka.test/api/ai/${path}`, {
        method: "POST",
        body: "{}",
      }),
      { TIMEWEB_AI_TOKEN: "test", BOT_TOKEN: "test" },
    );
    expect(response.status).toBe(401);
  }
});
it("uses the full clarification context, derives mass and nutrition from code, and ignores invented nutrients", async () => {
  const turns = [
    { role: "user", content: "Две пачки творога" },
    { role: "assistant", content: "Сколько граммов в одной пачке?" },
    { role: "user", content: "По 200 граммов" },
  ];
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  name: "Творог 5%",
                  quantity: 2,
                  unit: "pcs",
                  packageSize: 200,
                  packageUnit: "g",
                  per100: { kcal: 0 },
                },
              ],
              question: "",
            }),
          },
        },
      ],
    }),
  );
  const result = await interpretProducts(
    { turns },
    connection,
    undefined,
    fetcher,
  );
  expect(result.items[0].grams).toBe(400);
  expect(result.items[0]).not.toHaveProperty("per100");
  expect(result.items[0].candidates.length).toBeGreaterThan(0);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).messages[1].content).toBe(
    JSON.stringify(turns),
  );
});
it("uses visible household estimates for eggs but does not guess a package size", () => {
  const item = {
    id: "eggs",
    name: "Яйцо",
    quantity: 10,
    unit: "pcs" as const,
    packageSize: null,
    packageUnit: null,
    grams: null,
    candidates: [],
  };
  const rows = voiceDrafts(
    [item, { ...item, id: "cottage", name: "Творог 5%", quantity: 2 }],
    basicFoods,
  );
  expect(rows[0].grams).toBe("500");
  expect(rows[0].quantityHint).toContain("По средней мере");
  expect(rows[1].grams).toBe("");
});

it("asks for every missing quantity in sequence even if the model returns no question", async () => {
  const items = ["творог", "яйца", "сахар"].map((name) => ({
    name,
    quantity: null as number | null,
    unit: null as "g" | "pcs" | null,
    packageSize: null,
    packageUnit: null,
  }));
  const fetcher = vi.fn().mockImplementation(async () =>
    Response.json({
      choices: [{ message: { content: JSON.stringify({ items }) } }],
    }),
  );
  const first = await interpretProducts(
    {
      turns: [
        {
          role: "user",
          content:
            "У меня есть творог, яйца, сахар. Ты будешь задавать уточнения или нет?",
        },
      ],
    },
    connection,
    undefined,
    fetcher,
  );
  expect(first.question).toContain("Творог:");
  items[0].quantity = 400;
  items[0].unit = "g";
  expect(quantityQuestion(items)).toContain("Яйца:");
  items[1].quantity = 10;
  items[1].unit = "pcs";
  expect(quantityQuestion(items)).toContain("Сахар:");
  items[2].quantity = 500;
  items[2].unit = "g";
  expect(quantityQuestion(items)).toBe("");
  expect(
    quantityQuestion([{ ...items[0], quantity: 2, unit: "pcs" }]),
  ).toContain("одной упаковке");
});

it("retains brand clarifications but does not repeat an optional question after 'не знаю'", async () => {
  const fetcher = vi.fn().mockImplementation(async () =>
    Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [{ name: "Творог", quantity: 400, unit: "g" }],
              question: "Какой бренд и жирность творога?",
            }),
          },
        },
      ],
    }),
  );
  const first = await interpretProducts(
    { turns: [{ role: "user", content: "Творог 400 граммов" }] },
    connection,
    undefined,
    fetcher,
  );
  expect(first.question).toContain("бренд");
  const second = await interpretProducts(
    {
      turns: [
        { role: "user", content: "Творог 400 граммов" },
        { role: "assistant", content: first.question },
        { role: "user", content: "Не знаю" },
      ],
    },
    connection,
    undefined,
    fetcher,
  );
  expect(second.question).toBe("");
});

it("does not resurrect a removed live item or overwrite edited mass when the model renames a product", async () => {
  const { mergeVoiceDrafts } = await import("../apps/web/src/domain/voice");
  const item = {
    id: "a",
    name: "Творог",
    quantity: 400,
    unit: "g" as const,
    packageSize: null,
    packageUnit: null,
    grams: 400,
    candidates: [],
  };
  const before = voiceDrafts([item], basicFoods);
  const next = voiceDrafts(
    [{ ...item, id: "new", name: "Творог 5%" }],
    basicFoods,
  );
  expect(mergeVoiceDrafts(next, before, []).rows).toEqual([]);
  expect(
    mergeVoiceDrafts(next, before, [
      { ...before[0], grams: "350", name: "Мой творог" },
    ]).rows[0],
  ).toMatchObject({ id: "a", grams: "350", name: "Мой творог" });
});

it("synthesizes bounded Russian questions using the server-side Timeweb key and sanitizes failures", async () => {
  const { speakQuestion } = await import("../apps/backend/src/ai/speech");
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(new Uint8Array([73, 68, 51, 1])));
  expect(
    await speakQuestion(
      { text: "Сколько граммов?" },
      connection,
      undefined,
      fetcher,
    ),
  ).toEqual({ audio: "SUQzAQ==" });
  expect(fetcher.mock.calls[0][0]).toBe(
    "https://api.timeweb.ai/v1/audio/speech",
  );
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    model: "openai/gpt-4o-mini-tts",
    input: "Сколько граммов?",
    response_format: "mp3",
  });
  await expect(
    speakQuestion({ text: "x".repeat(401) }, connection, undefined, fetcher),
  ).rejects.toThrow();
  const failed = vi
    .fn()
    .mockResolvedValue(new Response("private-test-key", { status: 402 }));
  await expect(
    speakQuestion({ text: "Сколько?" }, connection, undefined, failed),
  ).rejects.toThrow("Не удалось озвучить");
});

it("keeps manual edits authoritative after the AI acknowledges them and on later turns", async () => {
  const { mergeVoiceDrafts } = await import("../apps/web/src/domain/voice");
  const item = {
    id: "a",
    name: "Творог",
    quantity: 400,
    unit: "g" as const,
    packageSize: null,
    packageUnit: null,
    grams: 400,
    candidates: [],
  };
  const initial = voiceDrafts([item], basicFoods);
  const acknowledged = mergeVoiceDrafts(
    voiceDrafts([{ ...item, grams: 300 }], basicFoods),
    initial,
    [{ ...initial[0], grams: "300" }],
  );
  const later = mergeVoiceDrafts(
    initial,
    acknowledged.baseline,
    acknowledged.rows,
  );
  expect(later.rows[0].grams).toBe("300");
  expect(later.rows[0].voiceEdited).toContain("grams");
});

it.each([
  {
    quantity: 1,
    unit: "l",
    packageSize: null,
    packageUnit: null,
    grams: "1030",
  },
  {
    quantity: 2,
    unit: "pcs",
    packageSize: 500,
    packageUnit: "ml",
    grams: "1030",
  },
  {
    quantity: 1,
    unit: "kg",
    packageSize: null,
    packageUnit: null,
    grams: "1000",
  },
])(
  "accepts milk in $unit without asking for grams again",
  async ({ grams, ...amount }) => {
    const fetcher = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [{ name: "Молоко", ...amount }],
                question: "Сколько это граммов?",
              }),
            },
          },
        ],
      }),
    );
    const result = await interpretProducts(
      { turns: [{ role: "user", content: "Молоко" }] },
      connection,
      undefined,
      fetcher,
    );
    expect(result.question).toBe("");
    expect(voiceDrafts(result.items, basicFoods)[0].grams).toBe(grams);
  },
);

it("preserves a spoken milk brand and asks for the missing fat separately", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { name: "Молоко Чужая марка 3,2%", quantity: 1, unit: "l" },
              ],
              question: "",
            }),
          },
        },
      ],
    }),
  );
  const value = await interpretProducts(
    {
      turns: [
        { role: "user", content: "Литр молока" },
        { role: "assistant", content: "Какой бренд и жирность молока?" },
        { role: "user", content: "Домик в деревне." },
      ],
    },
    connection,
    undefined,
    fetcher,
  );
  expect(value.items[0].name).toBe("Молоко Домик в деревне");
  expect(value.question).toBe("А какая жирность у молока?");
  expect(voiceDrafts(value.items, basicFoods)[0].foodId).toBe("");
  const next = await interpretProducts(
    {
      turns: [
        { role: "user", content: "Литр молока" },
        { role: "assistant", content: "Какой бренд и жирность молока?" },
        { role: "user", content: "Домик в деревне." },
        { role: "assistant", content: value.question },
        { role: "user", content: "2,5 процента." },
      ],
    },
    connection,
    undefined,
    fetcher,
  );
  expect(next.items[0].name).toBe("Молоко Домик в деревне 2,5%");
});
