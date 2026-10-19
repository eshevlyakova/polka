// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import { emptyState } from "../apps/web/src/domain/model";
import { App } from "../apps/web/src/App";
beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("real input persists pantry and diary across remount", () => {
  localStorage.setItem("polka:v1:browser", JSON.stringify(emptyState()));
  localStorage.setItem("polka:v1:browser:demo-ready-v3", "1");
  const view = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Начать", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Полка", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить продукт", exact: true }),
  );
  fireEvent.change(screen.getByLabelText("Количество, г"), {
    target: { value: "400" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить продукт" }));
  expect(screen.getByText("400 г · срок не указан")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Сегодня", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Записать приём пищи", exact: true }),
  );
  fireEvent.change(screen.getByLabelText("Количество, г"), {
    target: { value: "100" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  fireEvent.click(screen.getByRole("button", { name: "Дневник", exact: true }));
  expect(screen.getByRole("heading", { name: "Яйцо" })).toBeTruthy();
  view.unmount();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Дневник", exact: true }));
  expect(screen.getByRole("heading", { name: "Яйцо" })).toBeTruthy();
  expect(screen.queryByText("Привет, это Полка")).toBeNull();
});

it("cooking and portion entry are separate user actions", () => {
  const saved = {
    version: 1,
    pantry: [
      { id: "1", foodId: "egg", grams: 400, expiresOn: "" },
      { id: "2", foodId: "tomato", grams: 400, expiresOn: "" },
      { id: "3", foodId: "oil", grams: 20, expiresOn: "" },
    ],
    batches: [],
    diary: [],
    customFoods: [],
    settings: {
      onboarded: true,
      calorieGoal: 1800,
      exclusions: "",
      maxMinutes: 30,
    },
  };
  localStorage.setItem("polka:v1:browser", JSON.stringify(saved));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Рецепты", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: /Омлет с томатами/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Приготовил — списать продукты" }),
  );
  let data = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(data.diary).toHaveLength(0);
  expect(data.pantry[0].grams).toBe(200);
  fireEvent.click(screen.getByRole("button", { name: "Записать порцию" }));
  fireEvent.change(screen.getByLabelText("Количество порций"), {
    target: { value: "0.5" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Добавить в дневник",
      exact: true,
    }),
  );
  data = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(data.diary).toHaveLength(1);
  expect(data.batches[0].remainingFraction).toBe(0.75);
  expect(data.pantry[0].grams).toBe(200);
});

it("first launch has a demo account and reload preserves edits", () => {
  const v = render(<App />);
  expect(
    screen.queryByRole("button", { name: "Начать", exact: true }),
  ).toBeNull();
  const stored = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(stored.pantry).toHaveLength(11);
  expect(stored.diary.length).toBeGreaterThan(15);
  fireEvent.click(screen.getByRole("button", { name: "Полка", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Удалить Творог 5%" }));
  v.unmount();
  render(<App />);
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).pantry,
  ).toHaveLength(10);
});

it("bottom navigation and back preserve screen and close form", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Полка", exact: true }));
  expect(screen.getByRole("heading", { name: "Моя полка" })).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить продукт", exact: true }),
  );
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.click(
    screen.getAllByRole("button", { name: "Назад", exact: true }).at(-1)!,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("heading", { name: "Моя полка" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Назад", exact: true }),
  ).toBeNull();
});

it("profile contains preferences and achievements without another page", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Дневник", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Профиль", exact: true }));
  expect(
    screen.getByRole("heading", { name: "Мой профиль", exact: true }),
  ).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Твоя коллекция" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Под себя" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "О тебе" })).toBeTruthy();
  expect(screen.queryByText("БЛИЖАЙШЕЕ ДОСТИЖЕНИЕ")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("button", { name: "Открыть меню" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Назад", exact: true }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Дневник", exact: true }));
  expect(
    screen.getByRole("heading", { name: "Дневник", exact: true }),
  ).toBeTruthy();
});
it("old empty accounts open with visible mock pantry and diary", () => {
  localStorage.setItem("polka:v1:browser", JSON.stringify(emptyState()));
  render(<App />);
  expect(
    screen.queryByRole("button", { name: "Начать", exact: true }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Полка", exact: true }));
  expect(screen.getByRole("button", { name: "Удалить Яйцо" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Дневник", exact: true }));
  expect(
    screen.getByRole("heading", { name: "Курица с рисом", exact: true }),
  ).toBeTruthy();
});

it("custom picker filters recipes and Escape leaves the food form open", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Рецепты", exact: true }));
  const picker = screen.getByRole("combobox");
  fireEvent.click(picker);
  fireEvent.click(screen.getByRole("option", { name: "До 10 минут" }));
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).settings.maxMinutes,
  ).toBe(10);
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Сегодня", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Записать приём пищи", exact: true }),
  );
  const meal = screen.getByRole("combobox", { name: "Приём пищи" });
  fireEvent.click(meal);
  fireEvent.keyDown(meal, { key: "End" });
  fireEvent.keyDown(meal, { key: "Enter" });
  fireEvent.click(meal);
  fireEvent.keyDown(meal, { key: "Escape" });
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.change(screen.getByLabelText("Количество, г"), {
    target: { value: "100" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).diary[0].meal,
  ).toBe("Перекус");
});

