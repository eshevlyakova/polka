// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { useTimedError } from "../apps/web/src/hooks/useTimedError";
import * as libraryApi from "../apps/web/src/api/recipeLibrary";
import * as aiApi from "../apps/web/src/api/aiRecipes";
import { parseLibrarySearch } from "../shared/librarySearch";
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function Feedback() {
  const { error, setError } = useTimedError();
  return (
    <>
      <button onClick={() => setError("Временно недоступно")}>
        Ошибка сервиса
      </button>
      <button onClick={() => setError("Не сохранено", true)}>
        Ошибка сохранения
      </button>
      <span role="status">{error}</span>
    </>
  );
}
it("hides the previous AI selection when the next request fails", async () => {
  vi.spyOn(aiApi, "fetchAiRecipeSearch").mockResolvedValue(
    parseLibrarySearch({}),
  );
  vi.spyOn(libraryApi, "fetchLibraryPage").mockResolvedValue({
    items: [],
    total: 0,
    catalogTotal: 501,
    offset: 0,
    limit: 12,
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          recipes: [
            {
              name: "Предыдущая яичница",
              equipment: "Сковорода",
              minutes: 10,
              servings: 1,
              ingredients: [{ foodId: "egg", grams: 50 }],
              steps: ["Приготовь до готовности."],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { error: "Сервис ИИ перегружен. Попробуй позже." },
          { status: 429 },
        ),
      ),
  );
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Найти рецепты", exact: true }),
  );
  await screen.findByText("Предыдущая яичница");
  expect(screen.queryByText(/Рецепты готовы\./)).toBeNull();
  expect(screen.queryByText(/В каталоге нет точного совпадения/)).toBeNull();
  fireEvent.change(screen.getByLabelText("Пожелания к рецептам"), {
    target: { value: "Завтрак с яйцом" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Найти рецепты", exact: true }),
  );
  await screen.findByRole("alert");
  expect(screen.queryByText("Предыдущая яичница")).toBeNull();
});
it("dismisses transient errors after twelve seconds but preserves storage failures", () => {
  vi.useFakeTimers();
  render(<Feedback />);
  fireEvent.click(screen.getByRole("button", { name: "Ошибка сервиса" }));
  expect(screen.getByRole("status").textContent).toBe("Временно недоступно");
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole("status").textContent).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Ошибка сохранения" }));
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole("status").textContent).toBe("Не сохранено");
});
it("offers a full-width cancel action and aborts the recipe request without showing an error", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true },
            ),
          ),
      ),
  );
  render(<App />);
  fireEvent.change(screen.getByLabelText("Пожелания к рецептам"), {
    target: { value: "Хочу завтрак из творога" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Найти рецепты", exact: true }),
  );
  const cancel = screen.getByRole("button", { name: "Отменить подбор" });
  expect(cancel.className).toContain("cancel-action");
  await act(async () => fireEvent.click(cancel));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Найти рецепты",
        exact: true,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
  expect(
    (screen.getByLabelText("Пожелания к рецептам") as HTMLTextAreaElement)
      .value,
  ).toContain("творога");
});
it("lets the user dismiss an API error or clear it by editing wishes", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () =>
        Response.json(
          { error: "Сервис ИИ перегружен. Попробуй позже." },
          { status: 429 },
        ),
      ),
  );
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Найти рецепты", exact: true }),
  );
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Скрыть ошибку" }));
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Найти рецепты", exact: true }),
  );
  await screen.findByRole("alert");
  fireEvent.change(screen.getByLabelText("Пожелания к рецептам"), {
    target: { value: "Другой завтрак" },
  });
  expect(screen.queryByRole("alert")).toBeNull();
});
