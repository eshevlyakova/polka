// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { emptyState } from "../shared/model";
import { createDemoState } from "../apps/web/src/data/demo";
import { currentMeal } from "../apps/web/src/domain/meal";
import {
  estimateWeight,
  scaleIngredients,
} from "../apps/web/src/domain/cooking";
import { recipes } from "../apps/web/src/data/catalog";
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function manual() {
  fireEvent.click(screen.getByRole("button", { name: "Полка", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить продукт", exact: true }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Вручную/ }));
}
it("keeps three home ideas and routes catalog access through preference search", () => {
  render(<App />);
  expect(document.querySelectorAll(".home-recipes .recipe-card")).toHaveLength(
    3,
  );
  expect(
    screen.queryByRole("button", { name: "Открыть каталог рецептов" }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Приготовил своё блюдо" }),
  ).toBeNull();
});
it("shows names of multiple missing foods and their quantities inside the recipe", () => {
  const state = createDemoState();
  state.pantry = state.pantry
    .filter((p) => !["banana", "cottage", "oats", "yogurt"].includes(p.foodId))
    .map((p) => (p.foodId === "milk" ? { ...p, grams: 25 } : p));
  localStorage.setItem("polka:v1:browser", JSON.stringify(state));
  render(<App />);
  const card = screen.getByRole("button", { name: /Омлет с сыром/ });
  expect(card.textContent).toContain("Не хватает 2 продуктов");
  expect(card.textContent).toContain("Молоко 2,5%");
  expect(card.textContent).toContain("Сыр");
  fireEvent.click(card);
  expect(screen.getByLabelText("Не хватает продуктов").textContent).toContain(
    "25 г",
  );
  expect(screen.getByLabelText("Не хватает продуктов").textContent).toContain(
    "40 г",
  );
});
it("searches a large local catalog without rendering a thousand-item menu", () => {
  const state = emptyState();
  state.settings.onboarded = true;
  state.customFoods = Array.from({ length: 1000 }, (_, i) => ({
    id: `test-${i}`,
    name: `Тестовый продукт ${i}`,
    emoji: "",
    per100: { kcal: 100, protein: 5, fat: 5, carbs: 10 },
  }));
  localStorage.setItem("polka:v1:browser", JSON.stringify(state));
  render(<App />);
  manual();
  expect(
    document.querySelectorAll(".product-search-results button"),
  ).toHaveLength(8);
  expect(screen.queryByRole("combobox")).toBeNull();
  fireEvent.change(screen.getByLabelText("Поиск продукта"), {
    target: { value: "Тестовый продукт 999" },
  });
  expect(
    document.querySelectorAll(".product-search-results button"),
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /Тестовый продукт 999/ }));
  fireEvent.change(screen.getByLabelText("Количество, г"), {
    target: { value: "120" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить продукт" }));
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).pantry[0].foodId,
  ).toBe("test-999");
});
it("requires package confirmation for a remote match and saves food and stock atomically", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "off-test",
            name: "Творог тестовый",
            brand: "Марка",
            barcode: "4600000000000",
            basis: "100 g",
            per100: { kcal: 120, protein: 17, fat: 5, carbs: 2 },
            source: {
              url: "https://world.openfoodfacts.org/product/4600000000000",
            },
          },
        ],
      }),
    }),
  );
  render(<App />);
  manual();
  fireEvent.change(screen.getByLabelText("Поиск продукта"), {
    target: { value: "Творог тестовый" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: /Творог тестовый/ }),
  );
  fireEvent.change(screen.getByLabelText("Количество, г"), {
    target: { value: "200" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить продукт" }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).customFoods,
  ).toHaveLength(0);
  fireEvent.click(screen.getByRole("checkbox", { name: /Продукт совпадает/ }));
  fireEvent.click(screen.getByRole("button", { name: "Сохранить продукт" }));
  const saved = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(saved.customFoods[0].id).toBe("off-test");
  expect(saved.pantry.at(-1).foodId).toBe("off-test");
});
it("keeps meal and typed date visible and rejects impossible dates", () => {
  render(<App />);
  fireEvent.click(document.querySelector(".ready-meal")!);
  expect(screen.getByRole("combobox", { name: "Приём пищи" })).toBeTruthy();
  const date = screen.getByLabelText("Когда съел") as HTMLInputElement;
  expect(date.type).toBe("text");
  fireEvent.change(date, { target: { value: "31.02.2026" } });
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  expect(screen.getByRole("alert").textContent).toContain("дату");
  fireEvent.change(date, { target: { value: "06.11.2026" } });
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).diary[0].date,
  ).toBe("2026-11-06");
});
it("uses time of day for the suggested meal and estimates portion weight consistently when scaling", () => {
  expect(currentMeal(new Date(2026, 10, 7, 13))).toBe("Обед");
  expect(currentMeal(new Date(2026, 10, 7, 19))).toBe("Ужин");
  const r = recipes.find((r) => r.id === "chicken-rice")!;
  const scaled = scaleIngredients(r.ingredients, r.servings, 6);
  expect(estimateWeight(r, scaled) / 6).toBeCloseTo(estimateWeight(r) / 3);
  const omelet = recipes[0];
  expect(estimateWeight(omelet) / 2).toBe(185);
});

it("records a new branded food from the catalog outside the pantry using the actual serving", async () => {
  const match = {
    id: "off-yogurt",
    name: "Йогурт натуральный",
    brand: "Луга",
    barcode: "4600000000001",
    basis: "per100g",
    per100: { kcal: 80, protein: 4, fat: 3, carbs: 9 },
    source: { url: "https://world.openfoodfacts.org/product/4600000000001" },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json({ items: [match] })),
  );
  render(<App />);
  const read = () => JSON.parse(localStorage.getItem("polka:v1:browser")!);
  const before = read();
  fireEvent.click(screen.getByRole("button", { name: "Дневник", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Записать приём пищи", exact: true }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Другая еда", exact: true }),
  );
  fireEvent.change(screen.getByLabelText("Найти еду"), {
    target: { value: "Луга" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: /Йогурт натуральный/ }),
  );
  fireEvent.change(screen.getByLabelText("Количество, г"), {
    target: { value: "150" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(read().diary).toEqual(before.diary);
  fireEvent.click(screen.getByRole("checkbox", { name: /Продукт совпадает/ }));
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(read().pantry).toEqual(before.pantry);
  expect(read().diary[0]).toMatchObject({
    name: "Йогурт натуральный · Луга",
    nutrients: { kcal: 120 },
    source: "Другая еда",
  });
  expect(read().customFoods.at(-1).id).toBe(match.id);
});
