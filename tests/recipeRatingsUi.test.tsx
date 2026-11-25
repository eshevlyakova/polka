// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { createDemoState } from "../apps/web/src/data/demo";
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  localStorage.setItem("polka:v1:browser", JSON.stringify(createDemoState()));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("persists a card vote, dismisses it, lets the user undo and manage ratings after reload", async () => {
  const view = render(<App />);
  // Wait for the full catalogue; no search or provider call is needed.
  await waitFor(() =>
    expect(
      document.querySelector(".personal-ideas .library-card"),
    ).toBeTruthy(),
  );
  const group = screen.getAllByRole("group", { name: /^Оценить рецепт/ })[0];
  const label = group.getAttribute("aria-label")!;
  fireEvent.click(
    within(group).getByRole("button", { name: "Нравится", exact: true }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("group", { name: label })).toBeNull(),
  );
  let saved = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(saved.recipeFeedback).toHaveLength(1);
  expect(saved.recipeFeedback[0].rating).toBe("like");
  expect(saved.pantry).toHaveLength(11);
  fireEvent.click(
    screen.getByRole("button", { name: "Отменить", exact: true }),
  );
  await waitFor(() =>
    expect(screen.getByRole("group", { name: label })).toBeTruthy(),
  );
  fireEvent.click(
    within(screen.getByRole("group", { name: label })).getByRole("button", {
      name: "Не моё",
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("group", { name: label })).toBeNull(),
  );
  view.unmount();
  render(<App />);
  await waitFor(() =>
    expect(
      document.querySelector(".personal-ideas .library-card"),
    ).toBeTruthy(),
  );
  expect(screen.queryByRole("group", { name: label })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Профиль", exact: true }));
  fireEvent.click(screen.getByText(/Твои оценки рецептов/));
  expect(screen.getByRole("button", { name: /^Убрать оценку:/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /^Убрать оценку:/ }));
  saved = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(saved.recipeFeedback).toEqual([]);
});
it("keeps the card and reports an error if the vote cannot be saved", async () => {
  render(<App />);
  await waitFor(() =>
    expect(
      document.querySelector(".personal-ideas .library-card"),
    ).toBeTruthy(),
  );
  const group = screen.getAllByRole("group", { name: /^Оценить рецепт/ })[0];
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Недостаточно места для сохранения");
  });
  fireEvent.click(within(group).getByRole("button", { name: "Не моё" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(
    screen.getByRole("group", { name: group.getAttribute("aria-label")! }),
  ).toBeTruthy();
});
