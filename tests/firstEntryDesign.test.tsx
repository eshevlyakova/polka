// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { emptyState } from "../shared/model";
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  localStorage.setItem("polka:v1:browser", JSON.stringify(emptyState()));
  localStorage.setItem("polka:v1:browser:demo-ready-v3", "1");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it.each([
  ["Назвать продукты голосом", "Разберём твой холодильник"],
  ["Добавить по чеку", "Продукты из чека"],
  ["Ввести вручную", "Добавить на полку"],
])(
  "offers %s directly without a mandatory questionnaire or demo choice",
  async (button, dialog) => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Что есть дома?",
    );
    expect(
      screen.queryByRole("navigation", { name: "Основная навигация" }),
    ).toBeNull();
    expect(screen.queryByLabelText("Имя")).toBeNull();
    expect(screen.queryByText(/демо|тестирования/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: button }));
    await screen.findByRole("dialog", { name: dialog });
    expect(
      JSON.parse(localStorage.getItem("polka:v1:browser")!).pantry,
    ).toEqual([]);
  },
);
