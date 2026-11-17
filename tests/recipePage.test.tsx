// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { emptyState } from "../shared/model";
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("opens a standalone recipe page with serving calculator, both nutrition totals and no photo", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Омлет с сыром/ }));
  expect(window.location.hash).toBe("#recipe=omelet-cheese");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("heading", { name: "На одну порцию" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: /На всё блюдо/ })).toBeTruthy();
  expect(document.querySelector(".recipe-page img")).toBeNull();
  expect(screen.queryByText("Фото и источник")).toBeNull();
  expect(screen.getByLabelText("Не хватает продуктов").textContent).toContain(
    "Сыр",
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Приготовил — списать продукты",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(
    screen.getByLabelText("Количество порций для приготовления"),
    { target: { value: "4" } },
  );
  expect(screen.getByLabelText("Не хватает продуктов").textContent).toContain(
    "Не хватает 80 г",
  );
});
it("switches household units without changing ingredient mass and saves only after the final step", () => {
  const state = emptyState();
  state.settings.onboarded = true;
  state.pantry = [
    { id: "e", foodId: "egg", grams: 400, expiresOn: "" },
    { id: "t", foodId: "tomato", grams: 400, expiresOn: "" },
    { id: "o", foodId: "oil", grams: 30, expiresOn: "" },
  ];
  localStorage.setItem("polka:v1:browser", JSON.stringify(state));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Омлет с томатами/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Изменить", exact: true }),
  );
  fireEvent.click(
    screen.getByRole("combobox", { name: "Единица: Масло растительное" }),
  );
  fireEvent.click(screen.getByRole("option", { name: "ст. л.", exact: true }));
  expect(localStorage.getItem("polka:v1:browser")).toBe(JSON.stringify(state));
  expect(
    screen.getAllByRole("button", { name: /Шаг .* выполнен/ }),
  ).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "Шаг 3 выполнен" }));
  expect(
    screen
      .getByRole("button", { name: "Шаг 3 выполнен" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).batches,
  ).toHaveLength(0);
  while (screen.queryByRole("button", { name: "Дальше" }))
    fireEvent.click(screen.getByRole("button", { name: "Дальше" }));
  fireEvent.click(document.querySelector(".cooked-weight summary")!);
  fireEvent.change(screen.getByLabelText("Готовый вес, г"), {
    target: { value: "360" },
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("Хранилище заполнено");
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Приготовил — списать продукты" }),
  );
  expect(screen.getByRole("alert").textContent).toContain("Хранилище");
  expect(document.querySelector(".recipe-page")).toBeTruthy();
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).batches,
  ).toHaveLength(0);
  fireEvent.click(
    screen.getByRole("button", { name: "Приготовил — списать продукты" }),
  );
  const saved = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(saved.batches[0].cookedWeightGrams).toBe(360);
  expect(
    saved.pantry.find((p: { foodId: string }) => p.foodId === "oil").grams,
  ).toBe(20);
  expect(saved.diary).toHaveLength(0);
});
it("converts prepared portions to grams and percent, rejecting more than the remainder", () => {
  const state = emptyState();
  state.settings.onboarded = true;
  state.pantry = [{ id: "keep", foodId: "egg", grams: 100, expiresOn: "" }];
  state.batches = [
    {
      id: "meal",
      recipeName: "Мой омлет",
      servings: 2,
      remainingFraction: 0.5,
      cookedAt: new Date().toISOString(),
      cookedWeightGrams: 360,
      nutrients: { kcal: 400, protein: 20, fat: 20, carbs: 10 },
    },
  ];
  localStorage.setItem("polka:v1:browser", JSON.stringify(state));
  render(<App />);
  fireEvent.click(document.querySelector(".ready-meal")!);
  fireEvent.click(screen.getByRole("button", { name: "Граммы", exact: true }));
  expect(
    (screen.getByLabelText("Масса порции, г") as HTMLInputElement).value,
  ).toBe("180");
  fireEvent.change(screen.getByLabelText("Масса порции, г"), {
    target: { value: "181" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  expect(screen.getByRole("alert").textContent).toMatch(/остат|остал/i);
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).diary,
  ).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Масса порции, г"), {
    target: { value: "90" },
  });
  fireEvent.click(screen.getByRole("button", { name: "% блюда", exact: true }));
  expect(
    (screen.getByLabelText("Доля блюда, %") as HTMLInputElement).value,
  ).toBe("25");
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  const saved = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(saved.pantry[0].grams).toBe(100);
  expect(saved.batches[0].remainingFraction).toBe(0.25);
  expect(saved.diary[0].nutrients.kcal).toBe(100);
  expect(saved.diary[0].amountLabel).toBe("90 г · 25% блюда");
});
