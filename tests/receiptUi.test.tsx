// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { basicFoods } from "../shared/basicFoods";
import { prepareReceiptImage } from "../apps/web/src/api/receipt";
vi.mock("../apps/web/src/api/receipt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../apps/web/src/api/receipt")>()),
  prepareReceiptImage: vi
    .fn()
    .mockResolvedValue(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
    ),
}));
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.mocked(prepareReceiptImage).mockResolvedValue(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
  );
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function upload() {
  fireEvent.click(screen.getByRole("button", { name: "Полка", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить продукт", exact: true }),
  );
  fireEvent.click(screen.getByRole("button", { name: /По чеку/ }));
  fireEvent.change(screen.getByLabelText("Выбрать фото"), {
    target: {
      files: [new File(["fixture"], "receipt.png", { type: "image/png" })],
    },
  });
  await screen.findByRole("img", { name: "Выбранное фото чека" });
  fireEvent.click(screen.getByRole("button", { name: "Распознать продукты" }));
}
it("requires review and missing mass, and keeps the review intact after a storage failure", async () => {
  const food = basicFoods.find((f) => f.id === "egg")!;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        items: [
          {
            id: "one",
            name: "Яйцо куриное",
            quantity: 10,
            unit: "pcs",
            packageSize: null,
            packageUnit: null,
            grams: null,
            candidates: [{ food, kind: "generic" }],
          },
        ],
        ignoredCount: 1,
      }),
    ),
  );
  render(<App />);
  const before = localStorage.getItem("polka:v1:browser");
  await upload();
  await screen.findByRole("heading", { name: "Проверим продукты" });
  expect(localStorage.getItem("polka:v1:browser")).toBe(before);
  fireEvent.click(screen.getByRole("button", { name: /Добавить на полку/ }));
  expect(screen.getByRole("alert").textContent).toContain("массу");
  expect(localStorage.getItem("polka:v1:browser")).toBe(before);
  fireEvent.change(screen.getByLabelText("Масса, г"), {
    target: { value: "500" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Назад" }));
  await screen.findByRole("img", { name: "Выбранное фото чека" });
  fireEvent.click(screen.getByRole("button", { name: "Вернуться к списку" }));
  expect((screen.getByLabelText("Масса, г") as HTMLInputElement).value).toBe(
    "500",
  );
  fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Продолжить со списком" }),
  );
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("storage full");
  });
  fireEvent.click(screen.getByRole("button", { name: /Добавить на полку/ }));
  expect(
    screen.getByRole("dialog", { name: "Проверим продукты" }),
  ).toBeTruthy();
  expect((screen.getByLabelText("Масса, г") as HTMLInputElement).value).toBe(
    "500",
  );
  expect(localStorage.getItem("polka:v1:browser")).toBe(before);
  fireEvent.click(screen.getByRole("button", { name: /Добавить на полку/ }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const after = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(after.pantry.length).toBe(JSON.parse(before!).pantry.length + 1);
  expect(after.pantry.at(-1).grams).toBe(500);
  expect(after.diary).toEqual(JSON.parse(before!).diary);
});
it("provider overload leaves the photo and pantry unchanged for retry", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: "Распознавание сейчас перегружено." },
          { status: 429 },
        ),
      ),
  );
  render(<App />);
  const before = localStorage.getItem("polka:v1:browser");
  await upload();
  expect((await screen.findByRole("alert")).textContent).toContain(
    "перегружено",
  );
  expect(screen.getByRole("img", { name: "Выбранное фото чека" })).toBeTruthy();
  expect(localStorage.getItem("polka:v1:browser")).toBe(before);
});
it("profile editing offers optional weight and preserves existing weight history", () => {
  render(<App />);
  const before = JSON.parse(localStorage.getItem("polka:v1:browser")!).profile;
  fireEvent.click(screen.getByRole("button", { name: "Профиль", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Изменить", exact: true }),
  );
  expect(screen.getByLabelText(/Текущий вес/i)).toBeTruthy();
  expect(screen.queryByLabelText(/Желаемый вес/i)).toBeNull();
  fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Аня" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));
  const after = JSON.parse(localStorage.getItem("polka:v1:browser")!).profile;
  expect(after.weightKg).toBe(before.weightKg);
  expect(after.targetWeightKg).toBe(before.targetWeightKg);
  expect(after.weightHistory).toEqual(before.weightHistory);
});

it("autofills generic produce and an exact branded product without manual nutrition inputs", async () => {
  const branded = {
    id: "label-kefir",
    name: "Кефир Марка 3%",
    emoji: "",
    per100: { kcal: 60, protein: 3, fat: 3, carbs: 4 },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        items: [
          {
            id: "apple",
            name: "Яблоки красные",
            quantity: 1,
            unit: "kg",
            packageSize: null,
            packageUnit: null,
            grams: 1000,
            candidates: [],
          },
          {
            id: "kefir",
            name: "Кефир Марка 3%",
            quantity: 1,
            unit: "pcs",
            packageSize: 500,
            packageUnit: "g",
            grams: 500,
            candidates: [
              {
                food: branded,
                kind: "label",
                confidence: "exact",
                needsUnitConfirmation: false,
              },
            ],
          },
        ],
        ignoredCount: 0,
      }),
    ),
  );
  render(<App />);
  const before = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  await upload();
  await screen.findByRole("heading", { name: "Проверим продукты" });
  expect(screen.queryByLabelText("Ккал на 100 г")).toBeNull();
  expect(screen.getByText(/Яблоки, свежие · .*ккал/)).toBeTruthy();
  expect(screen.getByText(/Кефир Марка 3% · 60 ккал/)).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить на полку · 2" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const saved = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(saved.pantry).toHaveLength(before.pantry.length + 2);
  expect(saved.pantry.at(-2).foodId).toBe("apple");
  expect(saved.pantry.at(-1).foodId).toBe(branded.id);
  expect(
    saved.customFoods.find((f: { id: string }) => f.id === branded.id).per100,
  ).toEqual(branded.per100);
  expect(saved.diary).toEqual(before.diary);
});
it("asks to choose an ambiguous label instead of asking to type four nutrition numbers", async () => {
  const candidate = (id: string, kcal: number) => ({
    food: {
      id,
      name: `Кефир ${id}`,
      emoji: "",
      per100: { kcal, protein: 3, fat: 3, carbs: 4 },
    },
    kind: "label",
    confidence: "suggestion",
    needsUnitConfirmation: false,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        items: [
          {
            id: "one",
            name: "Кефир 3%",
            quantity: 1,
            unit: "kg",
            packageSize: null,
            packageUnit: null,
            grams: 1000,
            candidates: [candidate("МаркаА", 60), candidate("МаркаБ", 62)],
          },
        ],
        ignoredCount: 0,
      }),
    ),
  );
  render(<App />);
  await upload();
  await screen.findByRole("heading", { name: "Проверим продукты" });
  expect(screen.queryByLabelText("Ккал на 100 г")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Кефир МаркаА/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить на полку · 1" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).pantry.at(-1).foodId,
  ).toBe("МаркаА");
});
it("uses manual nutrition only for an unmatched product and remembers it for the next receipt", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () =>
      Response.json({
        items: [
          {
            id: "one",
            name: "Хумус ОсобаяМарка",
            quantity: 1,
            unit: "pcs",
            packageSize: 200,
            packageUnit: "g",
            grams: 200,
            candidates: [],
          },
        ],
        ignoredCount: 0,
      }),
    ),
  );
  render(<App />);
  await upload();
  await screen.findByRole("heading", { name: "Проверим продукты" });
  expect(screen.getByText("Совпадения не найдены.")).toBeTruthy();
  expect(screen.queryByLabelText("Ккал на 100 г")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Нет подходящего — ввести с упаковки" }),
  );
  for (const [label, value] of [
    ["Ккал на 100 г", "180"],
    ["Белки, г на 100 г", "6"],
    ["Жиры, г на 100 г", "10"],
    ["Углеводы, г на 100 г", "16"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить на полку · 1" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const savedId = JSON.parse(
    localStorage.getItem("polka:v1:browser")!,
  ).customFoods.at(-1).id;
  await upload();
  await screen.findByRole("heading", { name: "Проверим продукты" });
  expect(screen.queryByLabelText("Ккал на 100 г")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить на полку · 1" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).pantry.at(-1).foodId,
  ).toBe(savedId);
});

