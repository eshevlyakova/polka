// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { handleRequest } from "../apps/backend/src/router";
import recipes from "../apps/backend/data/recipe-library.json";
import { parseLibrarySearch } from "../shared/librarySearch";
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function api() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((path: string, init?: RequestInit) => {
      const input = init?.body ? JSON.parse(String(init.body)) : {};
      if (input.task === "search")
        return Promise.resolve(
          Response.json({
            search: parseLibrarySearch({
              products: input.products,
              maxMinutes: input.maxMinutes,
            }),
          }),
        );
      return handleRequest(
        new Request(new URL(path, "https://api.test"), init),
        {},
      );
    }),
  );
}
async function openSearchResults() {
  fireEvent.change(screen.getByLabelText("Время на готовку, мин"), {
    target: { value: "360" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Подобрать рецепты", exact: true }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: /Смотреть все \d+ рецептов/ }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Любое время", exact: true }),
  );
}
it("opens all 501 recipes, loads later pages and returns from a detail without losing the list", async () => {
  api();
  render(<App />);
  await openSearchResults();
  await screen.findByText("Показано 12 из 501");
  const before = localStorage.getItem("polka:v1:browser");
  expect(document.querySelectorAll(".library-grid .library-card")).toHaveLength(
    12,
  );
  fireEvent.click(screen.getByRole("button", { name: "Загрузить ещё 12" }));
  await screen.findByText("Показано 24 из 501");
  const first = document.querySelector(".library-card")!;
  const name = first.querySelector("strong")!.textContent!;
  fireEvent.click(first);
  await screen.findByRole("heading", { name, exact: true });
  expect(document.querySelectorAll(".recipe-method li").length).toBeGreaterThan(
    0,
  );
  expect(screen.getByText(/CC BY-SA 4.0/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "К подборке" }));
  await screen.findByText("Показано 24 из 501");
  expect(document.querySelectorAll(".library-grid .library-card")).toHaveLength(
    24,
  );
  expect(localStorage.getItem("polka:v1:browser")).toBe(before);
});
it("uses the whole database for the home request and exposes every match beyond its three-card preview", async () => {
  api();
  render(<App />);
  fireEvent.change(screen.getByLabelText("Время на готовку, мин"), {
    target: { value: "360" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Подобрать рецепты", exact: true }),
  );
  await waitFor(() =>
    expect(
      document.querySelectorAll(".library-preview .library-card"),
    ).toHaveLength(3),
  );
  const all = screen.getByRole("button", { name: /Смотреть все \d+ рецептов/ });
  const calls = vi.mocked(fetch).mock.calls;
  expect(JSON.parse(String(calls[0][1]?.body)).task).toBe("search");
  expect(String(calls[0][0])).toContain("/api/ai/recipes");
  expect(String(calls[1][0])).toContain("/api/library/search");
  const count = Number(all.textContent!.match(/\d+/)![0]);
  expect(count).toBeGreaterThan(100);
  fireEvent.click(all);
  await screen.findByText(`Показано 12 из ${count}`);
});
it("does not search the catalogue when AI interpretation is unavailable", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { error: "Сервис ИИ перегружен. Попробуй позже." },
        { status: 429 },
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<App />);
  fireEvent.change(screen.getByLabelText("Что хочется сегодня?"), {
    target: { value: "Завтрак с яйцом" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Подобрать рецепты", exact: true }),
  );
  await screen.findByRole("alert");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String(fetcher.mock.calls[0][0])).toContain("/api/ai/recipes");
  expect(document.querySelector(".library-preview")).toBeNull();
});
it("uses the static catalogue for an AI-interpreted request when the catalogue API is unavailable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
      const input = init?.body ? JSON.parse(String(init.body)) : {};
      if (input.task === "search")
        return Response.json({
          search: parseLibrarySearch({
            products: input.products,
            maxMinutes: input.maxMinutes,
          }),
        });
      return path.includes("catalog/recipe-library.json")
        ? Response.json(recipes)
        : new Response(null, { status: 404 });
    }),
  );
  render(<App />);
  await openSearchResults();
  await screen.findByText("Показано 12 из 501");
  expect(document.querySelectorAll(".library-card")).toHaveLength(12);
});

it("applies manual time on blur without submitting an unfinished search and rejects invalid time", async () => {
  api();
  render(<App />);
  await openSearchResults();
  await screen.findByText("Показано 12 из 501");
  fireEvent.change(screen.getByLabelText("Поиск рецептов"), {
    target: { value: "черновик" },
  });
  const minutes = screen.getByLabelText("Время в каталоге, мин");
  expect(minutes.getAttribute("type")).toBe("text");
  fireEvent.change(minutes, { target: { value: "45" } });
  fireEvent.blur(minutes);
  await waitFor(() => {
    const calls = vi.mocked(fetch).mock.calls;
    const latest = JSON.parse(String(calls.at(-1)?.[1]?.body));
    expect(latest.maxMinutes).toBe(45);
    expect(latest.query).toBe("");
  });
  const calls = vi.mocked(fetch).mock.calls.length;
  fireEvent.change(minutes, { target: { value: "9999" } });
  fireEvent.blur(minutes);
  await screen.findByRole("alert");
  expect(vi.mocked(fetch).mock.calls).toHaveLength(calls);
  fireEvent.click(
    screen.getByRole("button", { name: "Любое время", exact: true }),
  );
  await screen.findByText("Показано 12 из 501");
  expect((minutes as HTMLInputElement).value).toBe("");
});