it("adds multiple dishes to the same meal on a previous week", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Дневник", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Предыдущая неделя" }));
  const group = screen
    .getByRole("heading", { name: "Завтрак" })
    .closest("section")!;
  const initial = group.querySelectorAll("article").length;
  for (let index = 0; index < 2; index++) {
    fireEvent.click(within(group).getByRole("button", { name: /Добавить/ }));
    fireEvent.change(screen.getByLabelText("Количество, г"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  }
  expect(group.querySelectorAll("article").length).toBe(initial + 2);
  fireEvent.click(screen.getByRole("button", { name: "Вернуться к сегодня" }));
  expect(
    screen.queryByRole("button", { name: "Вернуться к сегодня" }),
  ).toBeNull();
});

it("pantry recipe action filters by product and can return to pantry", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Полка", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Рецепты с продуктом: Яйцо" }),
  );
  expect(screen.getByRole("button", { name: /Омлет с томатами/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Курица с рисом/ })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Готовые остатки" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "К полке" }));
  expect(screen.getByRole("heading", { name: "Моя полка" })).toBeTruthy();
});

it("prepared dishes live on the pantry instead of recipes", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Рецепты", exact: true }));
  expect(screen.queryByRole("heading", { name: "Готовые остатки" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Записать порцию" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Полка", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: /Готовая еда/ }));
  expect(screen.getByRole("heading", { name: "Курица с рисом" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Записать порцию" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Продукты/ }));
  expect(screen.queryByRole("button", { name: "Записать порцию" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Добавить продукт", exact: true }),
  ).toBeTruthy();
});

it("the intake form switches between shelf and other food and preserves selected meal date", () => {
  const state = emptyState();
  state.settings.onboarded = true;
  state.pantry = [{ id: "egg-lot", foodId: "egg", grams: 300, expiresOn: "" }];
  localStorage.setItem("polka:v1:browser", JSON.stringify(state));
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Записать приём пищи", exact: true }),
  );
  expect(screen.getByRole("dialog", { name: "Что ты съел?" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Количество, г"), {
    target: { value: "100" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  let saved = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(saved.pantry[0].grams).toBe(200);
  expect(saved.diary[0].source).toBe("С полки");
  fireEvent.click(
    screen.getByRole("button", { name: "Записать приём пищи", exact: true }),
  );
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Другая еда",
      exact: true,
    }),
  );
  fireEvent.change(screen.getByLabelText("Количество, г"), {
    target: { value: "150" },
  });
  fireEvent.change(screen.getByLabelText("Когда съел"), {
    target: { value: "2026-10-10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Добавить в дневник" }));
  saved = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(saved.pantry[0].grams).toBe(200);
  expect(saved.diary[0].date).toBe("2026-10-10");
  expect(saved.diary[0].source).toBe("Другая еда");
});
