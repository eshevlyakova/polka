// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { transcribeAudio } from "../apps/web/src/api/voice";
import * as ai from "../apps/web/src/api/aiRecipes";
import * as library from "../apps/web/src/api/recipeLibrary";
import { parseLibrarySearch } from "../shared/librarySearch";
vi.mock("../apps/web/src/api/voice", () => ({ transcribeAudio: vi.fn() }));
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    },
  });
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    state = "inactive";
    mimeType = "audio/webm";
    ondataavailable?: (event: { data: Blob }) => void;
    onstop?: () => void;
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["x".repeat(200)]) });
      this.onstop?.();
    }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
});
afterEach(() => {
  cleanup();
  vi.mocked(transcribeAudio).mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "mediaDevices");
  localStorage.clear();
});
async function record() {
  fireEvent.click(screen.getByRole("button", { name: "Голос", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Продиктовать пожелания" }),
  );
  const stop = await screen.findByRole("button", { name: /Закончить запись/ });
  fireEvent.click(stop);
}
it("lets the user choose voice, edit its transcript and explicitly submit it to the same recipe search", async () => {
  vi.mocked(transcribeAudio).mockResolvedValue(
    "Хочу завтрак с яйцом без сахара",
  );
  const search = vi
    .spyOn(ai, "fetchAiRecipeSearch")
    .mockResolvedValue(parseLibrarySearch({}));
  vi.spyOn(library, "fetchLibraryPage").mockResolvedValue({
    items: [],
    total: 1,
    catalogTotal: 501,
    offset: 0,
    limit: 12,
  });
  render(<App />);
  await record();
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Пожелания к рецептам") as HTMLTextAreaElement)
        .value,
    ).toBe("Хочу завтрак с яйцом без сахара"),
  );
  expect(search).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Текст", exact: true }));
  fireEvent.change(screen.getByLabelText("Пожелания к рецептам"), {
    target: { value: "Хочу завтрак с яйцом без сахара и без мяса" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Найти рецепты", exact: true }),
  );
  await waitFor(() => expect(search).toHaveBeenCalledOnce());
  expect(search.mock.calls[0][0].preferences).toContain("без мяса");
});
it("preserves typed wishes and the audio for retry when transcription fails", async () => {
  vi.mocked(transcribeAudio)
    .mockRejectedValueOnce(new Error("Нет связи"))
    .mockResolvedValueOnce("с яйцом");
  render(<App />);
  fireEvent.change(screen.getByLabelText("Пожелания к рецептам"), {
    target: { value: "Быстрый завтрак" },
  });
  await record();
  await screen.findByRole("alert");
  expect(
    (screen.getByLabelText("Пожелания к рецептам") as HTMLTextAreaElement)
      .value,
  ).toBe("Быстрый завтрак");
  fireEvent.click(
    screen.getByRole("button", { name: "Повторить отправку записи" }),
  );
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Пожелания к рецептам") as HTMLTextAreaElement)
        .value,
    ).toBe("Быстрый завтрак с яйцом"),
  );
  expect(vi.mocked(transcribeAudio).mock.calls[0][0]).toBe(
    vi.mocked(transcribeAudio).mock.calls[1][0],
  );
});
it("cancels recognition without replacing wishes when a late response arrives", async () => {
  let resolve!: (text: string) => void;
  vi.mocked(transcribeAudio).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(<App />);
  fireEvent.change(screen.getByLabelText("Пожелания к рецептам"), {
    target: { value: "Без мяса" },
  });
  await record();
  await screen.findByText("Переводим речь в текст…");
  expect(
    (
      screen.getByRole("button", {
        name: "Найти рецепты",
        exact: true,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Отменить распознавание" }),
  );
  await act(async () => resolve("С мясом"));
  expect(
    (screen.getByLabelText("Пожелания к рецептам") as HTMLTextAreaElement)
      .value,
  ).toBe("Без мяса");
  expect(
    (
      screen.getByRole("button", {
        name: "Найти рецепты",
        exact: true,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});