it("keeps edits to other rows while a nutrition lookup is in flight", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (path: string | URL) =>
      String(path).includes("nutrition-match")
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : Response.json({
            items: [
              {
                id: "one",
                name: "Продукт Орбита",
                quantity: 200,
                unit: "g",
                packageSize: null,
                packageUnit: null,
                grams: 200,
                candidates: [],
              },
              {
                id: "two",
                name: "Яблоки",
                quantity: 200,
                unit: "g",
                packageSize: null,
                packageUnit: null,
                grams: 200,
                candidates: [],
              },
            ],
            ignoredCount: 0,
          }),
    ),
  );
  render(<App />);
  await upload();
  await screen.findByRole("heading", { name: "Проверим продукты" });
  fireEvent.change(screen.getByLabelText("Найти КБЖУ: Продукт Орбита"), {
    target: { value: "Яблоки" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Искать в базе: Продукт Орбита" }),
  );
  fireEvent.change(screen.getAllByLabelText("Масса, г")[1], {
    target: { value: "350" },
  });
  await act(async () =>
    finish(
      Response.json({
        candidates: [
          {
            food: basicFoods.find((f) => f.id === "apple"),
            kind: "generic",
            confidence: "generic",
          },
        ],
      }),
    ),
  );
  await waitFor(() =>
    expect(
      (screen.getAllByLabelText("Масса, г")[1] as HTMLInputElement).value,
    ).toBe("350"),
  );
  expect(
    (screen.getAllByLabelText("Масса, г")[0] as HTMLInputElement).value,
  ).toBe("200");
});
