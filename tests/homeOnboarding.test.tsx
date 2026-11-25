// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { emptyState } from "../shared/model";
import { homeIdeas } from "../apps/web/src/domain/homeIdeas";
import { foods, recipes } from "../apps/web/src/data/catalog";
import { createDemoState } from "../apps/web/src/data/demo";

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
function startEmpty() {
  const state = emptyState();
  state.settings.onboarded = true;
  localStorage.setItem("polka:v1:browser", JSON.stringify(state));
  localStorage.setItem("polka:v1:browser:demo-ready-v3", "1");
  return state;
}
it("does not invent personal ideas for an empty shelf, zero quantities or unrelated ingredients", () => {
  expect(homeIdeas(recipes, [], foods)).toEqual([]);
  expect(
    homeIdeas(
      recipes,
      [{ id: "zero", foodId: "egg", grams: 0, expiresOn: "" }],
      foods,
    ),
  ).toEqual([]);
  expect(
    homeIdeas(
      recipes,
      [{ id: "unrelated", foodId: "unknown", grams: 100, expiresOn: "" }],
      foods,
    ),
  ).toEqual([]);
  const stocked = [{ id: "eggs", foodId: "egg", grams: 100, expiresOn: "" }];
  const ideas = homeIdeas(recipes, stocked, foods);
  expect(ideas.length).toBeGreaterThan(0);
  expect(ideas.length).toBeLessThanOrEqual(3);
  expect(
    ideas.every((r) => r.ingredients.some((i) => i.foodId === "egg")),
  ).toBe(true);
});
it("shows an honest first-fill invitation while keeping existing cooked food available", () => {
  const state = startEmpty();
  state.batches = createDemoState().batches;
  localStorage.setItem("polka:v1:browser", JSON.stringify(state));
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "Начнём с твоих продуктов" }),
  ).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Идеи для тебя" })).toBeNull();
  expect(screen.queryByLabelText("Пожелания к рецептам")).toBeNull();
  expect(
    screen.getByRole("heading", { name: /Уже есть готовое/ }),
  ).toBeTruthy();
});
it("finishes first manual stock addition on home with confirmation, without a recipe selection step", async () => {
  startEmpty();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Полка", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить продукт", exact: true }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Вручную/ }));
  fireEvent.click(screen.getByRole("button", { name: /ЯйцоТиповой продукт/ }));
  fireEvent.click(screen.getByRole("combobox", { name: "Единица количества" }));
  fireEvent.click(screen.getByRole("option", { name: "г", exact: true }));
  fireEvent.change(screen.getByLabelText("Количество, г"), {
    target: { value: "300" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить продукт" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(
    screen
      .getByRole("button", { name: "Главная", exact: true })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(
    screen.getByText(
      "Продукты уже на полке. Теперь подберём, что приготовить.",
    ),
  ).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Идеи для тебя" })).toBeTruthy();
  expect(
    screen.queryByRole("heading", { name: "Начнём с твоих продуктов" }),
  ).toBeNull();
  expect(localStorage.getItem("polka:v1:browser")).toContain('"grams":300');
});
it("keeps a long profile name intact and gives each word a separate non-breaking span", () => {
  const state = startEmpty();
  state.profile = { name: "Александра Константинопольская" };
  localStorage.setItem("polka:v1:browser", JSON.stringify(state));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Профиль", exact: true }));
  const name = screen.getByLabelText(state.profile.name);
  expect(name.getAttribute("data-long-name")).toBe("true");
  expect(name.getAttribute("title")).toBe(state.profile.name);
  expect(name.textContent).toBe(state.profile.name);
  expect(name.querySelectorAll(".profile-name-word")).toHaveLength(2);
});
