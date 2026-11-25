import { expect, it, vi } from "vitest";
import {
  parseReceiptLines,
  receiptGrams,
  receiptImage,
  RECEIPT_MODEL,
} from "../shared/receipt";
import { recognizeReceipt } from "../apps/backend/src/ai/receipt";
import { handleRequest } from "../apps/backend/src/router";
import { basicFoods } from "../shared/basicFoods";
import { emptyState } from "../shared/model";
import { importReceipt, receiptDrafts } from "../apps/web/src/domain/receipt";
const image =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBFkAAAAASUVORK5CYII=";
const line = {
  name: "Творог 5%",
  quantity: 2,
  unit: "pcs" as const,
  packageSize: 200,
  packageUnit: "g" as const,
};
const item = {
  ...line,
  id: "row",
  grams: 400,
  candidates: [
    {
      food: basicFoods.find((f) => f.id === "cottage")!,
      kind: "generic" as const,
    },
  ],
};
it("only accepts bounded inline raster images, never arbitrary URLs or SVG", () => {
  expect(receiptImage({ image })).toBe(image);
  for (const value of [
    "https://example.test/a.jpg",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/jpeg;base64," + "A".repeat(24),
    image + " ",
    "x".repeat(4_000_060),
  ])
    expect(() => receiptImage({ image: value })).toThrow();
});
it("converts explicit weights and packs while leaving litres and unknown pieces unresolved", () => {
  expect(receiptGrams(line)).toBe(400);
  expect(receiptGrams({ ...line, quantity: 0.65, unit: "kg" })).toBe(650);
  expect(receiptGrams({ ...line, quantity: 930, unit: "ml" })).toBeNull();
  expect(
    receiptGrams({
      ...line,
      quantity: 10,
      packageSize: null,
      packageUnit: null,
    }),
  ).toBeNull();
  expect(receiptGrams({ ...line, unit: "pcs", packageUnit: "l" })).toBeNull();
});
it("rejects malformed model quantities rather than treating unknown values as zero", () => {
  expect(parseReceiptLines({ items: [line] }).items).toEqual([line]);
  for (const changes of [
    { quantity: -1 },
    { unit: "price" },
    { name: "" },
    { packageSize: Infinity },
  ])
    expect(() =>
      parseReceiptLines({ items: [{ ...line, ...changes }] }),
    ).toThrow();
});
it("normalizes clear Russian unit abbreviations, decimal strings and omitted unknown fields", () => {
  expect(
    parseReceiptLines({
      items: [{ name: "Бананы", quantity: "0,65", unit: "кг" }],
    }).items[0],
  ).toEqual({
    name: "Бананы",
    quantity: 0.65,
    unit: "kg",
    packageSize: null,
    packageUnit: null,
  });
});
it("uses the free vision model, gets nutrition from the catalog and sanitizes provider errors", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({ items: [line], ignoredCount: 1 }),
          },
        },
      ],
    }),
  );
  const result = await recognizeReceipt(image, "private-test-key", fetcher);
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.model).toBe(RECEIPT_MODEL);
  expect(body.messages[1].content[1].image_url.url).toBe(image);
  expect(JSON.stringify(body)).not.toContain("private-test-key");
  expect(result.items).toHaveLength(1);
  expect(result.items[0].grams).toBe(400);
  expect(result.items[0].candidates.some((c) => c.food.id === "cottage")).toBe(
    true,
  );
  await expect(
    recognizeReceipt(
      image,
      "private-test-key",
      vi
        .fn()
        .mockResolvedValue(new Response("private-test-key", { status: 429 })),
    ),
  ).rejects.toThrow("перегружен");
});
it("receipt API rejects unauthenticated or oversized requests before sending an image", async () => {
  const env = {
    API_GLM: "private-test-key",
    BOT_TOKEN: "test-bot",
    ALLOWED_ORIGIN: "https://front.test",
  };
  const request = () =>
    new Request("https://api.test/api/ai/receipt", {
      method: "POST",
      headers: { Origin: "https://front.test" },
      body: JSON.stringify({ image }),
    });
  expect((await handleRequest(request(), env)).status).toBe(401);
  expect(
    (
      await handleRequest(
        new Request("https://api.test/api/ai/receipt", {
          method: "POST",
          body: JSON.stringify({ image: "https://example.test" }),
        }),
        env,
        true,
      )
    ).status,
  ).toBe(400);
});
it("imports all selected lines atomically and requires missing mass and nutrition to be resolved", () => {
  const state = emptyState();
  const rows = receiptDrafts([item], basicFoods);
  let serial = 0;
  const next = importReceipt(
    state,
    rows,
    basicFoods,
    () => `id-${++serial}`,
    "2026-11-06T12:00:00Z",
  );
  expect(next.pantry[0]).toMatchObject({
    grams: 400,
    foodId: "cottage",
    label: "Творог 5%",
  });
  expect(next.diary).toEqual([]);
  expect(state.pantry).toEqual([]);
  expect(() =>
    importReceipt(
      state,
      [...rows, { ...rows[0], id: "bad", grams: "" }],
      basicFoods,
    ),
  ).toThrow("массу");
  expect(state.pantry).toEqual([]);
  expect(() =>
    importReceipt(state, [{ ...rows[0], foodId: "custom" }], basicFoods),
  ).toThrow("КБЖУ");
});
it("requires confirmation before using a branded product with uncertain per-100 units", () => {
  const labelled = {
    ...item,
    candidates: [
      {
        food: { ...item.candidates[0].food, id: "off-test" },
        kind: "label" as const,
        needsUnitConfirmation: true,
      },
    ],
  };
  const rows = receiptDrafts([labelled], basicFoods);
  rows[0].foodId = "off-test";
  expect(() => importReceipt(emptyState(), rows, basicFoods)).toThrow("100 г");
  const next = importReceipt(
    emptyState(),
    [{ ...rows[0], unitConfirmed: true }],
    basicFoods,
  );
  expect(next.customFoods).toHaveLength(1);
});
